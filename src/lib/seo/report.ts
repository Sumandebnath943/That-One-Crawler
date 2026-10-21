import {
  aiReadinessScore,
  findIssues,
  HEAVY_IMAGE_BYTES,
  hasContent,
  isNoindex,
  ISSUES,
  scorePage,
  sortIssues,
  type BrokenOutlink,
  type IssueCode,
  type PageRow,
  type RowContext,
} from "./issues";
import { assignPrimaryKeywords, keywordKey } from "./keywords";
import type { CrawledPage, LinkCheck, Severity } from "./types";
import { urlKey } from "./url";

const MONTH_MS = 30.44 * 24 * 60 * 60 * 1000;
const ARTICLE_TYPES = /^(Article|BlogPosting|NewsArticle|TechArticle|Report|ScholarlyArticle)$/;

export interface BuildContext extends RowContext {
  linkChecks?: Record<string, LinkCheck>;
}

function latestDate(...values: (string | undefined)[]): string | null {
  let best: number | null = null;
  for (const value of values) {
    const time = value ? Date.parse(value) : NaN;
    if (Number.isFinite(time) && (best === null || time > best)) best = time;
  }
  return best === null ? null : new Date(best).toISOString();
}

/** Score and flag every page, including everything that needs the whole site to judge. */
export function buildRows(pages: CrawledPage[], ctx: BuildContext = { asOf: Date.now(), complete: false }): PageRow[] {
  const checks = ctx.linkChecks ?? {};

  // Map every URL a page answers to (including URLs that redirected to it) back to the page.
  const byKey = new Map<string, CrawledPage>();
  for (const page of pages) {
    byKey.set(urlKey(page.finalUrl), page);
    for (const from of page.redirectedFrom) byKey.set(urlKey(from), page);
  }

  // Internal link graph: who links to whom.
  const linkedFrom = new Map<CrawledPage, Set<CrawledPage>>();
  const adjacency = new Map<CrawledPage, Set<CrawledPage>>();
  for (const page of pages) {
    if (!hasContent(page)) continue;
    const targets = new Set<CrawledPage>();
    for (const link of page.outlinksInternal) {
      const target = byKey.get(urlKey(link));
      if (!target || target === page) continue;
      targets.add(target);
      if (!linkedFrom.has(target)) linkedFrom.set(target, new Set());
      linkedFrom.get(target)!.add(page);
    }
    adjacency.set(page, targets);
  }

  // Click depth from the start page (breadth-first).
  const depth = new Map<CrawledPage, number>();
  const start = ctx.startUrl ? byKey.get(urlKey(ctx.startUrl)) : undefined;
  if (start) {
    depth.set(start, 0);
    const queue = [start];
    while (queue.length) {
      const current = queue.shift()!;
      for (const next of adjacency.get(current) ?? []) {
        if (depth.has(next)) continue;
        depth.set(next, depth.get(current)! + 1);
        queue.push(next);
      }
    }
  }

  const primaries = assignPrimaryKeywords(
    pages.filter(hasContent).map((page) => ({ key: urlKey(page.finalUrl), keywords: page.keywords })),
  );

  const rows: PageRow[] = pages.map((page) => {
    const content = hasContent(page);
    const key = urlKey(page.finalUrl);
    const primary = content ? primaries.get(key) ?? null : null;

    const brokenOutlinks: BrokenOutlink[] = [];
    if (content) {
      for (const link of page.outlinksInternal) {
        const target = byKey.get(urlKey(link));
        if (target && (target.status === 0 || target.status >= 400)) brokenOutlinks.push({ url: link, status: target.status });
        else if (!target && checks[link]?.state === "broken") brokenOutlinks.push({ url: link, status: checks[link].status });
      }
      for (const link of page.outlinksExternal) {
        if (checks[link]?.state === "broken") brokenOutlinks.push({ url: link, status: checks[link].status });
      }
    }

    const heavyImages = content
      ? page.imageSrcs
          .map((src) => ({ url: src, sizeBytes: checks[src]?.sizeBytes ?? 0 }))
          .filter((img) => img.sizeBytes > HEAVY_IMAGE_BYTES)
      : [];

    const isPost = Boolean(page.articleSchema) || page.schemaTypes.some((t) => ARTICLE_TYPES.test(t)) || Boolean(page.datePublished);
    const lastUpdated = latestDate(page.dateModified, page.sitemapLastmod) ?? latestDate(page.datePublished);
    const monthsSinceUpdate = lastUpdated ? Math.max(0, Math.floor((ctx.asOf - Date.parse(lastUpdated)) / MONTH_MS)) : null;

    const facts = {
      ...page,
      hasContent: content,
      primaryKeyword: primary,
      // Occurrences per 100 words, the way Yoast and most SEO tools measure keyphrase density.
      keywordDensity: primary && page.wordCount ? Math.round((primary.count / page.wordCount) * 1000) / 10 : null,
      inbound: linkedFrom.get(page)?.size ?? 0,
      depth: depth.get(page) ?? null,
      linkedFrom: [...(linkedFrom.get(page) ?? [])].slice(0, 20).map((p) => p.finalUrl),
      brokenOutlinks,
      heavyImages,
      lastUpdated,
      monthsSinceUpdate,
      isPost,
    };
    return { ...facts, score: scorePage(page), aiScore: aiReadinessScore(page), issues: findIssues(facts, ctx) };
  });

  // Cross-page checks: duplicate titles/descriptions and keyword cannibalization.
  const indexable = (row: PageRow) => row.hasContent && !isNoindex(row) && !row.issues.some((i) => i.code === "canonical-mismatch");
  const titleCounts = countBy(rows, (r) => (r.hasContent ? r.title.trim().toLowerCase() : ""));
  const metaCounts = countBy(rows, (r) => (r.hasContent ? r.metaDescription.trim().toLowerCase() : ""));
  const keywordCounts = countBy(rows, (r) => (indexable(r) && r.primaryKeyword ? keywordKey(r.primaryKeyword.phrase) : ""));

  for (const row of rows) {
    if (!row.hasContent) continue;
    const titleKey = row.title.trim().toLowerCase();
    const metaKey = row.metaDescription.trim().toLowerCase();
    const titleDupes = titleKey ? titleCounts.get(titleKey) ?? 0 : 0;
    const metaDupes = metaKey ? metaCounts.get(metaKey) ?? 0 : 0;
    if (titleDupes > 1) row.issues.push({ code: "duplicate-title", detail: `(${titleDupes} pages)` });
    if (metaDupes > 1) row.issues.push({ code: "duplicate-meta", detail: `(${metaDupes} pages)` });
    if (indexable(row) && row.primaryKeyword) {
      const competitors = keywordCounts.get(keywordKey(row.primaryKeyword.phrase)) ?? 0;
      if (competitors > 1) row.issues.push({ code: "cannibalization", detail: `("${row.primaryKeyword.phrase}" · ${competitors} pages)` });
    }
    row.issues = sortIssues(row.issues);
  }
  return rows;
}

function countBy<T>(items: T[], key: (item: T) => string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return counts;
}

export interface ReportSummary {
  total: number;
  withContent: number;
  avgScore: number | null;
  avgAiScore: number | null;
  issueCounts: Partial<Record<IssueCode, number>>;
  severityCounts: Record<Severity, number>;
  avgWords: number | null;
  avgLoadMs: number | null;
}

const average = (values: number[]) => (values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null);

export function summarize(rows: PageRow[]): ReportSummary {
  const content = rows.filter((r) => r.hasContent);
  const issueCounts: Partial<Record<IssueCode, number>> = {};
  const severityCounts: Record<Severity, number> = { critical: 0, warning: 0, notice: 0 };

  for (const row of rows) {
    for (const issue of row.issues) {
      issueCounts[issue.code] = (issueCounts[issue.code] ?? 0) + 1;
      severityCounts[ISSUES[issue.code].severity] += 1;
    }
  }

  return {
    total: rows.length,
    withContent: content.length,
    avgScore: average(rows.filter((r) => r.score !== null).map((r) => r.score!)),
    avgAiScore: average(rows.filter((r) => r.aiScore !== null).map((r) => r.aiScore!)),
    issueCounts,
    severityCounts,
    avgWords: average(content.map((r) => r.wordCount)),
    avgLoadMs: average(content.map((r) => r.loadTimeMs)),
  };
}

export interface BrokenTarget {
  url: string;
  status: number;
  internal: boolean;
  linkedFrom: string[];
}

/** Every broken link target, with the pages that link to it. */
export function brokenLinkReport(rows: PageRow[]): BrokenTarget[] {
  const targets = new Map<string, BrokenTarget>();
  for (const row of rows) {
    for (const link of row.brokenOutlinks) {
      const entry = targets.get(link.url) ?? {
        url: link.url,
        status: link.status,
        internal: row.outlinksInternal.includes(link.url),
        linkedFrom: [],
      };
      if (!entry.linkedFrom.includes(row.finalUrl)) entry.linkedFrom.push(row.finalUrl);
      targets.set(link.url, entry);
    }
  }
  return [...targets.values()].sort((a, b) => b.linkedFrom.length - a.linkedFrom.length);
}

export interface CannibalGroup {
  keyword: string;
  pages: PageRow[];
}

/** Groups of pages fighting over the same main keyword. */
export function cannibalizationReport(rows: PageRow[]): CannibalGroup[] {
  const groups = new Map<string, CannibalGroup>();
  for (const row of rows) {
    if (!row.issues.some((i) => i.code === "cannibalization") || !row.primaryKeyword) continue;
    const key = keywordKey(row.primaryKeyword.phrase);
    const group = groups.get(key) ?? { keyword: row.primaryKeyword.phrase, pages: [] };
    group.pages.push(row);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => b.pages.length - a.pages.length);
}

export interface ScanComparison {
  scoreDelta: number | null;
  aiDelta: number | null;
  fixed: { code: IssueCode; count: number }[];
  introduced: { code: IssueCode; count: number }[];
  fixedTotal: number;
  introducedTotal: number;
  newPages: string[];
  removedPages: string[];
  improved: { url: string; from: number; to: number }[];
  worsened: { url: string; from: number; to: number }[];
}

/** What changed between two scans of the same site. */
export function compareRows(previous: PageRow[], current: PageRow[]): ScanComparison {
  const before = new Map(previous.map((r) => [urlKey(r.finalUrl), r]));
  const after = new Map(current.map((r) => [urlKey(r.finalUrl), r]));
  const fixed = new Map<IssueCode, number>();
  const introduced = new Map<IssueCode, number>();
  const improved: ScanComparison["improved"] = [];
  const worsened: ScanComparison["worsened"] = [];

  for (const [key, now] of after) {
    const then = before.get(key);
    if (!then) continue;
    const thenCodes = new Set(then.issues.map((i) => i.code));
    const nowCodes = new Set(now.issues.map((i) => i.code));
    for (const code of thenCodes) if (!nowCodes.has(code)) fixed.set(code, (fixed.get(code) ?? 0) + 1);
    for (const code of nowCodes) if (!thenCodes.has(code)) introduced.set(code, (introduced.get(code) ?? 0) + 1);
    if (then.score !== null && now.score !== null && then.score !== now.score) {
      (now.score > then.score ? improved : worsened).push({ url: now.finalUrl, from: then.score, to: now.score });
    }
  }

  const sorted = (map: Map<IssueCode, number>) =>
    [...map.entries()].map(([code, count]) => ({ code, count })).sort((a, b) => b.count - a.count);
  const prevSummary = summarize(previous);
  const currSummary = summarize(current);
  const delta = (a: number | null, b: number | null) => (a === null || b === null ? null : b - a);

  return {
    scoreDelta: delta(prevSummary.avgScore, currSummary.avgScore),
    aiDelta: delta(prevSummary.avgAiScore, currSummary.avgAiScore),
    fixed: sorted(fixed),
    introduced: sorted(introduced),
    fixedTotal: [...fixed.values()].reduce((a, b) => a + b, 0),
    introducedTotal: [...introduced.values()].reduce((a, b) => a + b, 0),
    newPages: [...after.keys()].filter((k) => !before.has(k)).map((k) => after.get(k)!.finalUrl),
    removedPages: [...before.keys()].filter((k) => !after.has(k)).map((k) => before.get(k)!.finalUrl),
    improved: improved.sort((a, b) => b.to - b.from - (a.to - a.from)),
    worsened: worsened.sort((a, b) => a.to - a.from - (b.to - b.from)),
  };
}

export interface Verdict {
  headline: string;
  tone: "good" | "ok" | "bad";
}

export function verdictFor(score: number | null): Verdict {
  if (score === null) return { headline: "We couldn't score a single page. That's a verdict in itself.", tone: "bad" };
  if (score >= 85) return { headline: "Honestly? Annoyingly good.", tone: "good" };
  if (score >= 70) return { headline: "Solid. A few skeletons in the closet.", tone: "good" };
  if (score >= 50) return { headline: "B-minus energy. Very fixable, though.", tone: "ok" };
  if (score >= 30) return { headline: "Oof. We need to talk.", tone: "bad" };
  return { headline: "This is a cry for help.", tone: "bad" };
}
