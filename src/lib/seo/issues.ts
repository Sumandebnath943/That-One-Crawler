import { isAllowedByRobots } from "./robots";
import type { CrawledPage, RobotsRules, Severity } from "./types";
import { robotsPath, urlKey } from "./url";

export const TITLE_MIN = 30;
export const TITLE_MAX = 60;
export const META_MIN = 120;
export const META_MAX = 160;
export const THIN_WORDS = 300;
export const GOOD_WORDS = 900;
export const SLOW_MS = 3000;
export const WORDS_PER_MINUTE = 238;

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
  | "multiple-h1"
  | "no-canonical"
  | "no-og"
  | "no-schema"
  | "needs-js"
  | "redirected";

export interface IssueInfo {
  label: string;
  severity: Severity;
  why: string;
  fix: string;
}

export const ISSUES: Record<IssueCode, IssueInfo> = {
  broken: {
    label: "Broken page",
    severity: "critical",
    why: "Visitors and search engines hit a dead end here. Nothing ranks from a 404.",
    fix: "Restore the page, or 301-redirect it to the closest live page and update links pointing at it.",
  },
  "offsite-redirect": {
    label: "Redirects off-site",
    severity: "warning",
    why: "This URL sends people to a different website, so any ranking it had walks out the door with them.",
    fix: "Make sure the redirect is intentional. If the content moved, point the URL at its new home on your own site.",
  },
  noindex: {
    label: "Noindex",
    severity: "critical",
    why: "This page tells search engines not to index it. It won't show up in search results. At all.",
    fix: "If you want it found, remove noindex from the robots meta tag or X-Robots-Tag header.",
  },
  "robots-blocked": {
    label: "Blocked by robots.txt",
    severity: "critical",
    why: "robots.txt forbids crawlers from this URL, so search engines can't read what's on it.",
    fix: "Remove or narrow the Disallow rule in robots.txt if this page should be searchable.",
  },
  "no-title": {
    label: "Missing title",
    severity: "critical",
    why: "The title tag is the headline in search results. Without one, Google writes its own (badly).",
    fix: "Add a unique <title> of 30–60 characters that says what the page is about.",
  },
  "no-h1": {
    label: "Missing H1",
    severity: "critical",
    why: "The H1 is the page's main headline. Without it, the page is a mystery novel with no title.",
    fix: "Add exactly one H1 that matches the topic of the page.",
  },
  "title-short": {
    label: "Title too short",
    severity: "warning",
    why: "Short titles waste valuable search-result space and rarely say enough to earn the click.",
    fix: `Expand the title to ${TITLE_MIN}–${TITLE_MAX} characters with the main keyword and a reason to click.`,
  },
  "title-long": {
    label: "Title too long",
    severity: "warning",
    why: "Google cuts titles off around 60 characters, so the end of yours ends up as an ellipsis.",
    fix: `Trim the title to ${TITLE_MAX} characters or fewer and put the important words first.`,
  },
  "no-meta": {
    label: "Missing meta description",
    severity: "warning",
    why: "Without a meta description, search engines grab a random snippet from the page instead.",
    fix: `Write a ${META_MIN}–${META_MAX} character summary that makes people want to click.`,
  },
  thin: {
    label: "Thin content",
    severity: "warning",
    why: `Pages under ${THIN_WORDS} words rarely answer a search well enough to rank.`,
    fix: "Expand the page with genuinely useful detail, merge it into a stronger page, or noindex it.",
  },
  "canonical-mismatch": {
    label: "Canonical points elsewhere",
    severity: "warning",
    why: "The canonical tag tells Google another URL is the 'real' version of this page, so this one may not rank.",
    fix: "If this page is the original, make its canonical point to itself.",
  },
  "missing-alt": {
    label: "Images missing alt text",
    severity: "warning",
    why: "Alt text describes images to screen readers and image search. Missing alt is both an SEO and accessibility gap.",
    fix: 'Add a short, descriptive alt attribute to each meaningful image (alt="" is fine for purely decorative ones).',
  },
  "duplicate-title": {
    label: "Duplicate title",
    severity: "warning",
    why: "Several pages share this exact title, so search engines can't tell your children apart.",
    fix: "Give every page its own title that describes what makes it different.",
  },
  "duplicate-meta": {
    label: "Duplicate meta description",
    severity: "warning",
    why: "The same meta description appears on multiple pages, which makes them look interchangeable in results.",
    fix: "Write a unique description for each page.",
  },
  slow: {
    label: "Slow response",
    severity: "warning",
    why: `The page took over ${SLOW_MS / 1000} seconds to download. Slow pages lose visitors and rankings.`,
    fix: "Check hosting, caching and page weight. Run PageSpeed for a detailed breakdown.",
  },
  "meta-short": {
    label: "Meta description too short",
    severity: "notice",
    why: "A short description leaves search-result space unused.",
    fix: `Aim for ${META_MIN}–${META_MAX} characters.`,
  },
  "meta-long": {
    label: "Meta description too long",
    severity: "notice",
    why: `Descriptions longer than about ${META_MAX} characters get truncated in results.`,
    fix: `Tighten it to ${META_MAX} characters or fewer.`,
  },
  "multiple-h1": {
    label: "Multiple H1s",
    severity: "notice",
    why: "More than one H1 muddies what the page's main topic is.",
    fix: "Keep one H1 and demote the others to H2.",
  },
  "no-canonical": {
    label: "No canonical tag",
    severity: "notice",
    why: "A self-referencing canonical protects you from duplicate versions of the URL (tracking params, http/https…).",
    fix: 'Add <link rel="canonical" href="…"> pointing at this page\'s preferred URL.',
  },
  "no-og": {
    label: "No Open Graph tags",
    severity: "notice",
    why: "Without og:title and friends, shared links look like ransom notes on social media.",
    fix: "Add og:title, og:description and og:image tags.",
  },
  "no-schema": {
    label: "No structured data",
    severity: "notice",
    why: "Structured data (JSON-LD) helps search engines understand the page and can unlock rich results.",
    fix: "Add Article or BlogPosting JSON-LD with headline, author and datePublished.",
  },
  "needs-js": {
    label: "May need JavaScript",
    severity: "notice",
    why: "The raw HTML has almost no content, which usually means it's rendered by JavaScript. Some crawlers won't wait for it.",
    fix: "Use server-side rendering or static generation so the content is in the initial HTML.",
  },
  redirected: {
    label: "Reached via redirect",
    severity: "notice",
    why: "Some URLs in your sitemap or links redirect here. Every redirect is an extra hop for users and crawlers.",
    fix: "Update the sitemap and internal links to point straight at the final URL.",
  },
};

export const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, warning: 1, notice: 2 };

export interface Issue {
  code: IssueCode;
  /** Extra context such as "(404)" or "(94 chars)". */
  detail?: string;
}

export interface PageRow extends CrawledPage {
  /** 0–100, or null for pages with no content to score (broken, off-site redirects). */
  score: number | null;
  issues: Issue[];
  hasContent: boolean;
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

export function canonicalMatches(page: CrawledPage): boolean | null {
  if (!page.canonicalUrl) return null;
  return urlKey(page.canonicalUrl) === urlKey(page.finalUrl);
}

export function findIssues(page: CrawledPage, robots?: RobotsRules | null): Issue[] {
  const issues: Issue[] = [];

  if (page.status === 0 || page.status >= 400) {
    issues.push({ code: "broken", detail: page.status ? `(${page.status})` : page.error ? `(${page.error})` : "" });
    return issues;
  }
  if (page.offsiteRedirect) {
    issues.push({ code: "offsite-redirect", detail: `→ ${page.offsiteRedirect}` });
    return issues;
  }

  if (robots && !isAllowedByRobots(robots, robotsPath(page.finalUrl))) issues.push({ code: "robots-blocked" });
  if (isNoindex(page)) issues.push({ code: "noindex" });

  const titleLength = page.title.length;
  if (!titleLength) issues.push({ code: "no-title" });
  else if (titleLength < TITLE_MIN) issues.push({ code: "title-short", detail: `(${titleLength} chars)` });
  else if (titleLength > TITLE_MAX) issues.push({ code: "title-long", detail: `(${titleLength} chars)` });

  if (page.h1Count === 0) issues.push({ code: "no-h1" });
  else if (page.h1Count > 1) issues.push({ code: "multiple-h1", detail: `(${page.h1Count})` });

  const metaLength = page.metaDescription.length;
  if (!metaLength) issues.push({ code: "no-meta" });
  else if (metaLength < META_MIN) issues.push({ code: "meta-short", detail: `(${metaLength} chars)` });
  else if (metaLength > META_MAX) issues.push({ code: "meta-long", detail: `(${metaLength} chars)` });

  if (page.wordCount < THIN_WORDS) issues.push({ code: "thin", detail: `(${page.wordCount} words)` });

  if (!page.canonicalUrl) issues.push({ code: "no-canonical" });
  else if (canonicalMatches(page) === false) issues.push({ code: "canonical-mismatch" });

  if (page.imagesMissingAlt > 0) issues.push({ code: "missing-alt", detail: `(${page.imagesMissingAlt})` });
  if (!page.ogTitle) issues.push({ code: "no-og" });
  if (!page.schemaTypes.length) issues.push({ code: "no-schema" });
  if (page.loadTimeMs > SLOW_MS) issues.push({ code: "slow", detail: `(${(page.loadTimeMs / 1000).toFixed(1)}s)` });
  if (page.likelyNeedsJs) issues.push({ code: "needs-js" });
  if (page.redirectedFrom.length) issues.push({ code: "redirected", detail: `(${page.redirectedFrom.length})` });

  return issues;
}

export function sortIssues(issues: Issue[]): Issue[] {
  return [...issues].sort((a, b) => SEVERITY_ORDER[ISSUES[a.code].severity] - SEVERITY_ORDER[ISSUES[b.code].severity]);
}

export function issueText(issue: Issue): string {
  const label = ISSUES[issue.code].label;
  return issue.detail ? `${label} ${issue.detail}` : label;
}
