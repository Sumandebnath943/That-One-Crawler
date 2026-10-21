export type Severity = "critical" | "warning" | "notice";

export interface RedirectHop {
  url: string;
  status: number;
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
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterCard: string;
  schemaTypes: string[];
  datePublished: string;
  author: string;
  hreflang: string[];
  wordCount: number;
  internalLinks: number;
  externalLinks: number;
  imageCount: number;
  imagesMissingAlt: number;
  likelyNeedsJs: boolean;
  /** Same-site links worth crawling next. */
  links: string[];
}

/** A page as the browser keeps it once the crawl has it. */
export interface CrawledPage extends Omit<PageData, "links"> {
  /** Other URLs (sitemap entries or links) that redirected here. */
  redirectedFrom: string[];
  pagespeed?: PageSpeedResult;
  ai?: AiSuggestion;
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
  robots: { found: boolean; sitemaps: string[]; rules: RobotsRules };
  sitemap: { urls: string[]; sources: string[]; truncated: boolean };
  warnings: string[];
}

export interface AnalyzeResponse {
  pages: PageData[];
}

export interface AiSuggestion {
  assessment: string;
  title: string;
  metaDescription: string;
  fixes: string[];
  model: string;
  /** "Groq" or "Gemini". Missing on suggestions saved before Gemini support. */
  provider?: string;
}

export interface FeatureFlags {
  pagespeed: boolean;
  ai: boolean;
}

export function toCrawledPage(page: PageData, redirectedFrom: string[]): CrawledPage {
  const copy: Partial<PageData> = { ...page };
  delete copy.links;
  return { ...(copy as Omit<PageData, "links">), redirectedFrom };
}

export function emptyPage(url: string): PageData {
  return {
    url,
    finalUrl: url,
    status: 0,
    redirects: [],
    contentType: "",
    isHtml: false,
    loadTimeMs: 0,
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
    ogTitle: "",
    ogDescription: "",
    ogImage: "",
    twitterCard: "",
    schemaTypes: [],
    datePublished: "",
    author: "",
    hreflang: [],
    wordCount: 0,
    internalLinks: 0,
    externalLinks: 0,
    imageCount: 0,
    imagesMissingAlt: 0,
    likelyNeedsJs: false,
    links: [],
  };
}
