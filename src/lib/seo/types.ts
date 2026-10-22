import { injectionSignals } from "./text";

export type Severity = "critical" | "warning" | "notice";

export interface RedirectHop {
  url: string;
  status: number;
}

export type PageSpeedCategoryId = "performance" | "accessibility" | "best-practices" | "seo";

/** One Lighthouse audit that didn't pass, as PageSpeed Insights lists it. */
export interface PageSpeedAudit {
  id: string;
  title: string;
  /** Plain text: Lighthouse's Markdown links are reduced to their text. */
  description: string;
  learnMore?: string;
  displayValue?: string;
  /** 0–1, or null for informative diagnostics. */
  score: number | null;
  savingsMs?: number;
  savingsBytes?: number;
  /** A few of the offending files or elements. */
  items?: string[];
}

export interface PageSpeedCategory {
  id: PageSpeedCategoryId;
  score: number | null;
  failed: PageSpeedAudit[];
  /** Informative findings that don't affect the score ("Avoid long main-thread tasks"). */
  diagnostics: PageSpeedAudit[];
  passed: number;
  /** Things Lighthouse asks you to check by hand. */
  manual: number;
}

export type FieldRating = "good" | "ok" | "poor";

export interface FieldMetric {
  p75: number | null;
  rating: FieldRating | null;
  /** Share of visits that were good, needs improvement and poor. */
  distribution?: [number, number, number];
}

/** Real-user data (Chrome UX Report) as PageSpeed Insights reports it. */
export interface FieldData {
  scope: "url" | "origin";
  /** Core Web Vitals assessment: LCP, INP and CLS all good at the 75th percentile. */
  passed: boolean | null;
  lcp: FieldMetric;
  inp: FieldMetric;
  cls: FieldMetric;
  fcp: FieldMetric;
  ttfb: FieldMetric;
}

export interface PageSpeedResult {
  performance: number | null;
  seo: number | null;
  accessibility: number | null;
  bestPractices: number | null;
  lcpSeconds: number | null;
  cls: number | null;
  tbtMs: number | null;
  error?: string;
  // Everything below arrived with the full PageSpeed report; older scans only have the numbers above.
  strategy?: "mobile" | "desktop";
  fcpSeconds?: number | null;
  speedIndexSeconds?: number | null;
  categories?: PageSpeedCategory[];
  field?: FieldData | null;
  lighthouseVersion?: string;
  fetchedAt?: string;
  finalUrl?: string;
  warnings?: string[];
  /** Final screenshot as a data: URI (single-page test only, too big to keep for every scanned page). */
  screenshot?: string;
}

export interface HeadingItem {
  level: number;
  text: string;
}

export interface Readability {
  paragraphs: number;
  /** Paragraphs over 150 words or 6 sentences. */
  longParagraphs: number;
  sentences: number;
  /** Sentences over 35 words. */
  longSentences: number;
  avgSentenceWords: number;
  /** Flesch reading ease (English only, null otherwise). Higher is easier. */
  readingEase: number | null;
}

/** Signals that make a page easy for AI answer engines (GEO/AEO) to quote. */
export interface GeoSignals {
  /** Words in the first paragraph after the H1. */
  introWords: number;
  /** Headings followed straight away by a 30–80 word answer paragraph. */
  answerCapsules: number;
  questionHeadings: number;
  subheadings: number;
  /** Specific numbers: percentages, money, durations, counts over 12. */
  figures: number;
  lists: number;
  tables: number;
  hasFaqSection: boolean;
}

export interface ArticleSchemaFields {
  headline: boolean;
  author: boolean;
  datePublished: boolean;
  image: boolean;
}

export interface KeywordCandidate {
  phrase: string;
  score: number;
  /** Occurrences in the body text. */
  count: number;
  title: boolean;
  h1: boolean;
  meta: boolean;
  url: boolean;
  /** In the first 100 words. */
  intro: boolean;
}

export interface ImageStats {
  /** Images without width and height attributes (they make the layout jump). */
  missingSize: number;
  notLazy: number;
  /** JPEG/PNG/GIF without a WebP/AVIF alternative. */
  legacyFormat: number;
}

export interface BrandRules {
  brandName: string;
  bannedPhrases: string[];
  requiredPhrases: string[];
}

export interface BrandFindings {
  bannedFound: string[];
  requiredMissing: string[];
}

/** Everything /api/analyze learns about a single URL. */
export interface PageData {
  /** The URL we were asked to fetch. */
  url: string;
  /** Where we ended up after following same-site redirects. */
  finalUrl: string;
  /** Final HTTP status. 0 means the request never got a response. */
  status: number;
  error?: string;
  /** Redirect hops taken before reaching finalUrl. */
  redirects: RedirectHop[];
  /** Set when a redirect tried to send us to another site (which we don't follow). */
  offsiteRedirect?: string;
  contentType: string;
  isHtml: boolean;
  loadTimeMs: number;
  /** Time to first byte: from the request (redirects included) until the response headers arrived. */
  ttfbMs: number;
  sizeBytes: number;
  xRobotsTag: string;
  lang: string;
  title: string;
  metaDescription: string;
  metaKeywords: string;
  robotsMeta: string;
  canonicalUrl: string;
  h1: string[];
  h1Count: number;
  h2: string[];
  h3: string[];
  /** Content headings in document order (site chrome excluded). */
  headings: HeadingItem[];
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterCard: string;
  schemaTypes: string[];
  /** JSON-LD blocks that failed to parse. */
  schemaErrors: number;
  /** Fields present on the page's Article/BlogPosting markup, if it has one. */
  articleSchema: ArticleSchemaFields | null;
  hasFaqSchema: boolean;
  datePublished: string;
  dateModified: string;
  author: string;
  hreflang: string[];
  wordCount: number;
  readability: Readability;
  geo: GeoSignals;
  keywords: KeywordCandidate[];
  internalLinks: number;
  externalLinks: number;
  /** External links worth checking for breakage. */
  outlinksExternal: string[];
  /** Link texts like "click here" that say nothing about the destination (up to 5 examples). */
  vagueLinks: string[];
  vagueLinkCount: number;
  imageCount: number;
  imagesMissingAlt: number;
  imageStats: ImageStats;
  /** Image URLs to check (the srcset variant a desktop browser would download). */
  imageSrcs: string[];
  /** http:// images, scripts, styles or frames on an https:// page. */
  insecureResources: string[];
  /** Distinct canonical URLs the page declares (more than one confuses search engines). */
  canonicalCount: number;
  /** content of <meta http-equiv="refresh">, if any. */
  metaRefresh: string;
  /** <link rel="alternate" type="text/markdown"> target, if the page advertises one. */
  markdownAlternate: string;
  /** Characters of readable text, for estimating how much of an AI agent's context the page uses. */
  contentChars: number;
  likelyNeedsJs: boolean;
  /** Visible text that reads as instructions to AI assistants (could be a quote or an example). */
  injectionSignals: string[];
  /** Instructions to AI assistants in text visitors never see: hidden elements, comments, prompt links. */
  hiddenInstructions: string[];
  brand: BrandFindings | null;
  /** Same-site links worth crawling next. */
  links: string[];
}

// ---- AI results -------------------------------------------------------------

export type AiTask = "meta" | "section" | "headings" | "faq" | "intro" | "plan";

export interface AiMeta {
  assessment: string;
  title: string;
  metaDescription: string;
  fixes: string[];
}

export interface AiSection {
  heading: string;
  original: string;
  rewrite: string;
}

export interface AiHeadings {
  items: { before: string; after: string; why: string }[];
}

export interface AiFaq {
  items: { question: string; answer: string }[];
  /** Ready-to-paste FAQPage JSON-LD, built from the answers (not by the AI). */
  jsonLd: string;
}

export interface AiIntro {
  original: string;
  intro: string;
}

export interface AiPlan {
  summary: string;
  steps: { title: string; why: string; how: string }[];
}

/** What the fabrication guard and the prompt-injection screen found. */
export interface GuardReport {
  /** Numbers in the AI's text that never appear on the page. */
  unsupportedFigures: string[];
  /** Links or emails in the AI's text that never appear on the page. */
  unsupportedLinks: string[];
  /** Instruction-like text found on the page (fenced off and ignored). */
  injection: string[];
  /** Phrases from your brand rules' banned list that the AI used anyway. */
  bannedUsed: string[];
}

export interface AiResultBase {
  provider: string;
  model: string;
  at: number;
  guard: GuardReport;
}

export type AiResult<T> = T & AiResultBase;

export interface PageAiResults {
  meta?: AiResult<AiMeta>;
  sections?: Record<string, AiResult<AiSection>>;
  headings?: AiResult<AiHeadings>;
  faq?: AiResult<AiFaq>;
  intro?: AiResult<AiIntro>;
}

export interface QuotaInfo {
  limit: number;
  remaining: number;
  /** True when the visitor's own Gemini key was used (no free quota spent). */
  byok: boolean;
}

// ---- Crawl ------------------------------------------------------------------

/** A page as the browser keeps it once the crawl has it. */
export interface CrawledPage extends Omit<PageData, "links"> {
  /** Other URLs (sitemap entries or links) that redirected here. */
  redirectedFrom: string[];
  /** Same-site links on the page (kept for the link map and broken-link checks). */
  outlinksInternal: string[];
  /** <lastmod> from the sitemap, when it listed this page. */
  sitemapLastmod?: string;
  pagespeed?: PageSpeedResult;
  crux?: CruxResult;
  ai?: PageAiResults;
}

export interface RobotsRules {
  allow: string[];
  disallow: string[];
}

export interface DiscoverResponse {
  inputUrl: string;
  startUrl: string;
  origin: string;
  baseDomain: string;
  /** Path prefix the scan is limited to ("" = whole site). */
  scope: string;
  homepageStatus: number;
  robots: {
    found: boolean;
    sitemaps: string[];
    rules: RobotsRules;
    /** True when robots.txt has rules written specifically for ThatOneCrawler (we obey those). */
    ownGroup: boolean;
  };
  sitemap: { urls: string[]; sources: string[]; truncated: boolean; lastmods: Record<string, string> };
  warnings: string[];
}

export interface AnalyzeResponse {
  pages: PageData[];
}

export type LinkState = "ok" | "broken" | "blocked" | "error";

export interface LinkCheck {
  url: string;
  status: number;
  state: LinkState;
  sizeBytes?: number;
  contentType?: string;
  error?: string;
  /** What went wrong, in plain words, when the status alone doesn't say (a missing source image, say). */
  note?: string;
}

export interface FeatureFlags {
  pagespeed: boolean;
  /** Chrome UX Report field data (uses the PageSpeed key). */
  crux: boolean;
  ai: boolean;
  aiDailyLimit: number;
}

export interface CruxMetric {
  p75: number | null;
  rating: "good" | "ok" | "poor" | null;
}

export interface CruxResult {
  /** "url" when this exact page has enough real-user data, "origin" when we fell back to the whole site. */
  scope: "url" | "origin";
  lcp: CruxMetric;
  inp: CruxMetric;
  cls: CruxMetric;
  fcp: CruxMetric;
  ttfb: CruxMetric;
  collectionPeriod?: string;
}

export function toCrawledPage(page: PageData, redirectedFrom: string[]): CrawledPage {
  const copy: Partial<PageData> = { ...page };
  delete copy.links;
  return { ...(copy as Omit<PageData, "links">), redirectedFrom, outlinksInternal: page.links.slice(0, 200) };
}

export const EMPTY_READABILITY: Readability = {
  paragraphs: 0,
  longParagraphs: 0,
  sentences: 0,
  longSentences: 0,
  avgSentenceWords: 0,
  readingEase: null,
};

export const EMPTY_GEO: GeoSignals = {
  introWords: 0,
  answerCapsules: 0,
  questionHeadings: 0,
  subheadings: 0,
  figures: 0,
  lists: 0,
  tables: 0,
  hasFaqSection: false,
};

export function emptyPage(url: string): PageData {
  return {
    url,
    finalUrl: url,
    status: 0,
    redirects: [],
    contentType: "",
    isHtml: false,
    loadTimeMs: 0,
    ttfbMs: 0,
    sizeBytes: 0,
    xRobotsTag: "",
    lang: "",
    title: "",
    metaDescription: "",
    metaKeywords: "",
    robotsMeta: "",
    canonicalUrl: "",
    h1: [],
    h1Count: 0,
    h2: [],
    h3: [],
    headings: [],
    ogTitle: "",
    ogDescription: "",
    ogImage: "",
    twitterCard: "",
    schemaTypes: [],
    schemaErrors: 0,
    articleSchema: null,
    hasFaqSchema: false,
    datePublished: "",
    dateModified: "",
    author: "",
    hreflang: [],
    wordCount: 0,
    readability: EMPTY_READABILITY,
    geo: EMPTY_GEO,
    keywords: [],
    internalLinks: 0,
    externalLinks: 0,
    outlinksExternal: [],
    vagueLinks: [],
    vagueLinkCount: 0,
    imageCount: 0,
    imagesMissingAlt: 0,
    imageStats: { missingSize: 0, notLazy: 0, legacyFormat: 0 },
    imageSrcs: [],
    insecureResources: [],
    canonicalCount: 0,
    metaRefresh: "",
    markdownAlternate: "",
    contentChars: 0,
    likelyNeedsJs: false,
    injectionSignals: [],
    hiddenInstructions: [],
    brand: null,
    links: [],
  };
}

/**
 * Fill in fields that scans saved by older versions don't have, so old history
 * keeps working as checks are added.
 */
export function upgradePage(page: Partial<CrawledPage> & { url: string }): CrawledPage {
  const base = toCrawledPage(emptyPage(page.url), []);
  const merged = { ...base, ...page } as CrawledPage;
  // Older scans used a looser injection check that flagged prose about prompts. Their snippets
  // were saved, so run them past the current check and keep only real instructions.
  if (!page.hiddenInstructions && page.injectionSignals?.length) {
    merged.injectionSignals = page.injectionSignals.filter((snippet) => injectionSignals(snippet).length > 0);
  }
  const legacyAi = page.ai as unknown as (AiMeta & { model?: string; provider?: string }) | undefined;
  if (legacyAi && "assessment" in legacyAi) {
    merged.ai = {
      meta: {
        assessment: legacyAi.assessment,
        title: legacyAi.title,
        metaDescription: legacyAi.metaDescription,
        fixes: legacyAi.fixes ?? [],
        provider: legacyAi.provider ?? "Groq",
        model: legacyAi.model ?? "",
        at: 0,
        guard: { unsupportedFigures: [], unsupportedLinks: [], injection: [], bannedUsed: [] },
      },
    };
  }
  return merged;
}
