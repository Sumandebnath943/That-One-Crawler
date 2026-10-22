import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import type { AgentCheck, AgentCheckId, AgentReport, AgentResult } from "@/lib/seo/agents";
import { isAllowedByRobots, parseRobots } from "@/lib/seo/robots";
import { bareHost, displayPath, isCrawlableUrl, isSameSite, urlKey } from "@/lib/seo/url";
import { SITE_URL } from "@/lib/site";
import { extractEntries } from "./discover";
import { extractContent, type ExtractedContent } from "./extract";
import { checkLink } from "./links";
import { BlockedUrlError, decodeBody, safeFetch, type FetchResult, type FetchOptions } from "./safe-fetch";

// The agent-readiness audit: about 25 small requests in two waves, finishing well inside a
// serverless time limit. Every result carries the evidence it was based on.

export class AgentAuditError extends Error {}

/** Agents that fetch pages for a person or for AI search. Training crawlers are reported but never scored. */
const AGENTS = [
  { name: "ChatGPT-User", token: "chatgpt-user", ua: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot" },
  { name: "OAI-SearchBot", token: "oai-searchbot", ua: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot" },
  { name: "Claude-User", token: "claude-user", ua: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-User/1.0; +Claude-User@anthropic.com)" },
  { name: "Claude-SearchBot", token: "claude-searchbot", ua: "" },
  { name: "PerplexityBot", token: "perplexitybot", ua: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)" },
  { name: "Perplexity-User", token: "perplexity-user", ua: "" },
];
const TRAINING = ["GPTBot", "ClaudeBot", "CCBot", "Google-Extended", "Applebot-Extended", "meta-externalagent", "Bytespider"];
/** Saying who we are even while borrowing an agent's name, so site owners can tell it was this check. */
const PROBE_SUFFIX = ` (agent-readiness check by ThatOneCrawler; +${SITE_URL}/bot)`;

const MARKDOWN_ACCEPT = "text/markdown, text/plain;q=0.9, */*;q=0.1";
const LLMS_MAX_CHARS = 30_000;
const TOKEN_BUDGET = 25_000;
const TOKEN_LIMIT = 60_000;

const CHALLENGE = /just a moment|cf-chl|challenge-platform|attention required|captcha|px-captcha|datadome|access denied|are you a robot|verify you are human/i;

const credit = (result: AgentResult) => (result === "pass" ? 1 : result === "partial" ? 0.5 : 0);
const make = (id: AgentCheckId, result: AgentResult, evidence: string, partialCredit?: number): AgentCheck => ({
  id,
  result,
  credit: result === "partial" && partialCredit !== undefined ? Math.max(0.1, Math.min(0.9, partialCredit)) : credit(result),
  evidence,
});

const thousands = (n: number) => (n >= 10_000 ? `${Math.round(n / 1000)}K` : n.toLocaleString("en-US"));

async function fetchOrNull(url: string, opts: FetchOptions): Promise<FetchResult | null> {
  try {
    return await safeFetch(url, opts);
  } catch (err) {
    if (err instanceof BlockedUrlError) return null;
    throw err;
  }
}

const contentType = (res: FetchResult | null) => res?.headers?.get("content-type")?.toLowerCase() ?? "";
const bodyText = (res: FetchResult | null) => (res && res.body.byteLength ? decodeBody(res.body, contentType(res)) : "");
const isOk = (res: FetchResult | null) => Boolean(res && !res.error && res.status >= 200 && res.status < 300);

/** Markdown, not HTML: a markdown content type, or plain text that starts with a heading. */
export function isMarkdown(res: FetchResult | null): boolean {
  if (!isOk(res)) return false;
  const type = contentType(res);
  if (/markdown/.test(type)) return true;
  if (/html/.test(type)) return false;
  return /^\s*(?:﻿)?#\s/.test(bodyText(res).slice(0, 200));
}

export function looksWalled(res: FetchResult | null): string | null {
  if (!res) return "refused";
  if (res.error) return res.error.toLowerCase();
  const mitigated = res.headers?.get("cf-mitigated");
  if (mitigated) return `${res.status}, Cloudflare ${mitigated}`;
  const text = bodyText(res).slice(0, 4000);
  if (res.status >= 400) return CHALLENGE.test(text) ? `${res.status}, a bot challenge page` : String(res.status);
  // A 200 that's really a challenge: tiny page, challenge wording.
  if (text.length < 6000 && CHALLENGE.test(text) && !/<h1/i.test(text)) return `${res.status}, but the page is a bot challenge`;
  return null;
}

interface Sample {
  url: string;
  res: FetchResult;
  data: ExtractedContent | null;
  html: string;
}

/** Load a page under an agent's name, giving a slow answer one more, longer try. */
async function probeAs(url: string, userAgent: string, signal: AbortSignal): Promise<FetchResult | null> {
  const first = await fetchOrNull(url, { signal, timeoutMs: 8_000, maxBytes: 300_000, userAgent });
  if (!first?.error || first.status || signal.aborted) return first;
  return fetchOrNull(url, { signal, timeoutMs: 14_000, maxBytes: 300_000, userAgent });
}

async function readPage(url: string, baseDomain: string, signal: AbortSignal): Promise<Sample | null> {
  const res = await fetchOrNull(url, { baseDomain, signal, timeoutMs: 10_000, maxBytes: 3_000_000 });
  if (!res) return null;
  const html = /html/.test(contentType(res)) || !contentType(res) ? bodyText(res) : "";
  const data = isOk(res) && html ? extractContent(html, res.finalUrl, baseDomain) : null;
  return { url, res, data, html };
}

/** Up to `n` content pages spread across the sitemap (or the homepage's links when there's no sitemap). */
export function pickSamples(candidates: string[], homeUrl: string, baseDomain: string, n = 3): string[] {
  const home = urlKey(homeUrl);
  const usable = [...new Set(candidates)].filter((u) => isSameSite(u, baseDomain) && isCrawlableUrl(u) && urlKey(u) !== home);
  if (usable.length <= n) return usable;
  const step = (usable.length - 1) / (n - 1);
  return Array.from({ length: n }, (_, i) => usable[Math.round(i * step)]);
}

async function readSitemap(urls: string[], signal: AbortSignal) {
  for (const sitemapUrl of urls) {
    const res = await fetchOrNull(sitemapUrl, { signal, timeoutMs: 10_000, maxBytes: 5_000_000, accept: "application/xml,text/xml;q=0.9,*/*;q=0.8" });
    const xml = isOk(res) ? bodyText(res) : "";
    if (/<sitemapindex[\s>]/i.test(xml)) {
      const children = extractEntries(xml, "sitemap");
      const first = children[0] && (await fetchOrNull(children[0].loc, { signal, timeoutMs: 10_000, maxBytes: 5_000_000 }));
      const childXml = isOk(first) ? bodyText(first) : "";
      return { url: res!.finalUrl, index: children.length, entries: /<urlset[\s>]/i.test(childXml) ? extractEntries(childXml, "url") : [] };
    }
    if (/<urlset[\s>]/i.test(xml)) return { url: res!.finalUrl, index: 0, entries: extractEntries(xml, "url") };
  }
  return null;
}

interface Identity {
  name: boolean;
  url: boolean;
  sameAs: number;
  image: boolean;
  description: boolean;
  type: string;
}

export function readIdentity($: cheerio.CheerioAPI): Identity | null {
  const nodes: Record<string, unknown>[] = [];
  const walk = (value: unknown) => {
    if (Array.isArray(value)) return value.forEach(walk);
    if (!value || typeof value !== "object") return;
    const node = value as Record<string, unknown>;
    nodes.push(node);
    if (Array.isArray(node["@graph"])) walk(node["@graph"]);
  };
  $("script[type='application/ld+json']").each((_, el) => {
    try {
      walk(JSON.parse($(el).text()));
    } catch {
      // Broken blocks are reported by the SEO checks.
    }
  });
  const typed = (pattern: RegExp) =>
    nodes.find((n) => [n["@type"]].flat().some((t) => typeof t === "string" && pattern.test(t)));
  const entity = typed(/^(?:Organization|Corporation|LocalBusiness|NGO|EducationalOrganization|NewsMediaOrganization|OnlineBusiness|Person)$/) ?? typed(/^WebSite$/);
  if (!entity) return null;
  const sameAs = [entity.sameAs].flat().filter((s) => typeof s === "string").length;
  return {
    type: String([entity["@type"]].flat()[0]),
    name: Boolean(entity.name),
    url: Boolean(entity.url),
    sameAs,
    image: Boolean(entity.logo || entity.image),
    description: Boolean(entity.description),
  };
}

/** Share of links, buttons and fields with an accessible name, the way agents that click find them. */
export function controlNames($: cheerio.CheerioAPI): { total: number; named: number; divButtons: number } {
  const labels = new Set($("label[for]").toArray().map((el) => $(el).attr("for")));
  let total = 0;
  let named = 0;
  $("a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=link]").each((_, el) => {
    const node = $(el);
    total += 1;
    const name =
      node.attr("aria-label") ||
      node.attr("aria-labelledby") ||
      node.attr("title") ||
      node.text().trim() ||
      node.find("img[alt]").attr("alt") ||
      node.find("svg title").text() ||
      (el.name === "input" && /^(?:submit|button|reset)$/i.test(node.attr("type") ?? "") && node.attr("value")) ||
      (node.attr("id") && labels.has(node.attr("id"))) ||
      node.closest("label").length;
    if (name) named += 1;
  });
  const divButtons = $("div[onclick], span[onclick]").length;
  return { total, named, divButtons };
}

/** Biggest jump between consecutive heading levels, over every heading on the page (like axe does). */
export function headingSkip($: cheerio.CheerioAPI): number {
  const levels = $("h1, h2, h3, h4, h5, h6")
    .toArray()
    .map((el) => Number((el as Element).name.slice(1)));
  let worst = 0;
  for (let i = 1; i < levels.length; i++) worst = Math.max(worst, levels[i] - levels[i - 1] - 1);
  return worst;
}

const TRUST = [
  { name: "About", pattern: /\/(?:about|about-us|who-we-are|our-story|team|company)(?:\/|$|\.)/i, text: /^(?:about|about us|who we are|our story|the team)$/i },
  { name: "Contact", pattern: /\/(?:contact|contact-us|get-in-touch|support)(?:\/|$|\.)/i, text: /^(?:contact|contact us|get in touch|support)$/i },
  { name: "Privacy", pattern: /\/(?:privacy|privacy-policy|legal\/privacy)(?:\/|$|\.)/i, text: /^privacy(?: policy| notice)?$/i },
];

export async function auditAgents(inputUrl: string, signal: AbortSignal): Promise<AgentReport> {
  const homeRes = await safeFetch(inputUrl, { signal, timeoutMs: 12_000, maxBytes: 3_000_000 });
  const inputHost = new URL(inputUrl).hostname;
  if (homeRes.error) throw new AgentAuditError(`We couldn't reach ${inputHost} (${homeRes.error.toLowerCase()}).`);
  const homeUrl = homeRes.finalUrl;
  const origin = new URL(homeUrl).origin;
  const baseDomain = bareHost(new URL(homeUrl).hostname);
  const homeHtml = /html/.test(contentType(homeRes)) || !contentType(homeRes) ? bodyText(homeRes) : "";
  const home = isOk(homeRes) && homeHtml ? extractContent(homeHtml, homeUrl, baseDomain) : null;
  const $ = cheerio.load(homeHtml);
  const missingPath = `${origin}/this-page-should-not-exist-${Math.random().toString(36).slice(2, 10)}`;

  // ---- Wave 1: everything that only needs the origin ----
  const small = { signal, timeoutMs: 8_000 };
  const [robotsRes, llms, llmsFull, mdNegotiated, indexMd, missing, apiCatalog, agentCard, aiCatalog, ...probes] = await Promise.all([
    fetchOrNull(`${origin}/robots.txt`, { ...small, maxBytes: 500_000, accept: "text/plain,*/*;q=0.8" }),
    fetchOrNull(`${origin}/llms.txt`, { ...small, maxBytes: 1_000_000, accept: "text/markdown,text/plain;q=0.9,*/*;q=0.8" }),
    fetchOrNull(`${origin}/llms-full.txt`, { ...small, maxBytes: 4_096, accept: "text/markdown,text/plain;q=0.9,*/*;q=0.8" }),
    fetchOrNull(homeUrl, { ...small, maxBytes: 2_000_000, accept: MARKDOWN_ACCEPT }),
    fetchOrNull(`${origin}/index.md`, { ...small, maxBytes: 200_000, accept: MARKDOWN_ACCEPT }),
    // Some sites build their 404 page slowly; give it longer than the rest.
    fetchOrNull(missingPath, { ...small, timeoutMs: 14_000, baseDomain, maxBytes: 200_000 }),
    fetchOrNull(`${origin}/.well-known/api-catalog`, { ...small, maxBytes: 200_000, accept: "application/linkset+json,application/json;q=0.9,*/*;q=0.5" }),
    fetchOrNull(`${origin}/.well-known/agent-card.json`, { ...small, maxBytes: 200_000, accept: "application/json" }),
    fetchOrNull(`${origin}/.well-known/ai-catalog.json`, { ...small, maxBytes: 200_000, accept: "application/json" }),
    ...AGENTS.filter((a) => a.ua).map((a) => probeAs(homeUrl, `${a.ua}${PROBE_SUFFIX}`, signal)),
  ]);

  const robotsText = robotsRes && robotsRes.status === 200 && !/html/.test(contentType(robotsRes)) ? bodyText(robotsRes) : "";
  const robotsSitemaps = robotsText ? parseRobots(robotsText).sitemaps.filter((u) => /^https?:\/\//i.test(u)) : [];
  const llmsText = isOk(llms) && !/html/.test(contentType(llms)) ? bodyText(llms) : "";

  // ---- Wave 2: things that depend on what wave 1 found ----
  const sitemapPromise = readSitemap([...robotsSitemaps.slice(0, 2), `${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`], signal);
  const llmsLinks = [...llmsText.matchAll(/\]\(\s*([^)\s]+)\s*\)/g)]
    .map((m) => {
      try {
        return new URL(m[1], origin).toString();
      } catch {
        return "";
      }
    })
    .filter((u) => u && isSameSite(u, baseDomain))
    .slice(0, 5);
  const [sitemap, llmsChecks] = await Promise.all([sitemapPromise, Promise.all(llmsLinks.map((u) => checkLink(u, signal)))]);
  const sampleUrls = pickSamples(sitemap?.entries.map((e) => e.loc) ?? home?.links ?? [], homeUrl, baseDomain);
  const [samples, twin] = await Promise.all([
    Promise.all(sampleUrls.map((u) => readPage(u, baseDomain, signal))),
    sampleUrls[0] ? fetchOrNull(`${sampleUrls[0].replace(/\/$/, "")}.md`, { ...small, maxBytes: 200_000, accept: MARKDOWN_ACCEPT }) : null,
  ]);
  const read = samples.filter((s): s is Sample => s !== null);
  const pages: { url: string; data: ExtractedContent | null; res: FetchResult; html: string }[] = [
    { url: homeUrl, data: home, res: homeRes, html: homeHtml },
    ...read,
  ];

  const checks: AgentCheck[] = [];

  // robots.txt
  if (!robotsRes || robotsRes.status === 404 || robotsRes.status === 410 || (robotsRes.status === 200 && !robotsText)) {
    checks.push(make("robots-ai", "pass", "No robots.txt, so nothing tells AI agents to stay out."));
  } else if (robotsRes.status >= 500 || robotsRes.error) {
    checks.push(make("robots-ai", "partial", `robots.txt answered ${robotsRes.status || robotsRes.error}. Crawlers treat an unreachable robots.txt as "stay out" until it's back.`));
  } else {
    const blocked = AGENTS.filter((a) => !isAllowedByRobots(parseRobots(robotsText, a.token).rules, "/")).map((a) => a.name);
    const training = TRAINING.filter((name) => !isAllowedByRobots(parseRobots(robotsText, name.toLowerCase()).rules, "/"));
    const note = training.length ? ` Training crawlers blocked: ${training.join(", ")} (your choice; not scored).` : "";
    if (!blocked.length) {
      checks.push(make("robots-ai", "pass", `All ${AGENTS.length} AI agents and AI search crawlers may read the homepage (${AGENTS.map((a) => a.name).join(", ")}).${note}`));
    } else {
      const allowed = AGENTS.length - blocked.length;
      checks.push(
        make(
          "robots-ai",
          allowed ? "partial" : "fail",
          `robots.txt blocks ${blocked.join(", ")} from the homepage${allowed ? `; ${allowed} others are allowed` : ""}.${note}`,
          allowed / AGENTS.length,
        ),
      );
    }
  }

  // Firewalls and bot challenges. A probe that never answered says nothing about a firewall
  // (the site may just be busy), so it's left out rather than counted as turned away.
  const probed = AGENTS.filter((a) => a.ua).map((a, i) => ({ name: a.name, res: probes[i] }));
  const silent = probed.filter((p) => p.res?.error && !p.res.status).map((p) => p.name);
  const answered = probed.filter((p) => !silent.includes(p.name));
  const walled = answered.map((p) => ({ name: p.name, why: looksWalled(p.res) })).filter((p) => p.why);
  const homeWalled = looksWalled(homeRes);
  const silentNote = silent.length ? ` ${silent.join(" and ")} didn't get an answer in time, so ${silent.length === 1 ? "it isn't" : "they aren't"} counted.` : "";
  if (homeWalled) {
    checks.push(make("bot-access", "fail", `The homepage answered ${homeWalled} even to a regular crawler, so agents are turned away too.`));
  } else if (!answered.length) {
    checks.push(make("bot-access", "na", `None of the agent user agents we tried got an answer in time, so this wasn't checked. Try again in a minute.`));
  } else if (!walled.length) {
    checks.push(make("bot-access", "pass", `The homepage loaded for ${answered.map((p) => p.name).join(", ")}.${silentNote}`));
  } else {
    checks.push(
      make(
        "bot-access",
        walled.length === answered.length ? "fail" : "partial",
        `Turned away: ${walled.map((w) => `${w.name} (${w.why})`).join(", ")}.${silentNote} Some firewalls block anyone using these names but let the verified bot through, so check your bot settings to be sure.`,
        (answered.length - walled.length) / answered.length,
      ),
    );
  }

  // Content without JavaScript
  if (!home) {
    checks.push(make("no-js", "fail", `The homepage didn't return readable HTML (${homeRes.status}, ${contentType(homeRes) || "no content type"}).`));
  } else {
    const ratio = homeRes.sizeBytes ? Math.round((home.contentChars / homeRes.sizeBytes) * 1000) / 10 : 0;
    const h2 = home.headings.filter((h) => h.level === 2).length;
    const evidence = `${thousands(home.contentChars)} characters (${home.wordCount.toLocaleString("en-US")} words) of text in the server HTML, ${home.h1Count} H1 and ${h2} H2s; text is ${ratio}% of the HTML.`;
    const emptySamples = read.filter((s) => s.data && (s.data.likelyNeedsJs || s.data.wordCount < 50)).length;
    const result: AgentResult = home.likelyNeedsJs || home.wordCount < 50 ? "fail" : home.wordCount < 150 || home.h1Count === 0 || emptySamples ? "partial" : "pass";
    checks.push(make("no-js", result, emptySamples ? `${evidence} ${emptySamples} sampled page(s) are nearly empty without JavaScript.` : evidence));
  }

  // Public, no sign-in
  const walls = pages
    .map((p) => {
      const finalPath = new URL(p.res.finalUrl).pathname;
      if (p.res.status === 401) return `${displayPath(p.url)} asks for a login (401)`;
      if (/\/(?:login|log-in|signin|sign-in|auth|account)(?:\/|$)/i.test(finalPath) && !/\/(?:login|signin|auth|account)/i.test(new URL(p.url).pathname)) {
        return `${displayPath(p.url)} redirects to a sign-in page`;
      }
      if (p.res.status === 403) return `${displayPath(p.url)} answered 403 Forbidden`;
      return null;
    })
    .filter((w): w is string => w !== null);
  const readable = pages.filter((p) => p.data && p.data.wordCount >= 50).length;
  checks.push(
    walls.length
      ? make(
          "public",
          walls.length === pages.length ? "fail" : "partial",
          `${walls.length} of ${pages.length} sampled pages aren't open to visitors: ${walls.join("; ")}.`,
          1 - walls.length / pages.length,
        )
      : make("public", "pass", `All ${pages.length} sampled pages are publicly readable (${readable} with substantial text).`),
  );

  // Redirects
  const redirectProblems: string[] = [];
  const inputBare = bareHost(inputHost);
  if (inputBare !== baseDomain) redirectProblems.push(`${inputHost} redirects to another domain (${new URL(homeUrl).hostname})`);
  if (homeRes.redirects.length > 2) redirectProblems.push(`the homepage takes ${homeRes.redirects.length} redirect hops`);
  for (const page of pages) {
    const path = displayPath(page.res.finalUrl);
    if (page.data?.metaRefresh) redirectProblems.push(`${path} uses a meta refresh`);
    else if (page.html.length < 20_000 && page.data && page.data.wordCount < 50 && /(?:window\.)?location\s*(?:\.href\s*=|\.replace\(|\.assign\(|=)/.test(page.html)) {
      redirectProblems.push(`${path} looks like a JavaScript redirect stub`);
    }
    if (page.res.offsiteRedirect) redirectProblems.push(`${path} redirects off-site to ${page.res.offsiteRedirect}`);
  }
  checks.push(
    redirectProblems.length
      ? make("redirects", redirectProblems.length > 1 ? "fail" : "partial", `${redirectProblems.join("; ")}.`)
      : make("redirects", "pass", `No meta refreshes, JavaScript redirects or cross-domain hops across ${pages.length} checked pages.`),
  );

  // Real 404s
  if (!missing || (missing.error && !missing.status)) {
    checks.push(make("real-404", "na", `We couldn't request a made-up URL${missing?.error ? ` (${missing.error.toLowerCase()})` : ""}, so this wasn't checked.`));
  } else if (missing.status === 404 || missing.status === 410) {
    const markdownGuide = /markdown/.test(contentType(missing));
    checks.push(make("real-404", "pass", `A made-up URL answered ${missing.status}${markdownGuide ? " with Markdown guidance" : ""}, so agents can tell missing pages from real ones.`));
  } else if (missing.offsiteRedirect) {
    checks.push(make("real-404", "fail", `A made-up URL redirected to another site (${missing.offsiteRedirect}) instead of answering 404.`));
  } else if (missing.status >= 200 && missing.status < 300) {
    const where = urlKey(missing.finalUrl) === urlKey(missingPath) ? "" : ` after redirecting to ${displayPath(missing.finalUrl)}`;
    checks.push(make("real-404", "fail", `A made-up URL answered ${missing.status} OK${where}: a soft 404, so agents can't tell missing pages from real content.`));
  } else {
    checks.push(make("real-404", "partial", `A made-up URL answered ${missing.status || missing.error} rather than 404.`));
  }

  // Indexable homepage
  const bingbot = $("meta[name='bingbot' i]").attr("content") ?? "";
  const noindex = /\b(?:noindex|none)\b/i;
  const xRobots = homeRes.headers?.get("x-robots-tag") ?? "";
  if (home && (noindex.test(home.robotsMeta) || noindex.test(xRobots) || noindex.test(bingbot))) {
    checks.push(make("indexable", "fail", `The homepage says noindex (${[home.robotsMeta, xRobots && `X-Robots-Tag: ${xRobots}`, bingbot && `bingbot: ${bingbot}`].filter(Boolean).join("; ")}).`));
  } else {
    checks.push(make("indexable", home ? "pass" : "na", "No noindex in the homepage's robots, googlebot or bingbot meta tags, or in an X-Robots-Tag header."));
  }

  // Sitemap and its dates
  if (sitemap && sitemap.entries.length) {
    const where = sitemap.index ? `a sitemap index at ${displayPath(sitemap.url)} (${sitemap.index} sitemaps; the first lists ${sitemap.entries.length} URLs)` : `${displayPath(sitemap.url)} with ${sitemap.entries.length} URLs`;
    checks.push(make("sitemap", "pass", `Valid sitemap: ${where}.`));
    const dated = sitemap.entries.filter((e) => Date.parse(e.lastmod));
    const share = dated.length / sitemap.entries.length;
    const newest = dated.length ? Math.max(...dated.map((e) => Date.parse(e.lastmod))) : 0;
    const age = newest ? Math.max(0, Math.round((Date.now() - newest) / 86_400_000)) : null;
    checks.push(
      make(
        "sitemap-fresh",
        share >= 0.8 ? "pass" : share > 0 ? "partial" : "fail",
        `${Math.round(share * 100)}% of ${sitemap.entries.length} entries have a lastmod date${age !== null ? `; the newest is ${age} day${age === 1 ? "" : "s"} old` : ""}.`,
        share,
      ),
    );
  } else {
    checks.push(make("sitemap", "fail", robotsSitemaps.length ? `robots.txt lists ${robotsSitemaps[0]}, but it didn't return a valid sitemap.` : "No sitemap at /sitemap.xml and none listed in robots.txt."));
    checks.push(make("sitemap-fresh", "na", "No sitemap to read dates from."));
  }

  // llms.txt and friends
  if (!llmsText) {
    checks.push(make("llms-txt", "fail", llms && llms.status === 200 ? "/llms.txt answered with an HTML page, not a text file." : `No /llms.txt (${llms?.status || llms?.error || "no answer"}).`));
    checks.push(make("llms-links", "na", "No llms.txt to check."));
  } else {
    const heading = /^\s*(?:﻿)?#\s+\S/.test(llmsText);
    const links = (llmsText.match(/\]\(\s*[^)\s]+\s*\)/g) ?? []).length;
    const size = llmsText.length;
    const problems = [!heading && "it doesn't start with a # heading", !links && "it has no Markdown links", size > LLMS_MAX_CHARS && `at ${thousands(size)} characters it's longer than the ~30K a navigation index should be`].filter(Boolean);
    checks.push(
      make(
        "llms-txt",
        problems.length ? "partial" : "pass",
        problems.length ? `Found /llms.txt, but ${problems.join(" and ")}.` : `Found /llms.txt: a # heading, ${links} links and ${thousands(size)} characters.`,
      ),
    );
    const dead = llmsChecks.filter((c) => c.state === "broken" || c.state === "error");
    checks.push(
      llmsChecks.length
        ? make(
            "llms-links",
            dead.length ? (dead.length === llmsChecks.length ? "fail" : "partial") : "pass",
            dead.length ? `${dead.length} of ${llmsChecks.length} links we tried in llms.txt are dead: ${dead.map((d) => `${displayPath(d.url)} (${d.status || d.error})`).join(", ")}.` : `All ${llmsChecks.length} links we tried in llms.txt work.`,
            1 - dead.length / llmsChecks.length,
          )
        : make("llms-links", "na", "llms.txt has no links to this site to check."),
    );
  }
  checks.push(
    isOk(llmsFull) && !/html/.test(contentType(llmsFull))
      ? make("llms-full", "pass", "Found /llms-full.txt.")
      : make("llms-full", "fail", `No /llms-full.txt (${llmsFull?.status || llmsFull?.error || "no answer"}).`),
  );

  // Markdown
  const vary = (mdNegotiated?.headers?.get("vary") ?? "").toLowerCase();
  const advertised = home?.markdownAlternate;
  if (isMarkdown(mdNegotiated)) {
    checks.push(
      /\baccept\b|\*/.test(vary)
        ? make("markdown", "pass", `The homepage answers Accept: text/markdown with Markdown (${contentType(mdNegotiated) || "text"}) and sends Vary: Accept.`)
        : make("markdown", "partial", "The homepage answers Accept: text/markdown with Markdown, but without Vary: Accept, so a shared cache could hand Markdown to browsers (or HTML to agents)."),
    );
  } else if (advertised || isMarkdown(indexMd)) {
    checks.push(make("markdown", "partial", `Markdown exists (${advertised ? `advertised at ${displayPath(advertised)}` : "/index.md"}), but asking for the homepage with Accept: text/markdown still returns HTML.`));
  } else {
    checks.push(make("markdown", "fail", `Asking for the homepage with Accept: text/markdown returns ${contentType(mdNegotiated).split(";")[0] || "nothing"}, and the page doesn't link a Markdown version.`));
  }
  const twins = [isMarkdown(indexMd) && "/index.md", isMarkdown(twin) && sampleUrls[0] && `${displayPath(sampleUrls[0]).replace(/\/$/, "")}.md`].filter(Boolean);
  checks.push(
    twins.length === 2
      ? make("md-twins", "pass", `Markdown twins work: ${twins.join(" and ")}.`)
      : twins.length
        ? make("md-twins", "partial", `${twins[0]} returns Markdown, but ${twins[0] === "/index.md" && sampleUrls[0] ? `${displayPath(sampleUrls[0]).replace(/\/$/, "")}.md doesn't` : "/index.md doesn't"}.`)
        : make("md-twins", "fail", "Neither /index.md nor a .md twin of a content page returns Markdown."),
  );

  // Identity and entity links
  const identity = readIdentity($);
  if (!identity) {
    checks.push(make("identity", "fail", "No Organization, Person or WebSite JSON-LD on the homepage."));
    checks.push(make("same-as", "fail", "No structured identity, so no sameAs links."));
  } else {
    const parts = [identity.name && "name", identity.url && "url", identity.description && "description", identity.image && "logo/image", identity.sameAs && `${identity.sameAs} sameAs links`].filter(Boolean);
    const full = identity.name && identity.url && (identity.sameAs || identity.image) && identity.type !== "WebSite";
    checks.push(make("identity", full ? "pass" : identity.name ? "partial" : "fail", `${identity.type} JSON-LD with ${parts.join(", ") || "no useful fields"}.`));
    checks.push(make("same-as", identity.sameAs >= 2 ? "pass" : identity.sameAs ? "partial" : "fail", identity.sameAs ? `${identity.sameAs} sameAs profile link${identity.sameAs === 1 ? "" : "s"}.` : "No sameAs links to your profiles elsewhere."));
  }

  // Metadata
  if (home) {
    const ogType = $("meta[property='og:type']").attr("content");
    const fields = [
      ["title", Boolean(home.title)],
      ["meta description", Boolean(home.metaDescription)],
      ["canonical", Boolean(home.canonicalUrl)],
      ["lang", Boolean(home.lang)],
      ["og:image", Boolean(home.ogImage)],
      ["og:type", Boolean(ogType)],
    ] as const;
    const missingFields = fields.filter(([, ok]) => !ok).map(([name]) => name);
    checks.push(
      make(
        "metadata",
        !missingFields.length ? "pass" : missingFields.length <= 2 ? "partial" : "fail",
        missingFields.length ? `Missing ${missingFields.join(", ")} on the homepage.` : `All present: ${fields.map(([name]) => name).join(", ")}${home.lang ? ` (lang="${home.lang}")` : ""}.`,
        (fields.length - missingFields.length) / fields.length,
      ),
    );
  } else {
    checks.push(make("metadata", "na", "No readable homepage to check."));
  }

  // Trust pages
  const anchors = $("a[href]").toArray();
  const found = TRUST.filter((t) =>
    anchors.some((a) => {
      const href = $(a).attr("href") ?? "";
      const text = $(a).text().trim();
      return t.pattern.test(href) || t.text.test(text);
    }),
  ).map((t) => t.name);
  const absent = TRUST.map((t) => t.name).filter((n) => !found.includes(n));
  checks.push(
    make(
      "trust",
      !absent.length ? "pass" : found.length ? "partial" : "fail",
      !absent.length ? "The homepage links to About, Contact and Privacy pages." : `The homepage ${found.length ? `links to ${found.join(" and ")} but ` : ""}has no link to ${absent.join(" or ")}.`,
      found.length / TRUST.length,
    ),
  );

  // Context budget
  const measured = pages.filter((p) => p.data);
  if (measured.length) {
    const sized = measured.map((p) => ({ url: p.res.finalUrl, tokens: Math.ceil(p.data!.contentChars / 4) })).sort((a, b) => b.tokens - a.tokens);
    const largest = sized[0];
    const htmlTokens = Math.ceil(homeRes.sizeBytes / 4);
    const evidence = `Largest of ${measured.length} measured pages is ~${thousands(largest.tokens)} tokens of text (${displayPath(largest.url)}); the homepage's raw HTML is ~${thousands(htmlTokens)} tokens.`;
    checks.push(make("token-budget", largest.tokens <= TOKEN_BUDGET ? "pass" : largest.tokens <= TOKEN_LIMIT ? "partial" : "fail", evidence));
  } else {
    checks.push(make("token-budget", "na", "No readable pages to measure."));
  }

  // Structure and controls
  if (home) {
    const hasMain = $("main, [role=main]").length > 0;
    const h1s = $("h1").length;
    const skip = headingSkip($);
    const landmarks = ["header, [role=banner]", "nav, [role=navigation]", "main, [role=main]", "footer, [role=contentinfo]"].filter((s) => $(s).length).length;
    const good = [hasMain, h1s === 1, skip <= 1].filter(Boolean).length;
    checks.push(
      make(
        "structure",
        good === 3 ? "pass" : good === 2 ? "partial" : "fail",
        `${hasMain ? "Has" : "No"} <main> landmark (${landmarks} of 4 landmarks), ${h1s} H1, biggest heading jump ${skip === 0 ? "none" : `${skip} level${skip > 1 ? "s" : ""}`}.`,
      ),
    );
    const controls = controlNames($);
    const share = controls.total ? controls.named / controls.total : 1;
    checks.push(
      make(
        "controls",
        share >= 0.95 && !controls.divButtons ? "pass" : share >= 0.8 ? "partial" : "fail",
        `${controls.named} of ${controls.total} links, buttons and fields have an accessible name (${Math.round(share * 100)}%)${controls.divButtons ? `; ${controls.divButtons} clickable <div>/<span> elements` : ""}.`,
        share,
      ),
    );
  } else {
    checks.push(make("structure", "na", "No readable homepage to check."));
    checks.push(make("controls", "na", "No readable homepage to check."));
  }

  // Hidden instructions (the full scan replaces this with every crawled page)
  const injected = measured.filter((p) => p.data!.hiddenInstructions.length);
  checks.push(
    injected.length
      ? make("no-injection", "fail", `Hidden instructions to AI assistants on ${displayPath(injected[0].res.finalUrl)}: “${injected[0].data!.hiddenInstructions[0]}”.`)
      : make("no-injection", "pass", `No hidden instructions to AI assistants on the ${measured.length} pages checked (hidden elements, comments, labels and AI prompt links).`),
  );

  // Link headers and well-known files
  const linkHeader = homeRes.headers?.get("link") ?? "";
  const rels = [...linkHeader.matchAll(/rel="?([^";,]+)"?/gi)].map((m) => m[1].trim());
  checks.push(
    rels.length
      ? make("link-headers", "pass", `The homepage sends a Link header with rel=${[...new Set(rels)].join(", ")}.`)
      : make("link-headers", "fail", "No Link header on the homepage."),
  );
  const wellKnown = [
    ["/.well-known/api-catalog", apiCatalog],
    ["/.well-known/agent-card.json", agentCard],
    ["/.well-known/ai-catalog.json", aiCatalog],
  ] as const;
  const present = wellKnown.filter(([, res]) => isOk(res) && /json/.test(contentType(res))).map(([path]) => path);
  checks.push(
    present.length
      ? make("well-known", "pass", `Found ${present.join(", ")}.`)
      : make("well-known", "fail", `None of ${wellKnown.map(([path]) => path).join(", ")} exist. Fine for content sites; useful if you offer an API or an agent.`),
  );

  return { url: homeUrl, checkedAt: Date.now(), checks, sampled: read.map((s) => s.res.finalUrl) };
}
