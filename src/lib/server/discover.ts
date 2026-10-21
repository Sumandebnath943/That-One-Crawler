import { parseRobots, type ParsedRobots } from "@/lib/seo/robots";
import type { DiscoverResponse } from "@/lib/seo/types";
import { bareHost, inScope, isCrawlableUrl, isSameSite, scopeFor, urlKey } from "@/lib/seo/url";
import { decodeBody, safeFetch } from "./safe-fetch";

const SITEMAP_ACCEPT = "application/xml,text/xml;q=0.9,*/*;q=0.8";
const MAX_SITEMAP_FETCHES = 40;
const MAX_SITEMAP_DEPTH = 3;
const SITEMAP_BUDGET_MS = 25_000;

export class DiscoverError extends Error {}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

const LOC = /<loc>\s*(?:<!\[CDATA\[)?\s*([^<\]]+?)\s*(?:\]\]>)?\s*<\/loc>/i;

export function extractLocs(xml: string): string[] {
  const pattern = new RegExp(LOC.source, "gi");
  return [...xml.matchAll(pattern)].map((match) => decodeXmlEntities(match[1]));
}

export interface SitemapEntry {
  loc: string;
  lastmod: string;
}

/** <url> or <sitemap> entries with their <lastmod>, falling back to bare <loc>s for sloppy sitemaps. */
export function extractEntries(xml: string, tag: "url" | "sitemap"): SitemapEntry[] {
  const entries: SitemapEntry[] = [];
  for (const block of xml.matchAll(new RegExp(`<${tag}[\\s>]([\\s\\S]*?)</${tag}>`, "gi"))) {
    const loc = block[1].match(LOC)?.[1];
    if (!loc) continue;
    const lastmod = block[1].match(/<lastmod>\s*([^<]+?)\s*<\/lastmod>/i)?.[1] ?? "";
    entries.push({ loc: decodeXmlEntities(loc), lastmod });
  }
  return entries.length ? entries : extractLocs(xml).map((loc) => ({ loc, lastmod: "" }));
}

/** Posts and pages first, taxonomy archives last, so a page limit spends itself on real content. */
export function sitemapPriority(url: string): number {
  const u = url.toLowerCase();
  if (/(category|tag|author|taxonom|archive|attachment|media|image|video|product_cat|format)/.test(u)) return 3;
  if (/(post|article|blog|news|story|stories)/.test(u)) return 0;
  if (/page/.test(u)) return 1;
  return 2;
}

const lastmodTime = (entry: SitemapEntry) => Date.parse(entry.lastmod) || 0;
// WordPress and Yoast number their sitemaps oldest-first (post-sitemap2.xml is newer than post-sitemap.xml).
const sitemapNumber = (url: string) => Number(url.match(/(\d+)\.xml(?:\.gz)?$/i)?.[1] ?? 0);

export function orderChildSitemaps(children: SitemapEntry[]): SitemapEntry[] {
  // Image and video sitemaps only repeat page URLs we get elsewhere.
  return children.filter((child) => !/(image|video)[-_]?sitemap/i.test(child.loc)).sort(
    (a, b) =>
      sitemapPriority(a.loc) - sitemapPriority(b.loc) ||
      lastmodTime(b) - lastmodTime(a) ||
      sitemapNumber(b.loc) - sitemapNumber(a.loc),
  );
}

async function collectSitemapUrls(
  tiers: string[][],
  { baseDomain, scope, limit, signal }: { baseDomain: string; scope: string; limit: number; signal: AbortSignal },
) {
  const deadline = Date.now() + SITEMAP_BUDGET_MS;
  // Collect more than we need so we can keep the most recently updated pages.
  const collectCap = Math.min(Math.max(limit * 3, 500), 5000);
  const entries: SitemapEntry[] = [];
  const seenUrls = new Set<string>();
  const visited = new Set<string>();
  const sources: string[] = [];
  let fetches = 0;
  let truncated = false;

  const full = () => entries.length >= collectCap;

  async function visit(sitemapUrl: string, depth: number): Promise<void> {
    if (full() || depth > MAX_SITEMAP_DEPTH || visited.has(sitemapUrl)) return;
    if (fetches >= MAX_SITEMAP_FETCHES || Date.now() > deadline || signal.aborted) return;
    visited.add(sitemapUrl);
    fetches += 1;

    const res = await safeFetch(sitemapUrl, { accept: SITEMAP_ACCEPT, timeoutMs: 12_000, maxBytes: 10_000_000, signal });
    if (res.status !== 200 || !res.body.byteLength) return;
    const xml = decodeBody(res.body, res.headers?.get("content-type") ?? null);
    const isIndex = /<sitemapindex[\s>]/i.test(xml);
    if (!isIndex && !/<urlset[\s>]/i.test(xml)) return;
    sources.push(res.finalUrl);

    if (isIndex) {
      const children = orderChildSitemaps(extractEntries(xml, "sitemap"));
      for (let i = 0; i < children.length; i += 4) {
        if (full()) {
          truncated = true;
          break;
        }
        await Promise.all(children.slice(i, i + 4).map((child) => visit(child.loc, depth + 1)));
      }
      return;
    }
    for (const entry of extractEntries(xml, "url")) {
      const { loc } = entry;
      if (!isSameSite(loc, baseDomain) || !isCrawlableUrl(loc) || !inScope(loc, scope)) continue;
      const key = urlKey(loc);
      if (seenUrls.has(key)) continue;
      if (full()) {
        truncated = true;
        return;
      }
      seenUrls.add(key);
      entries.push(entry);
    }
  }

  // Try each tier in order and stop at the first one that yields pages.
  for (const tier of tiers) {
    for (const sitemapUrl of tier) await visit(sitemapUrl, 0);
    if (entries.length) break;
  }

  // Most recently updated first (stable, so undated entries keep sitemap order).
  const ordered = [...entries].sort((a, b) => lastmodTime(b) - lastmodTime(a));
  return {
    urls: ordered.slice(0, limit).map((entry) => entry.loc),
    sources,
    truncated: truncated || entries.length > limit,
  };
}

/** Figure out where a site really lives, read robots.txt, and harvest its sitemaps. */
export async function discoverSite(inputUrl: string, limit: number, signal: AbortSignal): Promise<DiscoverResponse> {
  const warnings: string[] = [];
  const home = await safeFetch(inputUrl, { timeoutMs: 15_000, maxBytes: 1_000_000, signal });
  const inputHost = new URL(inputUrl).hostname;
  if (home.error) {
    throw new DiscoverError(`We couldn't reach ${inputHost} (${home.error.toLowerCase()}).`);
  }

  const startUrl = home.finalUrl;
  const start = new URL(startUrl);
  const baseDomain = bareHost(start.hostname);
  const origin = start.origin;

  if (bareHost(inputHost) !== baseDomain) {
    warnings.push(`${inputHost} redirects to ${start.hostname}, so we're crawling that instead.`);
  }
  if (home.status >= 400) {
    warnings.push(
      home.status === 403 || home.status === 429
        ? `The homepage answered ${home.status}. This site may be blocking crawlers, so results could be thin.`
        : `The homepage answered ${home.status}. We'll still try the sitemap.`,
    );
  }

  let robots: ParsedRobots = { sitemaps: [], rules: { allow: [], disallow: [] } };
  let robotsFound = false;
  const robotsRes = await safeFetch(`${origin}/robots.txt`, {
    accept: "text/plain,*/*;q=0.8",
    timeoutMs: 8_000,
    maxBytes: 500_000,
    signal,
  });
  const robotsType = robotsRes.headers?.get("content-type") ?? "";
  if (robotsRes.status === 200 && !/html/i.test(robotsType)) {
    robots = parseRobots(decodeBody(robotsRes.body, robotsType));
    robotsFound = true;
  }

  const scope = scopeFor(inputUrl, startUrl);
  const commonPaths = ["/sitemap.xml", "/sitemap_index.xml", "/wp-sitemap.xml", "/sitemap-index.xml"];
  // A blog living at /blog often has its own sitemap there (e.g. a WordPress subfolder install).
  const scopedSitemaps = scope ? commonPaths.map((path) => `${origin}${scope}${path}`) : [];
  const robotsSitemaps = robots.sitemaps.filter((url) => /^https?:\/\//i.test(url));
  const fallbacks = [...commonPaths, "/post-sitemap.xml", "/page-sitemap.xml", "/sitemap/"].map(
    (path) => `${origin}${path}`,
  );

  const tiers = [scopedSitemaps, robotsSitemaps, ...fallbacks.map((url) => [url])].filter((tier) => tier.length);
  const sitemap = await collectSitemapUrls(tiers, { baseDomain, scope, limit, signal });

  return {
    inputUrl,
    startUrl,
    origin,
    baseDomain,
    scope,
    homepageStatus: home.status,
    robots: { found: robotsFound, sitemaps: robots.sitemaps, rules: robots.rules },
    sitemap,
    warnings,
  };
}
