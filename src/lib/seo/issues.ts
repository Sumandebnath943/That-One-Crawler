import { isUtilityPage } from "./keywords";
import { TITLE_MAX_PX, titleWidth } from "./pixels";
import { isAllowedByRobots } from "./robots";
import type { CrawledPage, KeywordCandidate, RobotsRules, Severity } from "./types";
import { robotsPath, urlKey } from "./url";

export const TITLE_MIN = 30;
export const TITLE_MAX = 60;
export { TITLE_MAX_PX };
export const META_MIN = 120;
export const META_MAX = 160;
export const THIN_WORDS = 300;
export const GOOD_WORDS = 900;
/** web.dev calls a time to first byte over 1.8 seconds poor. */
export const SLOW_TTFB_MS = 1800;
/** Scans saved before we measured TTFB only have the full download time. */
export const SLOW_MS = 3000;
export const WORDS_PER_MINUTE = 238;
export const STALE_MONTHS = 12;
export const DEEP_CLICKS = 4;
export const HEAVY_IMAGE_BYTES = 300_000;
export const STUFFING_DENSITY = 3;
/** Long enough to count as an article for the AI-readiness checks that only articles need. */
export const ARTICLE_WORDS = 600;

export type IssueCode =
  | "broken"
  | "soft-404"
  | "offsite-redirect"
  | "meta-refresh"
  | "noindex"
  | "robots-blocked"
  | "multiple-canonicals"
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
  | "ai-instructions"
  | "keyword-not-in-title"
  | "keyword-placement"
  | "keyword-stuffing"
  | "cannibalization"
  | "stale"
  | "orphan"
  | "deep-page"
  | "broken-links"
  | "vague-link-text"
  | "heavy-images"
  | "image-dimensions"
  | "mixed-content"
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
  | "Security"
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
  "soft-404": {
    label: "Soft 404",
    severity: "critical",
    category: "Indexing",
    why: "The page says it doesn't exist (\"Page not found\") but answers 200 OK. Search engines and AI agents are told it's a real page, so the error page can be indexed and the real problem stays hidden.",
    fix: "Return a real 404 (or 410) status for missing pages, or 301-redirect the URL to the right page.",
  },
  "offsite-redirect": {
    label: "Redirects off-site",
    severity: "warning",
    category: "Indexing",
    why: "This URL sends people to a different website, so any ranking it had walks out the door with them.",
    fix: "Make sure the redirect is intentional. If the content moved, point the URL at its new home on your own site.",
  },
  "meta-refresh": {
    label: "Meta refresh redirect",
    severity: "notice",
    category: "Indexing",
    why: "The page uses <meta http-equiv=\"refresh\"> to send visitors elsewhere. It's slower than a real redirect, some crawlers and AI agents don't follow it, and a delayed refresh confuses people.",
    fix: "Replace it with a server-side 301 redirect, or remove it if the page should stay put.",
  },
  "multiple-canonicals": {
    label: "Conflicting canonicals",
    severity: "warning",
    category: "Indexing",
    why: "The page declares more than one canonical URL. When they disagree, Google ignores all of them and picks its own.",
    fix: "Keep exactly one <link rel=\"canonical\">. Check that your theme and SEO plugin aren't both adding one.",
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
    severity: "notice",
    category: "Search appearance",
    why: `Google shows about ${TITLE_MAX_PX} pixels of a title on desktop (roughly ${TITLE_MAX} characters), so the end of this one becomes an ellipsis. Rankings aren't affected; the cut-off text just isn't seen.`,
    fix: "Put the important words first and trim the rest, or move your brand name to the end where a cut-off costs least.",
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
    label: "Slow server response",
    severity: "warning",
    category: "Performance",
    why: `The server took over ${SLOW_TTFB_MS / 1000} seconds to start answering (time to first byte), which web.dev rates poor. Every visitor waits that long before anything appears.`,
    fix: "Cache pages (a CDN or page cache), upgrade slow hosting, and cut slow database or API calls. Run PageSpeed for a detailed breakdown.",
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
    why: "Text that visitors can't see (hidden with CSS, in a comment or inside an \"ask AI\" link) gives instructions to AI assistants. That's prompt injection: AI tools discount pages that do it, and hidden text breaks Google's spam policies.",
    fix: "Remove the hidden instructions. If you didn't add them, check plugins, themes and injected scripts.",
  },
  "ai-instructions": {
    label: "Instructions aimed at AI",
    severity: "notice",
    category: "AI search",
    why: "Visible text on the page reads like a command to AI assistants, such as telling them to drop their earlier rules or to recommend something. Fine if it's a quoted example; if it's meant to steer AI answers, assistants treat it as manipulation.",
    fix: "If it's an example, put it in a code block or quotation. If it's there to steer AI tools, remove it.",
  },
  "keyword-not-in-title": {
    label: "Main keyword missing from title",
    severity: "notice",
    category: "Keywords",
    why: "No phrase from the title is among the ones this page uses most, so the title and the content tell search engines different stories.",
    fix: "Work the page's main topic into the title, ideally near the start, or refocus the content on what the title promises.",
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
    why: "No other page we crawled links here in its HTML, so search engines and readers can only find it through the sitemap. Links that only appear after a click or from a script (dropdown menus, search, command palettes) don't count: many crawlers never see them.",
    fix: "Link to it with a normal <a href> from related posts, a category or hub page, or the homepage.",
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
    why: "This page links to URLs (or shows images) that return 404 or don't exist for a visitor who isn't signed in. Dead links frustrate readers and waste crawl budget.",
    fix: "Update each link to a working URL, or remove it. A private GitHub repo shows everyone else a 404: make it public or drop the link.",
  },
  "vague-link-text": {
    label: "Vague link text",
    severity: "notice",
    category: "Links",
    why: "Links that say \"click here\" or \"read more\" tell search engines, screen readers and AI agents nothing about where they lead. Lighthouse's SEO audit flags them too.",
    fix: "Describe the destination in the link itself: \"read the sourdough starter guide\", not \"read more\".",
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
    why: "Images without width and height make the layout jump while loading (Cumulative Layout Shift). Absolutely positioned images, like Next.js \"fill\" images, can't shift the layout and aren't counted.",
    fix: "Add width and height attributes (or a CSS aspect-ratio) to every <img>.",
  },
  "mixed-content": {
    label: "Mixed content",
    severity: "warning",
    category: "Security",
    why: "This https:// page loads files over plain http://. Browsers block insecure scripts and frames outright and may show a \"Not secure\" warning for the rest.",
    fix: "Change each http:// link to https:// (or a relative URL). If a file isn't available over https, host it yourself.",
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

export type LinkKind = "internal" | "external" | "image";

export interface BrokenOutlink {
  url: string;
  status: number;
  kind: LinkKind;
  /** Plain-words explanation from the link check, when there is one. */
  note?: string;
}

export interface PageRow extends CrawledPage {
  /** 0–100 (broken pages score 0), or null for off-site redirects and non-HTML responses. */
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

/** What each finding costs a page's SEO score. Notices are polish, so together they cost at most 10. */
export const SCORE_PENALTY: Record<Severity, number> = { critical: 30, warning: 10, notice: 2 };
export const NOTICE_PENALTY_CAP = 10;
/** Your own house rules and AI-search structure have their own places; they don't move the SEO score. */
const UNSCORED_CATEGORIES: IssueCategory[] = ["Brand rules"];
const UNSCORED_CODES: IssueCode[] = ["ai-readiness", "faq-no-schema", "ai-instructions"];

export function countsTowardScore(code: IssueCode): boolean {
  return !UNSCORED_CATEGORIES.includes(ISSUES[code].category) && !UNSCORED_CODES.includes(code);
}

/**
 * The SEO score: start at 100 and take off points for every problem we found, by severity. So the
 * number always tracks the issue list (a page with no issues scores 100), and broken pages score 0.
 */
export function scoreFromIssues(page: CrawledPage, issues: Issue[]): number | null {
  if (page.status === 0 || page.status >= 400 || issues.some((i) => i.code === "soft-404")) return 0;
  if (!hasContent(page)) return null;
  let penalty = 0;
  let notices = 0;
  for (const issue of issues) {
    if (!countsTowardScore(issue.code)) continue;
    const severity = ISSUES[issue.code].severity;
    if (severity === "notice") notices += SCORE_PENALTY.notice;
    else penalty += SCORE_PENALTY[severity];
  }
  return Math.max(0, 100 - penalty - Math.min(NOTICE_PENALTY_CAP, notices));
}

export interface AiReadinessCheck {
  label: string;
  points: number;
  earned: number;
  tip: string;
  /** False when the check doesn't fit this kind of page (an FAQ on a contact page, say), so it's left out of the score. */
  applies: boolean;
}

/** Posts and long-form pages, where question headings, an FAQ and a byline are expected. */
export function isArticle(page: CrawledPage): boolean {
  return Boolean(page.articleSchema || page.datePublished) || page.wordCount >= ARTICLE_WORDS;
}

/** The GEO/AEO checklist behind the AI-readiness score. Each item is something answer engines reward. */
export function aiReadinessChecks(page: CrawledPage): AiReadinessCheck[] {
  const geo = page.geo;
  const article = isArticle(page);
  const questionShare = geo.subheadings ? geo.questionHeadings / geo.subheadings : 0;
  return [
    {
      label: "Short answer up top",
      points: 20,
      earned: geo.introWords >= 20 && geo.introWords <= 80 ? 20 : geo.introWords > 0 ? 8 : 0,
      tip: "Open with a 40–60 word paragraph that directly answers the page's main question (or says what this page is).",
      applies: true,
    },
    {
      label: "Answer paragraphs under headings",
      points: 20,
      earned: geo.answerCapsules >= 2 ? 20 : geo.answerCapsules === 1 ? 10 : 0,
      tip: "Follow each heading with a self-contained 30–80 word answer before going deeper.",
      applies: geo.subheadings >= 2,
    },
    {
      label: "Question-style headings",
      points: 15,
      earned: questionShare >= 0.25 ? 15 : geo.questionHeadings > 0 ? 8 : 0,
      tip: "Phrase some H2s and H3s the way people ask: “How do I…?”, “What is…?”.",
      applies: article && geo.subheadings >= 2,
    },
    {
      label: "FAQ section",
      points: 15,
      earned: geo.hasFaqSection || page.hasFaqSchema ? 15 : 0,
      tip: "Add a short FAQ with the questions readers actually ask (and FAQPage markup).",
      applies: article,
    },
    {
      label: "Specific facts and numbers",
      points: 10,
      earned: geo.figures >= 3 ? 10 : geo.figures > 0 ? 5 : 0,
      tip: "Replace vague claims with specific figures, dates and named sources.",
      applies: page.wordCount >= THIN_WORDS,
    },
    {
      label: "Lists or tables",
      points: 10,
      earned: geo.lists + geo.tables > 0 ? 10 : 0,
      tip: "Use bullet lists for steps and options, tables for comparisons.",
      applies: page.wordCount >= THIN_WORDS,
    },
    {
      label: "Clear author and date",
      points: 10,
      earned: (page.author ? 5 : 0) + (page.datePublished || page.dateModified ? 5 : 0),
      tip: "Show who wrote it and when it was last updated, on the page and in the markup.",
      applies: article,
    },
  ];
}

/** Share of the applicable checklist points the page earns, out of 100. */
export function aiReadinessScore(page: CrawledPage): number | null {
  if (!hasContent(page)) return null;
  const checks = aiReadinessChecks(page).filter((c) => c.applies);
  const possible = checks.reduce((sum, c) => sum + c.points, 0);
  if (!possible) return null;
  return Math.round((checks.reduce((sum, c) => sum + c.earned, 0) / possible) * 100);
}

/** "Page not found" pages that answer 200 OK. */
export function looksLikeSoft404(page: CrawledPage): boolean {
  if (page.status !== 200 || page.wordCount >= 400) return false;
  const pattern = /^(?:\W*404\b|error 404|page not found|not found\b|oops\b|this page (?:doesn[’']t|does not|could not|can[’']t)|the page you (?:requested|were looking for))/i;
  return pattern.test(page.title.trim()) || pattern.test((page.h1[0] ?? "").trim());
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
  if (looksLikeSoft404(row)) {
    issues.push({ code: "soft-404", detail: `("${(row.title || row.h1[0] || "").slice(0, 40)}")` });
    return issues;
  }

  if (ctx.robots && !isAllowedByRobots(ctx.robots, robotsPath(row.finalUrl))) issues.push({ code: "robots-blocked" });
  if (isNoindex(row)) issues.push({ code: "noindex" });
  if (row.metaRefresh) issues.push({ code: "meta-refresh", detail: `(${row.metaRefresh.slice(0, 60)})` });
  if (row.canonicalCount > 1) issues.push({ code: "multiple-canonicals", detail: `(${row.canonicalCount})` });

  const titleLength = row.title.length;
  const titlePx = titleWidth(row.title);
  if (!titleLength) issues.push({ code: "no-title" });
  else if (titleLength < TITLE_MIN) issues.push({ code: "title-short", detail: `(${titleLength} chars)` });
  else if (titlePx > TITLE_MAX_PX) issues.push({ code: "title-long", detail: `(${titleLength} chars, ~${titlePx}px)` });

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
  if (row.insecureResources.length) issues.push({ code: "mixed-content", detail: `(${row.insecureResources.length})` });
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
  if (row.hiddenInstructions.length) issues.push({ code: "ai-injection", detail: `("${row.hiddenInstructions[0].slice(0, 60)}")` });
  if (row.injectionSignals.length) issues.push({ code: "ai-instructions", detail: `("${row.injectionSignals[0].slice(0, 60)}")` });

  // Contact, legal and similar pages aren't written to rank for a topic, so keyword advice doesn't apply.
  const keyword = isUtilityPage(row.finalUrl) ? null : row.primaryKeyword;
  if (keyword) {
    if (!keyword.title) issues.push({ code: "keyword-not-in-title", detail: `("${keyword.phrase}")` });
    const missing: string[] = [];
    if (row.h1Count > 0 && !keyword.h1) missing.push("H1");
    if (row.metaDescription && !keyword.meta) missing.push("description");
    if (!keyword.intro) missing.push("intro");
    // The keyword is our reading of the page, not one you chose, so one missing spot isn't worth a flag.
    if (missing.length >= 2) issues.push({ code: "keyword-placement", detail: `(not in ${missing.join(", ")})` });
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
  if (row.vagueLinkCount > 0) {
    issues.push({ code: "vague-link-text", detail: `(${row.vagueLinkCount}: "${row.vagueLinks.slice(0, 2).join('", "')}")` });
  }

  if (row.brand?.bannedFound.length) issues.push({ code: "banned-phrase", detail: `("${row.brand.bannedFound.join('", "')}")` });
  if (row.brand?.requiredMissing.length) {
    issues.push({ code: "required-missing", detail: `("${row.brand.requiredMissing.join('", "')}")` });
  }
  if (ctx.brandName && !row.title.toLowerCase().includes(ctx.brandName.toLowerCase())) {
    issues.push({ code: "brand-not-in-title" });
  }

  if (row.ttfbMs ? row.ttfbMs > SLOW_TTFB_MS : row.loadTimeMs > SLOW_MS) {
    issues.push({ code: "slow", detail: `(${((row.ttfbMs || row.loadTimeMs) / 1000).toFixed(1)}s${row.ttfbMs ? " to first byte" : ""})` });
  }
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
