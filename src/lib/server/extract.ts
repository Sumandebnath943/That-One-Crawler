import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import type { PageData } from "@/lib/seo/types";
import { bareHost, isCrawlableUrl, stripHash, urlKey } from "@/lib/seo/url";

const MAX_HEADINGS = 6;
const MAX_LINKS = 500;
const NON_CONTENT = "script, style, noscript, template, svg, iframe, nav, footer, aside, header";
const WORD = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;

export type ExtractedContent = Omit<
  PageData,
  | "url"
  | "finalUrl"
  | "status"
  | "error"
  | "redirects"
  | "offsiteRedirect"
  | "contentType"
  | "isHtml"
  | "loadTimeMs"
  | "sizeBytes"
  | "xRobotsTag"
>;

export function clean(value: string | undefined | null): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

/** Text of a node with spaces between elements, so "<p>a</p><p>b</p>" reads as "a b". */
function spacedText(nodes: AnyNode[]): string {
  const parts: string[] = [];
  const walk = (node: AnyNode) => {
    if (node.type === "text") parts.push(node.data);
    else if ("children" in node) for (const child of node.children) walk(child);
    if (node.type === "tag") parts.push(" ");
  };
  nodes.forEach(walk);
  return clean(parts.join(""));
}

function resolve(href: string | undefined, base: string): string {
  const value = clean(href);
  if (!value) return "";
  try {
    return new URL(value, base).toString();
  } catch {
    return "";
  }
}

function relTokens(value: string | undefined): string[] {
  return clean(value).toLowerCase().split(" ").filter(Boolean);
}

function collectJsonLd(nodes: unknown, acc: { types: Set<string>; date: string; author: string }) {
  if (!nodes) return;
  if (Array.isArray(nodes)) {
    nodes.forEach((n) => collectJsonLd(n, acc));
    return;
  }
  if (typeof nodes !== "object") return;
  const node = nodes as Record<string, unknown>;
  const type = node["@type"];
  if (Array.isArray(type)) type.forEach((t) => acc.types.add(String(t)));
  else if (type) acc.types.add(String(type));
  if (!acc.date && node.datePublished) acc.date = String(node.datePublished);
  if (!acc.author && node.author) acc.author = authorName(node.author);
  if (Array.isArray(node["@graph"])) collectJsonLd(node["@graph"], acc);
}

function authorName(author: unknown): string {
  if (!author) return "";
  if (Array.isArray(author)) {
    for (const item of author) {
      const name = authorName(item);
      if (name) return name;
    }
    return "";
  }
  if (typeof author === "object") return clean(String((author as Record<string, unknown>).name ?? ""));
  return clean(String(author));
}

/** Pull every SEO signal we care about out of one HTML document. */
export function extractContent(html: string, pageUrl: string, baseDomain: string): ExtractedContent {
  const $ = cheerio.load(html);
  const base = resolve($("base[href]").first().attr("href"), pageUrl) || pageUrl;

  const metaByName = new Map<string, string>();
  const metaByProperty = new Map<string, string>();
  $("meta").each((_, el) => {
    const content = clean($(el).attr("content"));
    const name = clean($(el).attr("name")).toLowerCase();
    const property = clean($(el).attr("property")).toLowerCase();
    if (name && !metaByName.has(name)) metaByName.set(name, content);
    if (property && !metaByProperty.has(property)) metaByProperty.set(property, content);
  });
  const meta = (key: string) => metaByName.get(key) ?? metaByProperty.get(key) ?? "";
  const og = (key: string) => metaByProperty.get(key) ?? metaByName.get(key) ?? "";

  const titleEl = $("head title").first().length ? $("head title").first() : $("title").not("svg title").first();
  const headings = (selector: string) =>
    $(selector)
      .toArray()
      .map((el) => spacedText([el]))
      .filter(Boolean);
  const h1All = headings("h1");

  let canonicalUrl = "";
  const hreflang: string[] = [];
  $("link[rel]").each((_, el) => {
    const rel = relTokens($(el).attr("rel"));
    if (!canonicalUrl && rel.includes("canonical")) canonicalUrl = resolve($(el).attr("href"), base);
    const lang = clean($(el).attr("hreflang"));
    if (lang && rel.includes("alternate")) hreflang.push(lang);
  });

  const images = $("img");
  const imagesMissingAlt = images.filter((_, el) => $(el).attr("alt") === undefined).length;

  const links: string[] = [];
  const seen = new Set<string>();
  let internalLinks = 0;
  let externalLinks = 0;
  $("a[href]").each((_, el) => {
    const raw = clean($(el).attr("href"));
    if (!raw || raw.startsWith("#") || /^(mailto|tel|javascript|data|sms):/i.test(raw)) return;
    const href = resolve(raw, base);
    if (!href) return;
    const parsed = new URL(href);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return;
    if (bareHost(parsed.hostname) === baseDomain) {
      internalLinks += 1;
      const target = stripHash(href);
      const key = urlKey(target);
      if (links.length < MAX_LINKS && !seen.has(key) && isCrawlableUrl(target)) {
        seen.add(key);
        links.push(target);
      }
    } else {
      externalLinks += 1;
    }
  });

  const jsonLd = { types: new Set<string>(), date: "", author: "" };
  $("script").each((_, el) => {
    if (clean($(el).attr("type")).toLowerCase() !== "application/ld+json") return;
    try {
      collectJsonLd(JSON.parse($(el).text()), jsonLd);
    } catch {
      // Invalid JSON-LD is ignored, same as search engines do.
    }
  });

  const appShell = $("#root, #app, #__nuxt, #__next, app-root").first();
  const appShellEmpty = appShell.length > 0 && spacedText(appShell.toArray()).length < 20;
  const noscriptAsksForJs = /enable javascript|requires javascript|javascript is (disabled|required)/i.test(
    $("noscript").text(),
  );

  // Word count ignores navigation chrome, like the original Crawl Daddy did.
  $(NON_CONTENT).remove();
  const bodyText = spacedText($("body").toArray());
  const wordCount = bodyText ? (bodyText.match(WORD) ?? []).length : 0;

  return {
    lang: clean($("html").attr("lang")),
    title: clean(titleEl.text()),
    metaDescription: meta("description"),
    metaKeywords: meta("keywords"),
    robotsMeta: [meta("robots"), meta("googlebot")].filter(Boolean).join(", "),
    canonicalUrl,
    h1: h1All.slice(0, MAX_HEADINGS),
    h1Count: h1All.length,
    h2: headings("h2").slice(0, MAX_HEADINGS),
    h3: headings("h3").slice(0, MAX_HEADINGS),
    ogTitle: og("og:title"),
    ogDescription: og("og:description"),
    ogImage: resolve(og("og:image"), base),
    twitterCard: meta("twitter:card"),
    schemaTypes: [...jsonLd.types].sort(),
    datePublished: jsonLd.date || og("article:published_time"),
    author: jsonLd.author || meta("author"),
    hreflang,
    wordCount,
    internalLinks,
    externalLinks,
    imageCount: images.length,
    imagesMissingAlt,
    likelyNeedsJs: wordCount < 60 && (appShellEmpty || noscriptAsksForJs),
    links,
  };
}
