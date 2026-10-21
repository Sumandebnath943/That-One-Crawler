import { isAllowedByRobots } from "./robots";
import type { CrawledPage, KeywordCandidate, RobotsRules, Severity } from "./types";
import { robotsPath, urlKey } from "./url";

export const TITLE_MIN = 30;
export const TITLE_MAX = 60;
export const META_MIN = 120;
export const META_MAX = 160;
export const THIN_WORDS = 300;
export const GOOD_WORDS = 900;
export const SLOW_MS = 3000;
export const WORDS_PER_MINUTE = 238;
export const STALE_MONTHS = 12;
export const DEEP_CLICKS = 4;
export const HEAVY_IMAGE_BYTES = 300_000;
export const STUFFING_DENSITY = 3;

export type IssueCode =
  | "broken"
  | "offsite-redirect"
  | "noindex"
  | "robots-blocked"
  | "no-title"
  | "no-h1"
  | "title-short"
  | "title-long"
  | "no-meta"
  | "thin"
  | "canonical-mismatch"
  | "missing-alt"
  | "duplicate-title"
  | "duplicate-meta"
  | "slow"
  | "meta-short"
  | "meta-long"
  | "meta-cut-off"
  | "multiple-h1"
  | "h1-not-first"
  | "heading-skip"
  | "no-canonical"
  | "no-og"
  | "no-schema"
  | "schema-broken"
  | "schema-incomplete"
  | "faq-no-schema"
  | "needs-js"
  | "redirected"
  | "walls-of-text"
  | "long-sentences"
  | "hard-to-read"
  | "ai-readiness"
  | "ai-injection"
  | "keyword-not-in-title"
  | "keyword-placement"
  | "keyword-stuffing"
  | "cannibalization"
  | "stale"
  | "orphan"
  | "deep-page"
  | "broken-links"
  | "heavy-images"
  | "image-dimensions"
  | "banned-phrase"
  | "required-missing"
  | "brand-not-in-title";

export type IssueCategory =
  | "Indexing"
  | "Search appearance"
  | "Content"
  | "Keywords"
  | "Links"
  | "Structured data"
  | "AI search"
  | "Performance"
  | "Brand rules";

export interface IssueInfo {
  label: string;
  severity: Severity;
  category: IssueCategory;
  why: string;
  fix: string;
}

export const ISSUES: Record<IssueCode, IssueInfo> = {
  broken: {
    label: "Broken page",
    severity: "critical",
    category: "Indexing",
    why: "Visitors and search engines hit a dead end here. Nothing ranks from a 404.",
    fix: "Restore the page, or 301-redirect it to the closest live page and update links pointing at it.",
  },
  "offsite-redirect": {
    label: "Redirects off-site",
    severity: "warning",
    category: "Indexing",
    why: "This URL sends people to a different website, so any ranking it had walks out the door with them.",
    fix: "Make sure the redirect is intentional. If the content moved, point the URL at its new home on your own site.",
  },
  noindex: {
    label: "Noindex",
    severity: "critical",
    category: "Indexing",
    why: "This page tells search engines not to index it. It won't show up in search results. At all.",
    fix: "If you want it found, remove noindex from the robots meta tag or X-Robots-Tag header.",
  },
  "robots-blocked": {
    label: "Blocked by robots.txt",
    severity: "critical",
    category: "Indexing",
    why: "robots.txt forbids crawlers from this URL, so search engines can't read what's on it.",
    fix: "Remove or narrow the Disallow rule in robots.txt if this page should be searchable.",
  },
  "no-title": {
    label: "Missing title",
    severity: "critical",
    category: "Search appearance",
    why: "The title tag is the headline in search results. Without one, Google writes its own (badly).",
    fix: `Add a unique <title> of ${TITLE_MIN}–${TITLE_MAX} characters that says what the page is about.`,
  },
  "no-h1": {
    label: "Missing H1",
    severity: "critical",
    category: "Content",
    why: "The H1 is the page's main headline. Without it, the page is a mystery novel with no title.",
    fix: "Add exactly one H1 that matches the topic of the page.",
  },
  "title-short": {
    label: "Title too short",
    severity: "warning",
    category: "Search appearance",
    why: "Short titles waste valuable search-result space and rarely say enough to earn the click.",
    fix: `Expand the title to ${TITLE_MIN}–${TITLE_MAX} characters with the main keyword and a reason to click.`,
  },
  "title-long": {
    label: "Title too long",
    severity: "warning",
    category: "Search appearance",
    why: "Google cuts titles off around 60 characters, so the end of yours ends up as an ellipsis.",
    fix: `Trim the title to ${TITLE_MAX} characters or fewer and put the important words first.`,
  },
  "no-meta": {
    label: "Missing meta description",
    severity: "warning",
    category: "Search appearance",
    why: "Without a meta description, search engines grab a random snippet from the page instead.",
    fix: `Write a ${META_MIN}–${META_MAX} character summary that makes people want to click.`,
  },
  thin: {
    label: "Thin content",
    severity: "warning",
    category: "Content",
    why: `Pages under ${THIN_WORDS} words rarely answer a search well enough to rank.`,
    fix: "Expand the page with genuinely useful detail, merge it into a stronger page, or noindex it.",
  },
  "canonical-mismatch": {
    label: "Canonical points elsewhere",
    severity: "warning",
    category: "Indexing",
    why: "The canonical tag tells Google another URL is the 'real' version of this page, so this one may not rank.",
    fix: "If this page is the original, make its canonical point to itself.",
  },
  "missing-alt": {
    label: "Images missing alt text",
    severity: "warning",
    category: "Content",
    why: "Alt text describes images to screen readers and image search. Missing alt is both an SEO and accessibility gap.",
    fix: 'Add a short, descriptive alt attribute to each meaningful image (alt="" is fine for purely decorative ones).',
  },
  "duplicate-title": {
    label: "Duplicate title",
    severity: "warning",
    category: "Search appearance",
    why: "Several pages share this exact title, so search engines can't tell your children apart.",
    fix: "Give every page its own title that describes what makes it different.",
  },
  "duplicate-meta": {
    label: "Duplicate meta description",
    severity: "warning",
    category: "Search appearance",
    why: "The same meta description appears on multiple pages, which makes them look interchangeable in results.",
    fix: "Write a unique description for each page.",
  },
  slow: {
    label: "Slow response",
    severity: "warning",
    category: "Performance",
    why: `The page took over ${SLOW_MS / 1000} seconds to download. Slow pages lose visitors and rankings.`,
    fix: "Check hosting, caching and page weight. Run PageSpeed for a detailed breakdown.",
  },
  "meta-short": {
    label: "Meta description too short",
    severity: "notice",
    category: "Search appearance",
    why: "A short description leaves search-result space unused.",
    fix: `Aim for ${META_MIN}–${META_MAX} characters.`,
  },
  "meta-long": {
    label: "Meta description too long",
    severity: "notice",
    category: "Search appearance",
    why: `Descriptions longer than about ${META_MAX} characters get truncated in results.`,
    fix: `Tighten it to ${META_MAX} characters or fewer.`,
  },
  "meta-cut-off": {
    label: "Meta description looks cut off",
    severity: "notice",
    category: "Search appearance",
    why: 'The description ends in "…" or "[…]", usually an auto-generated excerpt. It reads like an unfinished sentence in results.',
    fix: "Write a complete, hand-written description instead of relying on the automatic excerpt.",
  },
  "multiple-h1": {
    label: "Multiple H1s",
    severity: "notice",
    category: "Content",
    why: "More than one H1 muddies what the page's main topic is.",
    fix: "Keep one H1 and demote the others to H2.",
  },
  "h1-not-first": {
    label: "H1 isn't the first heading",
    severity: "notice",
    category: "Content",
    why: "Content headings appear before the H1, so the outline starts in the middle of the story.",
    fix: "Move the H1 to the top of the content, before any H2 or H3.",
  },
  "heading-skip": {
    label: "Skipped heading levels",
    severity: "notice",
    category: "Content",
    why: "Jumping from H2 straight to H4 breaks the outline that screen readers, search engines and AI tools rely on.",
    fix: "Nest headings one level at a time: H1 → H2 → H3.",
  },
  "no-canonical": {
    label: "No canonical tag",
    severity: "notice",
    category: "Indexing",
    why: "A self-referencing canonical protects you from duplicate versions of the URL (tracking params, http/https…).",
    fix: 'Add <link rel="canonical" href="…"> pointing at this page\'s preferred URL.',
  },
  "no-og": {
    label: "No Open Graph tags",
    severity: "notice",
    category: "Search appearance",
    why: "Without og:title and friends, shared links look like ransom notes on social media.",
    fix: "Add og:title, og:description and og:image tags.",
  },
  "no-schema": {
    label: "No structured data",
    severity: "notice",
    category: "Structured data",
    why: "Structured data (JSON-LD) helps search engines and AI tools understand the page and can unlock rich results.",
    fix: "Add Article or BlogPosting JSON-LD with headline, author, datePublished and image.",
  },
  "schema-broken": {
    label: "Broken structured data",
    severity: "warning",
    category: "Structured data",
    why: "A JSON-LD block on this page isn't valid JSON, so search engines ignore it completely.",
    fix: "Run the block through a JSON validator (or Google's Rich Results Test) and fix the syntax error.",
  },
  "schema-incomplete": {
    label: "Incomplete article markup",
    severity: "notice",
    category: "Structured data",
    why: "The Article/BlogPosting markup is missing fields Google recommends, which weakens rich results and AI citations.",
    fix: "Add the missing fields: headline, author, datePublished and image.",
  },
  "faq-no-schema": {
    label: "FAQ without FAQ markup",
    severity: "notice",
    category: "AI search",
    why: "The page has an FAQ section but no FAQPage markup, so machines have to guess which text is a question and which is an answer.",
    fix: "Add FAQPage JSON-LD for the questions on the page (the AI FAQ tool can generate it).",
  },
  "needs-js": {
    label: "May need JavaScript",
    severity: "notice",
    category: "Indexing",
    why: "The raw HTML has almost no content, which usually means it's rendered by JavaScript. Some crawlers won't wait for it.",
    fix: "Use server-side rendering or static generation so the content is in the initial HTML.",
  },
  redirected: {
    label: "Reached via redirect",
    severity: "notice",
    category: "Links",
    why: "Some URLs in your sitemap or links redirect here. Every redirect is an extra hop for users and crawlers.",
    fix: "Update the sitemap and internal links to point straight at the final URL.",
  },
  "walls-of-text": {
    label: "Walls of text",
    severity: "notice",
    category: "Content",
    why: "Many paragraphs run past 150 words or 6 sentences. Long blocks are hard to read on phones and hard for AI tools to quote.",
    fix: "Split long paragraphs, add subheadings, and turn lists of items into bullet points.",
  },
  "long-sentences": {
    label: "Long sentences",
    severity: "notice",
    category: "Content",
    why: "Too many sentences run past 35 words. Readers lose the thread and skim away.",
    fix: "Break long sentences into two. One idea per sentence.",
  },
  "hard-to-read": {
    label: "Hard to read",
    severity: "notice",
    category: "Content",
    why: "The reading-ease score is below 30 (college-graduate level). Most blog readers prefer 60+.",
    fix: "Use shorter words and sentences, explain jargon, and write like you talk.",
  },
  "ai-readiness": {
    label: "Weak AI-search readiness",
    severity: "notice",
    category: "AI search",
    why: "AI answer engines (Google AI Overviews, ChatGPT, Perplexity) quote pages with clear answers, question headings, specific facts and FAQs. This page has few of them.",
    fix: "Open the page details and work through the AI-readiness checklist: start with a short answer intro and question-style headings.",
  },
  "ai-injection": {
    label: "Hidden AI instructions",
    severity: "warning",
    category: "AI search",
    why: "The page contains text that looks like instructions to AI assistants (prompt injection). AI tools and search engines may treat the page as manipulative.",
    fix: "Remove the instruction-like text, including anything hidden with CSS.",
  },
  "keyword-not-in-title": {
    label: "Main keyword missing from title",
    severity: "warning",
    category: "Keywords",
    why: "The phrase this page is most about doesn't appear in its title, which is the strongest relevance signal you control.",
    fix: "Work the main keyword into the title, ideally near the start.",
  },
  "keyword-placement": {
    label: "Main keyword not used everywhere",
    severity: "notice",
    category: "Keywords",
    why: "The main keyword is missing from some of the places that count: the H1, meta description, URL or first paragraph.",
    fix: "Use the main keyword naturally in the H1, the first paragraph and the meta description.",
  },
  "keyword-stuffing": {
    label: "Keyword stuffing",
    severity: "warning",
    category: "Keywords",
    why: `The main keyword makes up more than ${STUFFING_DENSITY}% of the text. That reads as spam to people and to Google.`,
    fix: "Replace some repetitions with synonyms and pronouns, and write for the reader.",
  },
  cannibalization: {
    label: "Keyword cannibalization",
    severity: "warning",
    category: "Keywords",
    why: "Several of your pages target the same main keyword, so they compete with each other and none ranks as well as one strong page would.",
    fix: "Pick one page to own the keyword. Merge or redirect the others, or retarget them at different angles.",
  },
  stale: {
    label: "Stale content",
    severity: "notice",
    category: "Content",
    why: `This post hasn't been updated in over ${STALE_MONTHS} months. Outdated posts slide in rankings and AI tools prefer fresh sources.`,
    fix: "Refresh facts, examples and screenshots, then update the modified date (dateModified and sitemap lastmod).",
  },
  orphan: {
    label: "Orphan page",
    severity: "warning",
    category: "Links",
    why: "No other scanned page links here. Search engines and readers can only find it through the sitemap.",
    fix: "Link to it from related posts, category pages or a hub page.",
  },
  "deep-page": {
    label: "Buried deep",
    severity: "notice",
    category: "Links",
    why: `It takes more than ${DEEP_CLICKS} clicks from the homepage to reach this page. Deep pages get crawled less and rank worse.`,
    fix: "Link to it from the homepage, a category page or a popular post to shorten the path.",
  },
  "broken-links": {
    label: "Links to broken pages",
    severity: "warning",
    category: "Links",
    why: "This page links to URLs that return 404 or don't exist. Dead links frustrate readers and waste crawl budget.",
    fix: "Update each link to a working URL, or remove it.",
  },
  "heavy-images": {
    label: "Heavy images",
    severity: "warning",
    category: "Performance",
    why: `Images over ${HEAVY_IMAGE_BYTES / 1000} KB slow the page down, especially on mobile.`,
    fix: "Compress them, resize to the displayed size and serve WebP or AVIF.",
  },
  "image-dimensions": {
    label: "Images without dimensions",
    severity: "notice",
    category: "Performance",
    why: "Images without width and height make the layout jump while loading (Cumulative Layout Shift).",
    fix: "Add width and height attributes to every <img>.",
  },
  "banned-phrase": {
    label: "Banned phrase used",
    severity: "warning",
    category: "Brand rules",
    why: "The page uses a phrase from your brand rules' banned list.",
    fix: "Reword it, or update your brand rules if the phrase is fine after all.",
  },
  "required-missing": {
    label: "Required phrase missing",
    severity: "warning",
    category: "Brand rules",
    why: "A phrase your brand rules say every page needs (a disclaimer, say) isn't on this page.",
    fix: "Add the required phrase, or update your brand rules.",
  },
  "brand-not-in-title": {
    label: "Brand missing from title",
    severity: "notice",
    category: "Brand rules",
    why: "Your brand name isn't in the title, so searchers don't see who's talking.",
    fix: 'Add the brand to the end of the title, e.g. "Post title | Brand".',
  },
};

export const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, warning: 1, notice: 2 };

export interface Issue {
  code: IssueCode;
  /** Extra context such as "(404)" or "(94 chars)". */
  detail?: string;
}

export interface BrokenOutlink {
  url: string;
  status: number;
}

export interface PageRow extends CrawledPage {
  /** 0–100, or null for pages with no content to score (broken, off-site redirects). */
  score: number | null;
  /** 0–100 GEO/AEO readiness, or null for pages without content. */
  aiScore: number | null;
  issues: Issue[];
  hasContent: boolean;
  primaryKeyword: KeywordCandidate | null;
  /** Main keyword share of the text, in %. */
  keywordDensity: number | null;
  /** How many other scanned pages link here. */
  inbound: number;
  /** Clicks from the start page, or null when unreachable or unknown. */
  depth: number | null;
  linkedFrom: string[];
  brokenOutlinks: BrokenOutlink[];
  heavyImages: { url: string; sizeBytes: number }[];
  /** Best guess at when the content was last updated (ISO). */
  lastUpdated: string | null;
  monthsSinceUpdate: number | null;
  isPost: boolean;
}

export interface RowContext {
  robots?: RobotsRules | null;
  /** Reference time for freshness: when the scan ran. */
  asOf: number;
  /** True when the crawl covered every sitemap URL (orphans can only be called then). */
  complete: boolean;
  startUrl?: string;
  brandName?: string;
}

export function hasContent(page: CrawledPage): boolean {
  return page.isHtml && page.status > 0 && page.status < 400 && !page.offsiteRedirect;
}

export function isNoindex(page: CrawledPage): boolean {
  const pattern = /\b(noindex|none)\b/i;
  return pattern.test(page.robotsMeta) || pattern.test(page.xRobotsTag);
}

export function readingMinutes(wordCount: number): number {
  return Math.round((wordCount / WORDS_PER_MINUTE) * 10) / 10;
}

/** Same 100-point formula Crawl Daddy used, so old and new scores are comparable. */
export function scorePage(page: CrawledPage): number | null {
  if (!hasContent(page)) return null;
  const titleLength = page.title.length;
  const metaLength = page.metaDescription.length;
  let score = 0;
  if (page.h1Count > 0) score += 20;
  if (titleLength >= TITLE_MIN && titleLength <= TITLE_MAX) score += 15;
  if (metaLength >= META_MIN && metaLength <= META_MAX) score += 15;
  if (page.wordCount >= GOOD_WORDS) score += 20;
  else if (page.wordCount >= THIN_WORDS) score += 10;
  if (page.canonicalUrl) score += 10;
  if (page.ogTitle) score += 5;
  if (page.imagesMissingAlt === 0) score += 5;
  if (page.schemaTypes.length > 0) score += 10;
  return score;
}

export interface AiReadinessCheck {
  label: string;
  points: number;
  earned: number;
  tip: string;
}

/** The GEO/AEO checklist behind the AI-readiness score. Each item is something answer engines reward. */
export function aiReadinessChecks(page: CrawledPage): AiReadinessCheck[] {
  const geo = page.geo;
  const questionShare = geo.subheadings ? geo.questionHeadings / geo.subheadings : 0;
  return [
    {
      label: "Short answer up top",
      points: 20,
      earned: geo.introWords >= 20 && geo.introWords <= 80 ? 20 : geo.introWords > 0 ? 8 : 0,
      tip: "Open with a 40–60 word paragraph that directly answers the page's main question.",
    },
    {
      label: "Answer paragraphs under headings",
      points: 20,
      earned: geo.answerCapsules >= 2 ? 20 : geo.answerCapsules === 1 ? 10 : 0,
      tip: "Follow each heading with a self-contained 30–80 word answer before going deeper.",
    },
    {
      label: "Question-style headings",
      points: 15,
      earned: questionShare >= 0.25 ? 15 : geo.questionHeadings > 0 ? 8 : 0,
      tip: "Phrase some H2s and H3s the way people ask: “How do I…?”, “What is…?”.",
    },
    {
      label: "FAQ section",
      points: 15,
      earned: geo.hasFaqSection || page.hasFaqSchema ? 15 : 0,
      tip: "Add a short FAQ with the questions readers actually ask (and FAQPage markup).",
    },
    {
      label: "Specific facts and numbers",
      points: 10,
      earned: geo.figures >= 3 ? 10 : geo.figures > 0 ? 5 : 0,
      tip: "Replace vague claims with specific figures, dates and named sources.",
    },
    {
      label: "Lists or tables",
      points: 10,
      earned: geo.lists + geo.tables > 0 ? 10 : 0,
      tip: "Use bullet lists for steps and options, tables for comparisons.",
    },
    {
      label: "Clear author and date",
      points: 10,
      earned: (page.author ? 5 : 0) + (page.datePublished || page.dateModified ? 5 : 0),
      tip: "Show who wrote it and when it was last updated, on the page and in the markup.",
    },
  ];
}

export function aiReadinessScore(page: CrawledPage): number | null {
  if (!hasContent(page)) return null;
  return aiReadinessChecks(page).reduce((sum, check) => sum + check.earned, 0);
}

export function canonicalMatches(page: CrawledPage): boolean | null {
  if (!page.canonicalUrl) return null;
  return urlKey(page.canonicalUrl) === urlKey(page.finalUrl);
}

type RowFacts = Omit<PageRow, "issues" | "score" | "aiScore">;

/** Everything that can be judged from one page (plus the facts buildRows worked out about it). */
export function findIssues(row: RowFacts, ctx: Partial<RowContext> = {}): Issue[] {
  const issues: Issue[] = [];

  if (row.status === 0 || row.status >= 400) {
    issues.push({ code: "broken", detail: row.status ? `(${row.status})` : row.error ? `(${row.error})` : "" });
    return issues;
  }
  if (row.offsiteRedirect) {
    issues.push({ code: "offsite-redirect", detail: `→ ${row.offsiteRedirect}` });
    return issues;
  }

  if (ctx.robots && !isAllowedByRobots(ctx.robots, robotsPath(row.finalUrl))) issues.push({ code: "robots-blocked" });
  if (isNoindex(row)) issues.push({ code: "noindex" });

  const titleLength = row.title.length;
  if (!titleLength) issues.push({ code: "no-title" });
  else if (titleLength < TITLE_MIN) issues.push({ code: "title-short", detail: `(${titleLength} chars)` });
  else if (titleLength > TITLE_MAX) issues.push({ code: "title-long", detail: `(${titleLength} chars)` });

  if (row.h1Count === 0) issues.push({ code: "no-h1" });
  else if (row.h1Count > 1) issues.push({ code: "multiple-h1", detail: `(${row.h1Count})` });

  const headings = row.headings;
  if (headings.some((h) => h.level === 1) && headings[0] && headings[0].level !== 1) {
    issues.push({ code: "h1-not-first", detail: `(starts with H${headings[0].level})` });
  }
  const skip = headings.find((h, i) => i > 0 && h.level > headings[i - 1].level + 1);
  if (skip) {
    const previous = headings[headings.indexOf(skip) - 1];
    issues.push({ code: "heading-skip", detail: `(H${previous.level} → H${skip.level})` });
  }

  const meta = row.metaDescription;
  if (!meta.length) issues.push({ code: "no-meta" });
  else if (meta.length < META_MIN) issues.push({ code: "meta-short", detail: `(${meta.length} chars)` });
  else if (meta.length > META_MAX) issues.push({ code: "meta-long", detail: `(${meta.length} chars)` });
  if (/(\.\.\.|…|\[…\]|\[\.\.\.\])\s*$/.test(meta)) issues.push({ code: "meta-cut-off" });

  if (row.wordCount < THIN_WORDS) issues.push({ code: "thin", detail: `(${row.wordCount} words)` });

  if (!row.canonicalUrl) issues.push({ code: "no-canonical" });
  else if (canonicalMatches(row) === false) issues.push({ code: "canonical-mismatch" });

  if (row.imagesMissingAlt > 0) issues.push({ code: "missing-alt", detail: `(${row.imagesMissingAlt})` });
  if (row.imageStats.missingSize > 0) issues.push({ code: "image-dimensions", detail: `(${row.imageStats.missingSize})` });
  if (row.heavyImages.length) issues.push({ code: "heavy-images", detail: `(${row.heavyImages.length})` });
  if (!row.ogTitle) issues.push({ code: "no-og" });

  if (!row.schemaTypes.length && !row.schemaErrors) issues.push({ code: "no-schema" });
  if (row.schemaErrors) issues.push({ code: "schema-broken", detail: `(${row.schemaErrors} block${row.schemaErrors > 1 ? "s" : ""})` });
  if (row.articleSchema) {
    const missing = Object.entries(row.articleSchema)
      .filter(([, present]) => !present)
      .map(([field]) => field);
    if (missing.length) issues.push({ code: "schema-incomplete", detail: `(no ${missing.join(", ")})` });
  }
  if (row.geo.hasFaqSection && !row.hasFaqSchema) issues.push({ code: "faq-no-schema" });

  const r = row.readability;
  if (r.paragraphs >= 3 && r.longParagraphs >= 2 && r.longParagraphs / r.paragraphs > 0.25) {
    issues.push({ code: "walls-of-text", detail: `(${r.longParagraphs} of ${r.paragraphs})` });
  }
  if (r.longSentences >= 3 && r.sentences && r.longSentences / r.sentences > 0.1) {
    issues.push({ code: "long-sentences", detail: `(${r.longSentences})` });
  }
  if (r.readingEase !== null && r.readingEase < 30 && row.wordCount >= THIN_WORDS) {
    issues.push({ code: "hard-to-read", detail: `(ease ${r.readingEase})` });
  }

  const aiScore = aiReadinessScore(row);
  if (aiScore !== null && aiScore < 50 && row.wordCount >= THIN_WORDS) issues.push({ code: "ai-readiness", detail: `(${aiScore}/100)` });
  if (row.injectionSignals.length) issues.push({ code: "ai-injection" });

  const keyword = row.primaryKeyword;
  if (keyword) {
    if (!keyword.title) issues.push({ code: "keyword-not-in-title", detail: `("${keyword.phrase}")` });
    const missing: string[] = [];
    if (row.h1Count > 0 && !keyword.h1) missing.push("H1");
    if (row.metaDescription && !keyword.meta) missing.push("description");
    if (!keyword.intro) missing.push("intro");
    if (missing.length) issues.push({ code: "keyword-placement", detail: `(not in ${missing.join(", ")})` });
    if (row.keywordDensity !== null && row.keywordDensity > STUFFING_DENSITY && keyword.count >= 8) {
      issues.push({ code: "keyword-stuffing", detail: `(${row.keywordDensity}%)` });
    }
  }

  if (row.isPost && row.monthsSinceUpdate !== null && row.monthsSinceUpdate >= STALE_MONTHS) {
    issues.push({ code: "stale", detail: `(${row.monthsSinceUpdate} months)` });
  }

  const isStart = ctx.startUrl ? urlKey(ctx.startUrl) === urlKey(row.finalUrl) : false;
  if (ctx.complete && row.inbound === 0 && !isStart) issues.push({ code: "orphan" });
  if (row.depth !== null && row.depth > DEEP_CLICKS) issues.push({ code: "deep-page", detail: `(${row.depth} clicks)` });
  if (row.brokenOutlinks.length) issues.push({ code: "broken-links", detail: `(${row.brokenOutlinks.length})` });

  if (row.brand?.bannedFound.length) issues.push({ code: "banned-phrase", detail: `("${row.brand.bannedFound.join('", "')}")` });
  if (row.brand?.requiredMissing.length) {
    issues.push({ code: "required-missing", detail: `("${row.brand.requiredMissing.join('", "')}")` });
  }
  if (ctx.brandName && !row.title.toLowerCase().includes(ctx.brandName.toLowerCase())) {
    issues.push({ code: "brand-not-in-title" });
  }

  if (row.loadTimeMs > SLOW_MS) issues.push({ code: "slow", detail: `(${(row.loadTimeMs / 1000).toFixed(1)}s)` });
  if (row.likelyNeedsJs) issues.push({ code: "needs-js" });
  if (row.redirectedFrom.length) issues.push({ code: "redirected", detail: `(${row.redirectedFrom.length})` });

  return issues;
}

export function sortIssues(issues: Issue[]): Issue[] {
  return [...issues].sort((a, b) => SEVERITY_ORDER[ISSUES[a.code].severity] - SEVERITY_ORDER[ISSUES[b.code].severity]);
}

export function issueText(issue: Issue): string {
  const label = ISSUES[issue.code].label;
  return issue.detail ? `${label} ${issue.detail}` : label;
}
