import { findIssues, hasContent, ISSUES, scorePage, sortIssues, type IssueCode, type PageRow } from "./issues";
import type { CrawledPage, RobotsRules, Severity } from "./types";

/** Score and flag every page, including cross-page checks like duplicate titles. */
export function buildRows(pages: CrawledPage[], robots?: RobotsRules | null): PageRow[] {
  const rows: PageRow[] = pages.map((page) => ({
    ...page,
    score: scorePage(page),
    issues: findIssues(page, robots),
    hasContent: hasContent(page),
  }));

  const titleCounts = countBy(rows, (r) => (r.hasContent ? r.title.trim().toLowerCase() : ""));
  const metaCounts = countBy(rows, (r) => (r.hasContent ? r.metaDescription.trim().toLowerCase() : ""));

  for (const row of rows) {
    if (!row.hasContent) continue;
    const titleKey = row.title.trim().toLowerCase();
    const metaKey = row.metaDescription.trim().toLowerCase();
    const titleDupes = titleKey ? titleCounts.get(titleKey) ?? 0 : 0;
    const metaDupes = metaKey ? metaCounts.get(metaKey) ?? 0 : 0;
    if (titleDupes > 1) row.issues.push({ code: "duplicate-title", detail: `(${titleDupes} pages)` });
    if (metaDupes > 1) row.issues.push({ code: "duplicate-meta", detail: `(${metaDupes} pages)` });
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
  issueCounts: Partial<Record<IssueCode, number>>;
  severityCounts: Record<Severity, number>;
  avgWords: number | null;
  avgLoadMs: number | null;
}

export function summarize(rows: PageRow[]): ReportSummary {
  const scored = rows.filter((r) => r.score !== null);
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
    avgScore: scored.length ? Math.round(scored.reduce((sum, r) => sum + (r.score ?? 0), 0) / scored.length) : null,
    issueCounts,
    severityCounts,
    avgWords: content.length ? Math.round(content.reduce((sum, r) => sum + r.wordCount, 0) / content.length) : null,
    avgLoadMs: content.length ? Math.round(content.reduce((sum, r) => sum + r.loadTimeMs, 0) / content.length) : null,
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
