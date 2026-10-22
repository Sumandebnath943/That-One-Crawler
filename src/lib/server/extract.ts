import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";
import { extractFigures } from "@/lib/seo/figures";
import { keywordCandidates } from "@/lib/seo/keywords";
import { pickImageCandidate } from "@/lib/seo/images";
import {
  countWords,
  fleschReadingEase,
  hiddenInstructionSignals,
  injectionSignals,
  looksEnglish,
  splitSentences,
  WORD_RE,
} from "@/lib/seo/text";
import type { ArticleSchemaFields, BrandFindings, HeadingItem, PageData } from "@/lib/seo/types";
import { bareHost, isCrawlableUrl, stripHash, urlKey } from "@/lib/seo/url";

const MAX_HEADINGS = 6;
const MAX_OUTLINE = 80;
const MAX_LINKS = 500;
const MAX_EXTERNAL = 60;
const MAX_IMAGES = 20;
const INVISIBLE = "script, style, noscript, template, svg, iframe";
/** Code samples and quotations show text; they don't instruct anyone. */
const QUOTED = "pre, code, kbd, samp, blockquote, q";
const HIDDEN_STYLE =
  /(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0(?:\.0+)?\s*(?:;|$)|font-size\s*:\s*0(?:px|em|rem|%)?\s*(?:;|$)|(?:left|top|text-indent)\s*:\s*-\d{3,}(?:px|em|rem))/i;
const HIDDEN_CLASS = /(?:^|\s)(?:sr-only|visually-hidden|screen-reader-text|hidden|d-none|invisible)(?:\s|$)/i;
// Tailwind's "hidden md:flex" is a responsive menu, visible on bigger screens.
const RESPONSIVE_SHOW = /(?:^|\s)(?:sm|md|lg|xl|2xl):(?:block|flex|grid|inline|inline-block|inline-flex|table|contents)(?:\s|$)/;
/** Assistants that take a prompt in the URL, which "Summarize with AI" buttons fill in. */
const AI_CHAT_HOSTS = /^(?:chatgpt\.com|chat\.openai\.com|claude\.ai|(?:www\.)?perplexity\.ai|gemini\.google\.com|copilot\.microsoft\.com|grok\.com)$/i;
// Lighthouse's list of link texts that say nothing about where the link goes.
const VAGUE_LINK_TEXT = new Set([
  "click here",
  "click this",
  "go",
  "here",
  "information",
  "learn more",
  "more",
  "more info",
  "more information",
  "right here",
  "read more",
  "see more",
  "start",
  "this",
  "link",
]);
const NON_CONTENT = "nav, footer, aside";
/** Site chrome: menus, sidebars, widgets and comment forms aren't the page's content. */
const CHROME =
  "nav, aside, footer, [role=navigation], [role=complementary], [role=contentinfo], [role=banner], .sidebar, #sidebar, [class*='widget'], #comments, .comments-area, #respond, .related-posts, .sharedaddy";
const QUESTION = /^(what|how|why|when|where|which|who|whom|can|could|is|are|was|were|does|do|did|should|will|would)\b/i;
const SHARE_LINK = /\/(share|sharer|intent\/tweet|shareArticle)|pinterest\.[a-z.]+\/pin\/create|wa\.me\/|api\.whatsapp\.com|t\.me\/share/i;

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
  | "ttfbMs"
  | "sizeBytes"
  | "xRobotsTag"
>;

export interface PageRulesInput {
  bannedPhrases: string[];
  requiredPhrases: string[];
}

export function clean(value: string | undefined | null): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

/** Text of a node with spaces between elements, so "<p>a</p><p>b</p>" reads as "a b". */
function spacedText(nodes: AnyNode[], skip?: (el: Element) => boolean): string {
  const parts: string[] = [];
  const walk = (node: AnyNode) => {
    if (node.type === "text") parts.push(node.data);
    else if (skip && isElement(node) && skip(node)) return;
    else if ("children" in node) for (const child of node.children) walk(child);
    if (node.type === "tag") parts.push(" ");
  };
  nodes.forEach(walk);
  return clean(parts.join(""));
}

function isHiddenElement(el: Element): boolean {
  const attribs = el.attribs ?? {};
  if ("hidden" in attribs) return true;
  if (HIDDEN_STYLE.test(attribs.style ?? "")) return true;
  const cls = attribs.class ?? "";
  return HIDDEN_CLASS.test(cls) && !RESPONSIVE_SHOW.test(cls);
}

/**
 * Text a model reading the page sees but a visitor doesn't: hidden elements, comments and the prompts
 * inside "ask an AI about this page" links (`unseen`), plus alt text and aria-labels (`labels`).
 */
function unseenTexts($: cheerio.CheerioAPI): { unseen: string[]; labels: string[] } {
  const unseen: string[] = [];
  const labels: string[] = [];
  $("body *").each((_, el) => {
    if (!isElement(el) || !isHiddenElement(el)) return;
    // Only the outermost hidden element, so nested ones aren't read twice.
    if ($(el).parents().toArray().some((p) => isElement(p) && isHiddenElement(p))) return;
    // A code sample in a collapsed tab is still a code sample.
    const text = spacedText([el], (child) => /^(?:script|style|pre|code|kbd|samp)$/.test(child.name));
    if (text) unseen.push(text);
  });
  $("*")
    .contents()
    .each((_, node) => {
      if (node.type === "comment" && clean(node.data)) unseen.push(clean(node.data));
    });
  $("a[href]").each((_, el) => {
    try {
      const url = new URL(clean($(el).attr("href")));
      if (!AI_CHAT_HOSTS.test(url.hostname)) return;
      const prompt = url.searchParams.get("q") ?? url.searchParams.get("prompt");
      if (prompt) unseen.push(prompt);
    } catch {
      // Relative or malformed: not an AI prompt link.
    }
  });
  $("[aria-label], [aria-description], [title], img[alt]").each((_, el) => {
    for (const name of ["aria-label", "aria-description", "title", "alt"]) {
      const value = clean($(el).attr(name));
      if (value.length > 20) labels.push(value);
    }
  });
  return { unseen, labels };
}

/** Has an explicit size, or can't move the layout (absolutely positioned, as Next.js "fill" images are). */
function isSizedImage(img: cheerio.Cheerio<Element>): boolean {
  const width = img.attr("width");
  const height = img.attr("height");
  if (width && height) return true;
  const style = (img.attr("style") ?? "").toLowerCase();
  if (img.attr("data-nimg") === "fill" || /position\s*:\s*(?:absolute|fixed)/.test(style)) return true;
  const cssWidth = /(?:^|;)\s*width\s*:\s*(?!auto)[^;]+/.test(style);
  const cssHeight = /(?:^|;)\s*height\s*:\s*(?!auto)[^;]+/.test(style);
  const ratio = /aspect-ratio\s*:/.test(style);
  if ((cssWidth || width) && (cssHeight || height || ratio)) return true;
  if ((cssHeight || height) && ratio) return true;
  // Utility classes that fix both sides (Tailwind's size-*, w-* with h-*, aspect-*).
  const cls = img.attr("class") ?? "";
  return /(?:^|\s)size-\S+/.test(cls) || (/(?:^|\s)w-(?!auto)\S+/.test(cls) && /(?:^|\s)(?:h-(?!auto)\S+|aspect-\S+)/.test(cls));
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

interface JsonLdFindings {
  types: Set<string>;
  date: string;
  modified: string;
  author: string;
  article: ArticleSchemaFields | null;
  faqPage: boolean;
}

const ARTICLE_TYPES = /^(Article|BlogPosting|NewsArticle|TechArticle|Report|ScholarlyArticle|SocialMediaPosting)$/;

type JsonNode = Record<string, unknown>;

/** Index every node that has an @id, so references like author: {"@id": "…#person"} can be resolved (Yoast does this). */
function indexJsonLd(nodes: unknown, byId: Map<string, JsonNode>) {
  if (Array.isArray(nodes)) {
    nodes.forEach((n) => indexJsonLd(n, byId));
    return;
  }
  if (!nodes || typeof nodes !== "object") return;
  const node = nodes as JsonNode;
  if (typeof node["@id"] === "string" && Object.keys(node).length > 1) byId.set(node["@id"], node);
  if (Array.isArray(node["@graph"])) indexJsonLd(node["@graph"], byId);
}

function collectJsonLd(nodes: unknown, acc: JsonLdFindings, byId: Map<string, JsonNode> = new Map()) {
  if (!nodes) return;
  if (Array.isArray(nodes)) {
    nodes.forEach((n) => collectJsonLd(n, acc, byId));
    return;
  }
  if (typeof nodes !== "object") return;
  const node = nodes as Record<string, unknown>;
  const rawType = node["@type"];
  const types = (Array.isArray(rawType) ? rawType : rawType ? [rawType] : []).map(String);
  types.forEach((t) => acc.types.add(t));
  if (types.includes("FAQPage")) acc.faqPage = true;
  if (!acc.article && types.some((t) => ARTICLE_TYPES.test(t))) {
    acc.article = {
      headline: Boolean(node.headline || node.name),
      author: Boolean(node.author),
      datePublished: Boolean(node.datePublished),
      image: Boolean(node.image),
    };
  }
  if (!acc.date && node.datePublished) acc.date = String(node.datePublished);
  if (!acc.modified && node.dateModified) acc.modified = String(node.dateModified);
  if (!acc.author && node.author) acc.author = authorName(node.author, byId);
  if (Array.isArray(node["@graph"])) collectJsonLd(node["@graph"], acc, byId);
  if (node.mainEntity && typeof node.mainEntity === "object") collectJsonLd(node.mainEntity, acc, byId);
}

function authorName(author: unknown, byId: Map<string, JsonNode>): string {
  if (!author) return "";
  if (Array.isArray(author)) {
    for (const item of author) {
      const name = authorName(item, byId);
      if (name) return name;
    }
    return "";
  }
  if (typeof author === "object") {
    const node = author as JsonNode;
    const resolved = !node.name && typeof node["@id"] === "string" ? byId.get(node["@id"]) : node;
    return clean(String(resolved?.name ?? ""));
  }
  return clean(String(author));
}

function checkRules(text: string, rules: PageRulesInput | undefined): BrandFindings | null {
  if (!rules || (!rules.bannedPhrases.length && !rules.requiredPhrases.length)) return null;
  const haystack = ` ${text.toLowerCase().replace(/\s+/g, " ")} `;
  const has = (phrase: string) => haystack.includes(phrase.toLowerCase().trim());
  return {
    bannedFound: rules.bannedPhrases.filter((p) => p.trim() && has(p)),
    requiredMissing: rules.requiredPhrases.filter((p) => p.trim() && !has(p)),
  };
}

const isElement = (el: AnyNode): el is Element => "attribs" in el;

/**
 * A <header> is site chrome when it's the site banner: outside <main>/<article> and either holding
 * the navigation or sitting straight under <body>. Article and page headers (title, lead) are content.
 */
function isChromeHeader($: cheerio.CheerioAPI, header: Element): boolean {
  const node = $(header);
  if (node.closest("main, article, [role=main]").length) return false;
  return node.find("nav").length > 0 || (header.parent as Element | null)?.name === "body";
}

function chromeTest($: cheerio.CheerioAPI) {
  return (el: Element) => {
    const node = $(el);
    if (node.closest(CHROME).length) return true;
    return node
      .closest("header")
      .toArray()
      .some((header) => isElement(header) && isChromeHeader($, header));
  };
}

export interface PageSection {
  heading: string;
  /** Plain text: paragraphs separated by blank lines, list items as "- item", H3s as "### heading". */
  text: string;
}

/** The page's content split into its H2 sections, for the AI tools. */
export interface PageSource {
  title: string;
  metaDescription: string;
  h1: string;
  intro: string;
  sections: PageSection[];
  outline: HeadingItem[];
  /** All content text (intro + sections). */
  text: string;
  injection: string[];
}

export function readSource(html: string): PageSource {
  const $ = cheerio.load(html);
  let metaDescription = "";
  $("meta").each((_, el) => {
    if (!metaDescription && clean($(el).attr("name")).toLowerCase() === "description") metaDescription = clean($(el).attr("content"));
  });
  const titleEl = $("head title").first().length ? $("head title").first() : $("title").first();
  const unseen = unseenTexts($);
  $(INVISIBLE).remove();
  const quoted = new Set(QUOTED.split(", "));
  const prose = spacedText($("body").toArray(), (el) => quoted.has(el.name) || isHiddenElement(el));
  const isChrome = chromeTest($);
  const elements = $("h1, h2, h3, h4, p, li, blockquote")
    .toArray()
    .filter((el): el is Element => isElement(el) && !isChrome(el));

  let h1 = "";
  const intro: string[] = [];
  const sections: { heading: string; lines: string[] }[] = [];
  const outline: HeadingItem[] = [];
  for (const el of elements) {
    // Skip a <p> nested in an <li> (the <li> already carries its text).
    if (el.name === "p" && $(el).parents("li").length) continue;
    const text = spacedText([el]);
    if (!text) continue;
    if (/^h[1-4]$/.test(el.name)) outline.push({ level: Number(el.name.slice(1)), text });
    if (el.name === "h1") {
      h1 ||= text;
    } else if (el.name === "h2") {
      sections.push({ heading: text, lines: [] });
    } else {
      const line = el.name === "li" ? `- ${text}` : /^h[34]$/.test(el.name) ? `### ${text}` : text;
      (sections.length ? sections[sections.length - 1].lines : intro).push(line);
    }
  }
  const done = sections.map((s) => ({ heading: s.heading, text: s.lines.join("\n\n") }));
  const introText = intro.join("\n\n");
  return {
    title: clean(titleEl.text()),
    metaDescription,
    h1,
    intro: introText,
    sections: done,
    outline,
    text: [introText, ...done.map((s) => `## ${s.heading}\n\n${s.text}`)].join("\n\n"),
    injection: [...injectionSignals(`${metaDescription} ${prose}`), ...hiddenInstructionSignals(unseen.unseen, unseen.labels)],
  };
}

/** Pull every SEO, readability and GEO signal we care about out of one HTML document. */
export function extractContent(html: string, pageUrl: string, baseDomain: string, rules?: PageRulesInput): ExtractedContent {
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
  const headingTexts = (selector: string) =>
    $(selector)
      .toArray()
      .map((el) => spacedText([el]))
      .filter(Boolean);
  const h1All = headingTexts("h1");

  let canonicalUrl = "";
  const canonicals = new Set<string>();
  const hreflang: string[] = [];
  let markdownAlternate = "";
  $("link[rel]").each((_, el) => {
    const rel = relTokens($(el).attr("rel"));
    if (rel.includes("canonical")) {
      const href = resolve($(el).attr("href"), base);
      if (!canonicalUrl) canonicalUrl = href;
      if (href) canonicals.add(urlKey(href));
    }
    const lang = clean($(el).attr("hreflang"));
    if (lang && rel.includes("alternate")) hreflang.push(lang);
    if (!markdownAlternate && rel.includes("alternate") && /markdown/i.test(clean($(el).attr("type")))) {
      markdownAlternate = resolve($(el).attr("href"), base);
    }
  });
  let metaRefresh = "";
  $("meta[http-equiv]").each((_, el) => {
    if (!metaRefresh && clean($(el).attr("http-equiv")).toLowerCase() === "refresh") metaRefresh = clean($(el).attr("content")) || "0";
  });

  // ---- Images ----
  const images = $("img");
  const imageSrcs: string[] = [];
  let imagesMissingAlt = 0;
  let missingSize = 0;
  let notLazy = 0;
  let legacyFormat = 0;
  images.each((index, el) => {
    const img = $(el);
    if (img.attr("alt") === undefined) imagesMissingAlt += 1;
    const tracking = img.attr("width") === "1" || img.attr("height") === "1";
    if (!tracking && !isSizedImage(img)) missingSize += 1;
    if (index > 0 && img.attr("loading") !== "lazy") notLazy += 1;
    const src = resolve(img.attr("src") || img.attr("data-src") || img.attr("data-lazy-src"), base);
    const srcset = img.attr("srcset") || img.attr("data-srcset");
    const modern = /\.(webp|avif)\b/i.test(`${srcset ?? ""} ${img.parent("picture").html() ?? ""}`);
    if (/\.(jpe?g|png|gif)(\?|#|$)/i.test(src) && !modern) legacyFormat += 1;
    // Weigh and check the variant a desktop browser would download, not the oversized fallback in src.
    const picked = resolve(pickImageCandidate(src, srcset, img.attr("sizes")), base) || src;
    if (picked.startsWith("http") && imageSrcs.length < MAX_IMAGES && !imageSrcs.includes(picked)) imageSrcs.push(picked);
  });

  // ---- Mixed content: http:// files on an https:// page ----
  const insecureResources: string[] = [];
  if (pageUrl.startsWith("https:")) {
    $("img[src], script[src], iframe[src], video[src], audio[src], source[src], link[href]").each((_, el) => {
      const node = $(el);
      if (el.name === "link" && !relTokens(node.attr("rel")).some((r) => r === "stylesheet" || r === "icon" || r === "preload")) return;
      const value = clean(node.attr("src") ?? node.attr("href"));
      if (/^http:\/\//i.test(value) && insecureResources.length < 10 && !insecureResources.includes(value)) insecureResources.push(value);
    });
  }

  // ---- Links ----
  const links: string[] = [];
  const outlinksExternal: string[] = [];
  const seen = new Set<string>();
  const vagueLinks: string[] = [];
  let vagueLinkCount = 0;
  let internalLinks = 0;
  let externalLinks = 0;
  $("a[href]").each((_, el) => {
    const raw = clean($(el).attr("href"));
    if (!raw || raw.startsWith("#") || /^(mailto|tel|javascript|data|sms):/i.test(raw)) return;
    const href = resolve(raw, base);
    if (!href) return;
    const parsed = new URL(href);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return;
    const label = clean($(el).attr("aria-label")).toLowerCase();
    const linkText = spacedText([el]).toLowerCase().replace(/[^\p{L}\p{N} ]+/gu, "").trim();
    if (VAGUE_LINK_TEXT.has(linkText) && (!label || VAGUE_LINK_TEXT.has(label))) {
      vagueLinkCount += 1;
      if (vagueLinks.length < 5 && !vagueLinks.includes(linkText)) vagueLinks.push(linkText);
    }
    const target = stripHash(href);
    if (bareHost(parsed.hostname) === baseDomain) {
      internalLinks += 1;
      const key = urlKey(target);
      if (links.length < MAX_LINKS && !seen.has(key) && isCrawlableUrl(target)) {
        seen.add(key);
        links.push(target);
      }
    } else {
      externalLinks += 1;
      if (outlinksExternal.length < MAX_EXTERNAL && !SHARE_LINK.test(target) && !outlinksExternal.includes(target)) {
        outlinksExternal.push(target);
      }
    }
  });

  // ---- Structured data ----
  const jsonLd: JsonLdFindings = { types: new Set(), date: "", modified: "", author: "", article: null, faqPage: false };
  let schemaErrors = 0;
  const blocks: unknown[] = [];
  $("script").each((_, el) => {
    if (clean($(el).attr("type")).toLowerCase() !== "application/ld+json") return;
    const raw = $(el).text().trim();
    if (!raw) return;
    try {
      blocks.push(JSON.parse(raw));
    } catch {
      schemaErrors += 1;
    }
  });
  const byId = new Map<string, JsonNode>();
  blocks.forEach((block) => indexJsonLd(block, byId));
  blocks.forEach((block) => collectJsonLd(block, jsonLd, byId));

  const appShell = $("#root, #app, #__nuxt, #__next, app-root").first();
  const appShellEmpty = appShell.length > 0 && spacedText(appShell.toArray()).length < 20;
  const noscriptAsksForJs = /enable javascript|requires javascript|javascript is (disabled|required)/i.test(
    $("noscript").text(),
  );

  const unseen = unseenTexts($);
  $(INVISIBLE).remove();
  const fullText = spacedText($("body").toArray());
  // What a reader sees as prose: no code samples, quotations or hidden elements.
  const quoted = new Set(QUOTED.split(", "));
  const prose = spacedText($("body").toArray(), (el) => quoted.has(el.name) || isHiddenElement(el));

  // ---- Content (site chrome excluded) ----
  const isChrome = chromeTest($);
  const content = (selector: string) =>
    $(selector)
      .toArray()
      .filter((el): el is Element => isElement(el) && !isChrome(el));

  const outline: HeadingItem[] = content("h1, h2, h3, h4, h5, h6")
    .map((el) => ({ level: Number(el.name.slice(1)), text: spacedText([el]).slice(0, 120) }))
    .filter((h) => h.text)
    .slice(0, MAX_OUTLINE);

  const paragraphs = content("p")
    .map((el) => spacedText([el]))
    .filter((text) => countWords(text) > 0);
  const english = looksEnglish(clean($("html").attr("lang")), fullText);
  let longParagraphs = 0;
  let longSentences = 0;
  const sentenceWords: number[] = [];
  const allWords: string[] = [];
  for (const paragraph of paragraphs) {
    const sentences = splitSentences(paragraph);
    const words = countWords(paragraph);
    if (words > 150 || sentences.length > 6) longParagraphs += 1;
    for (const sentence of sentences) {
      const n = countWords(sentence);
      sentenceWords.push(n);
      if (n > 35) longSentences += 1;
    }
    if (english) allWords.push(...(paragraph.match(WORD_RE) ?? []));
  }

  // Intro answer and "answer capsules": a heading followed straight away by a short, self-contained paragraph.
  let introWords = 0;
  let answerCapsules = 0;
  let pendingHeading = false;
  // If the H1 sits outside the content (in a page header), start counting from the top.
  let seenH1 = !outline.some((h) => h.level === 1);
  for (const el of content("h1, h2, h3, h4, p")) {
    if (el.name === "h1") {
      seenH1 = true;
      pendingHeading = false;
      continue;
    }
    if (el.name !== "p") {
      pendingHeading = true;
      continue;
    }
    const words = countWords(spacedText([el]));
    if (words < 8) continue;
    if (!introWords && seenH1 && !pendingHeading) introWords = words;
    if (pendingHeading) {
      if (words >= 30 && words <= 80) answerCapsules += 1;
      pendingHeading = false;
    }
  }
  const subheadings = outline.filter((h) => h.level === 2 || h.level === 3);
  const contentText = paragraphs.join(" ");

  // Word count ignores site chrome (menus, footers, sidebars, the site banner) but keeps article headers.
  $("header")
    .filter((_, header) => isChromeHeader($, header))
    .remove();
  $(NON_CONTENT).remove();
  const bodyText = spacedText($("body").toArray());
  const wordCount = bodyText ? (bodyText.match(WORD_RE) ?? []).length : 0;
  const title = clean(titleEl.text());
  const metaDescription = meta("description");

  return {
    lang: clean($("html").attr("lang")),
    title,
    metaDescription,
    metaKeywords: meta("keywords"),
    robotsMeta: [meta("robots"), meta("googlebot")].filter(Boolean).join(", "),
    canonicalUrl,
    h1: h1All.slice(0, MAX_HEADINGS),
    h1Count: h1All.length,
    h2: outline.filter((h) => h.level === 2).map((h) => h.text).slice(0, MAX_HEADINGS),
    h3: outline.filter((h) => h.level === 3).map((h) => h.text).slice(0, MAX_HEADINGS),
    headings: outline,
    ogTitle: og("og:title"),
    ogDescription: og("og:description"),
    ogImage: resolve(og("og:image"), base),
    twitterCard: meta("twitter:card"),
    schemaTypes: [...jsonLd.types].sort(),
    schemaErrors,
    articleSchema: jsonLd.article,
    hasFaqSchema: jsonLd.faqPage,
    datePublished: jsonLd.date || og("article:published_time"),
    dateModified: jsonLd.modified || og("article:modified_time") || og("og:updated_time"),
    author: jsonLd.author || meta("author"),
    hreflang,
    wordCount,
    readability: {
      paragraphs: paragraphs.length,
      longParagraphs,
      sentences: sentenceWords.length,
      longSentences,
      avgSentenceWords: sentenceWords.length
        ? Math.round((sentenceWords.reduce((a, b) => a + b, 0) / sentenceWords.length) * 10) / 10
        : 0,
      readingEase: english ? fleschReadingEase(allWords, sentenceWords.length) : null,
    },
    geo: {
      introWords,
      answerCapsules,
      questionHeadings: subheadings.filter((h) => h.text.endsWith("?") || QUESTION.test(h.text)).length,
      subheadings: subheadings.length,
      figures: extractFigures(contentText).length,
      lists: content("ul, ol").filter((el) => $(el).children("li").length >= 2).length,
      tables: content("table").length,
      hasFaqSection: outline.some((h) => /\bfaqs?\b|frequently asked/i.test(h.text)),
    },
    keywords: keywordCandidates({
      title,
      h1: h1All[0] ?? "",
      headings: subheadings.map((h) => h.text),
      metaDescription,
      url: pageUrl,
      bodyText,
    }),
    internalLinks,
    externalLinks,
    outlinksExternal,
    vagueLinks,
    vagueLinkCount,
    imageCount: images.length,
    imagesMissingAlt,
    imageStats: { missingSize, notLazy, legacyFormat },
    imageSrcs,
    insecureResources,
    canonicalCount: canonicals.size,
    metaRefresh,
    markdownAlternate,
    contentChars: bodyText.length,
    likelyNeedsJs: wordCount < 60 && (appShellEmpty || noscriptAsksForJs),
    injectionSignals: injectionSignals(`${metaDescription} ${prose}`),
    hiddenInstructions: hiddenInstructionSignals(unseen.unseen, unseen.labels),
    brand: checkRules(`${title} ${metaDescription} ${fullText}`, rules),
    links,
  };
}
