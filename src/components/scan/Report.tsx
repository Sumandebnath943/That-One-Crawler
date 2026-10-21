"use client";

import { useMemo, useState } from "react";
import { downloadCsv } from "@/lib/client/csv";
import { ISSUES, SEVERITY_ORDER, type IssueCode, type PageRow } from "@/lib/seo/issues";
import { verdictFor, type ReportSummary } from "@/lib/seo/report";
import { urlKey } from "@/lib/seo/url";
import { COLUMN_GROUPS, COLUMNS, issueWeight, type ColumnGroup } from "./columns";

const PAGE_SIZE = 50;

type IssueFilter = IssueCode | "@critical" | "@hidden" | "@redirects" | "@clean" | "";
type WordFilter = "" | "low" | "medium" | "good";

interface Filters {
  q: string;
  issue: IssueFilter;
  words: WordFilter;
}

const NO_FILTERS: Filters = { q: "", issue: "", words: "" };

function matchesIssue(row: PageRow, filter: IssueFilter): boolean {
  if (!filter) return true;
  const codes = row.issues.map((i) => i.code);
  switch (filter) {
    case "@critical":
      return row.issues.some((i) => ISSUES[i.code].severity === "critical");
    case "@hidden":
      return codes.includes("noindex") || codes.includes("robots-blocked");
    case "@redirects":
      return codes.includes("redirected") || codes.includes("offsite-redirect");
    case "@clean":
      return row.issues.every((i) => ISSUES[i.code].severity === "notice");
    default:
      return codes.includes(filter);
  }
}

function matchesWords(row: PageRow, filter: WordFilter): boolean {
  if (!filter) return true;
  if (!row.hasContent) return false;
  if (filter === "low") return row.wordCount < 300;
  if (filter === "medium") return row.wordCount >= 300 && row.wordCount < 900;
  return row.wordCount >= 900;
}

function ScoreRing({ score }: { score: number | null }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const value = score ?? 0;
  const tone = score === null ? "var(--ink-3)" : value >= 80 ? "var(--good)" : value >= 50 ? "var(--warn)" : "var(--crit)";
  return (
    <div className="relative size-28 shrink-0">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--line)" strokeWidth="10" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={tone}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - value / 100)}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="font-display text-3xl leading-none font-extrabold tabular-nums">{score ?? "—"}</div>
          <div className="text-[10px] font-bold tracking-wider text-ink-3 uppercase">avg score</div>
        </div>
      </div>
    </div>
  );
}

function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export function Verdict({
  summary,
  running,
  method,
  durationMs,
}: {
  summary: ReportSummary;
  running: boolean;
  method: string | null;
  durationMs: number | null;
}) {
  const verdict = verdictFor(summary.avgScore);
  const { critical, warning, notice } = summary.severityCounts;
  return (
    <div className="flex flex-col gap-5 rounded-2xl border-2 border-ink bg-card p-5 shadow-brutal sm:flex-row sm:items-center">
      <ScoreRing score={summary.avgScore} />
      <div className="min-w-0">
        <p className="text-xs font-bold tracking-wider text-ink-3 uppercase">
          {running ? "Verdict so far" : "The verdict"}
        </p>
        <h2 className="font-display text-3xl font-extrabold tracking-tight text-balance">{verdict.headline}</h2>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2">
          <span>
            <b className="text-ink">{summary.total}</b> pages
          </span>
          <span>
            <b className="text-crit">{critical}</b> critical
          </span>
          <span>
            <b className="text-warn">{warning}</b> warnings
          </span>
          <span>
            <b className="text-note">{notice}</b> notices
          </span>
          {method && <span>via {method === "sitemap" ? "sitemap" : "link-following"}</span>}
          {durationMs !== null && <span>took {formatDuration(durationMs)}</span>}
        </p>
      </div>
    </div>
  );
}

const CARDS: { filter: IssueFilter; label: string; count: (s: ReportSummary) => number; tone: string }[] = [
  { filter: "broken", label: "Broken pages", count: (s) => s.issueCounts.broken ?? 0, tone: "crit" },
  {
    filter: "@hidden",
    label: "Hidden from Google",
    count: (s) => (s.issueCounts.noindex ?? 0) + (s.issueCounts["robots-blocked"] ?? 0),
    tone: "crit",
  },
  { filter: "no-h1", label: "Missing H1", count: (s) => s.issueCounts["no-h1"] ?? 0, tone: "crit" },
  { filter: "no-meta", label: "Missing meta desc", count: (s) => s.issueCounts["no-meta"] ?? 0, tone: "warn" },
  { filter: "thin", label: "Thin content", count: (s) => s.issueCounts.thin ?? 0, tone: "warn" },
  { filter: "duplicate-title", label: "Duplicate titles", count: (s) => s.issueCounts["duplicate-title"] ?? 0, tone: "warn" },
  { filter: "duplicate-meta", label: "Duplicate meta", count: (s) => s.issueCounts["duplicate-meta"] ?? 0, tone: "warn" },
  {
    filter: "@redirects",
    label: "Redirects",
    count: (s) => (s.issueCounts.redirected ?? 0) + (s.issueCounts["offsite-redirect"] ?? 0),
    tone: "note",
  },
];

const TONE_TEXT: Record<string, string> = { crit: "text-crit", warn: "text-warn", note: "text-note" };

export function Report({
  rows,
  summary,
  domain,
  onOpen,
}: {
  rows: PageRow[];
  summary: ReportSummary;
  domain: string;
  onOpen: (key: string) => void;
}) {
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>({ key: "issues", dir: -1 });
  const [groupChoice, setGroupChoice] = useState<Partial<Record<ColumnGroup, boolean>>>({});
  const [page, setPage] = useState(0);

  const hasPagespeed = rows.some((r) => r.pagespeed);
  const groupOn = (group: ColumnGroup) =>
    groupChoice[group] ?? (group === "pagespeed" ? hasPagespeed : group !== "social");
  const columns = COLUMNS.filter((c) => c.group === "core" || groupOn(c.group));

  const updateFilters = (patch: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(0);
  };

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return rows.filter(
      (row) =>
        matchesIssue(row, filters.issue) &&
        matchesWords(row, filters.words) &&
        (!q ||
          row.finalUrl.toLowerCase().includes(q) ||
          row.title.toLowerCase().includes(q) ||
          row.metaDescription.toLowerCase().includes(q)),
    );
  }, [rows, filters]);

  const sorted = useMemo(() => {
    const column = COLUMNS.find((c) => c.key === sort.key);
    const getter = column?.sort ?? issueWeight;
    return [...filtered].sort((a, b) => {
      const va = getter(a);
      const vb = getter(b);
      let cmp: number;
      if (va === vb) cmp = 0;
      else if (va === null) cmp = -1;
      else if (vb === null) cmp = 1;
      else if (typeof va === "number" && typeof vb === "number") cmp = va - vb;
      else cmp = String(va).localeCompare(String(vb));
      return cmp * sort.dir || a.finalUrl.localeCompare(b.finalUrl);
    });
  }, [filtered, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const visible = sorted.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);

  const issueOptions = (Object.keys(summary.issueCounts) as IssueCode[]).sort(
    (a, b) =>
      SEVERITY_ORDER[ISSUES[a].severity] - SEVERITY_ORDER[ISSUES[b].severity] ||
      (summary.issueCounts[b] ?? 0) - (summary.issueCounts[a] ?? 0),
  );
  const filtering = filters.q || filters.issue || filters.words;

  const toggleSort = (key: string) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === "issues" ? -1 : 1 }));
    setPage(0);
  };

  return (
    <div className="space-y-5">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {CARDS.map((card) => {
          const count = card.count(summary);
          const active = filters.issue === card.filter;
          return (
            <li key={card.label}>
              <button
                type="button"
                onClick={() => updateFilters({ issue: active ? "" : card.filter })}
                aria-pressed={active}
                className={`w-full rounded-xl border-2 p-3 text-left transition hover:-translate-y-0.5 ${active ? "border-ink bg-lime text-lime-ink shadow-brutal-sm" : "border-ink bg-card"}`}
              >
                <span
                  className={`block font-display text-3xl font-extrabold tabular-nums ${active ? "" : count ? TONE_TEXT[card.tone] : "text-good"}`}
                >
                  {count}
                </span>
                <span className="block text-sm font-semibold">{card.label}</span>
                <span className={`block text-xs ${active ? "" : "text-ink-3"}`}>
                  {summary.total ? `${Math.round((count / summary.total) * 100)}% of pages` : "—"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="rounded-2xl border-2 border-ink bg-card shadow-brutal">
        <div className="flex flex-col gap-3 border-b-2 border-ink p-3 lg:flex-row lg:items-center">
          <input
            type="search"
            value={filters.q}
            onChange={(e) => updateFilters({ q: e.target.value })}
            placeholder="Search URL, title or description…"
            aria-label="Search pages"
            className="h-10 min-w-0 flex-1 rounded-lg border-2 border-ink bg-paper px-3 text-sm placeholder:text-ink-3"
          />
          <div className="flex flex-wrap gap-2">
            <select
              value={filters.issue}
              onChange={(e) => updateFilters({ issue: e.target.value as IssueFilter })}
              aria-label="Filter by issue"
              className="h-10 max-w-60 rounded-lg border-2 border-ink bg-paper px-2 text-sm"
            >
              <option value="">All issues</option>
              <option value="@critical">Any critical issue</option>
              <option value="@clean">No critical or warning</option>
              <option value="@hidden">Hidden from Google</option>
              <option value="@redirects">Redirects</option>
              {issueOptions.map((code) => (
                <option key={code} value={code}>
                  {ISSUES[code].label} ({summary.issueCounts[code]})
                </option>
              ))}
            </select>
            <select
              value={filters.words}
              onChange={(e) => updateFilters({ words: e.target.value as WordFilter })}
              aria-label="Filter by word count"
              className="h-10 rounded-lg border-2 border-ink bg-paper px-2 text-sm"
            >
              <option value="">All word counts</option>
              <option value="low">Under 300 words</option>
              <option value="medium">300–900 words</option>
              <option value="good">900+ words</option>
            </select>
            {filtering && (
              <button
                type="button"
                onClick={() => updateFilters(NO_FILTERS)}
                className="h-10 rounded-lg px-3 text-sm font-semibold underline underline-offset-4"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={() => downloadCsv(sorted, domain)}
              disabled={!sorted.length}
              className="h-10 rounded-lg border-2 border-ink bg-lime px-3 text-sm font-bold text-lime-ink transition hover:-translate-y-0.5 hover:shadow-brutal-sm disabled:opacity-50"
            >
              Export CSV{filtering ? ` (${sorted.length})` : ""}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b-2 border-dashed border-line px-3 py-2 text-xs">
          <span className="font-semibold text-ink-3">Columns:</span>
          {COLUMN_GROUPS.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => setGroupChoice((g) => ({ ...g, [group.id]: !groupOn(group.id) }))}
              aria-pressed={groupOn(group.id)}
              className={`rounded-full border-2 px-2.5 py-0.5 font-semibold transition ${groupOn(group.id) ? "border-ink bg-ink text-paper" : "border-line text-ink-2 hover:border-ink"}`}
            >
              {group.label}
            </button>
          ))}
          <span className="ml-auto text-ink-3">
            {sorted.length === rows.length ? `${rows.length} pages` : `${sorted.length} of ${rows.length} pages`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-ink bg-sunk">
                {columns.map((column, i) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={`px-3 py-2 text-xs font-bold tracking-wide whitespace-nowrap text-ink-2 uppercase ${i === 0 ? "sticky left-0 z-10 bg-sunk" : ""}`}
                    aria-sort={sort.key === column.key ? (sort.dir === 1 ? "ascending" : "descending") : undefined}
                  >
                    {column.sort ? (
                      <button type="button" onClick={() => toggleSort(column.key)} className="flex items-center gap-1 uppercase hover:text-ink">
                        {column.label}
                        <span aria-hidden className={sort.key === column.key ? "text-ink" : "text-ink-3/50"}>
                          {sort.key === column.key ? (sort.dir === 1 ? "▲" : "▼") : "↕"}
                        </span>
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const key = urlKey(row.finalUrl);
                return (
                  <tr
                    key={key}
                    onClick={() => onOpen(key)}
                    className="group cursor-pointer border-b border-line last:border-b-0 hover:bg-lime/25"
                  >
                    {columns.map((column, i) => (
                      <td
                        key={column.key}
                        className={`px-3 py-2 align-middle ${i === 0 ? "sticky left-0 z-10 bg-card group-hover:bg-[color-mix(in_oklab,var(--lime)_25%,var(--paper-2))]" : ""}`}
                      >
                        {/* Widths live on a wrapper: browsers ignore min-width on table cells. */}
                        <div className={column.width}>
                          {i === 0 ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpen(key);
                              }}
                              className="block w-full text-left hover:underline"
                            >
                              {column.render(row)}
                            </button>
                          ) : (
                            column.render(row)
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })}
              {!visible.length && (
                <tr>
                  <td colSpan={columns.length} className="px-3 py-10 text-center text-ink-2">
                    {rows.length ? "No pages match those filters. Either your blog is great or the filters are too picky." : "No pages yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {pageCount > 1 && (
          <div className="flex items-center justify-between gap-3 border-t-2 border-ink px-3 py-2 text-sm">
            <button
              type="button"
              onClick={() => setPage(current - 1)}
              disabled={current === 0}
              className="rounded-lg border-2 border-ink px-3 py-1 font-semibold disabled:opacity-40"
            >
              ← Prev
            </button>
            <span className="text-ink-2">
              Page {current + 1} of {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage(current + 1)}
              disabled={current >= pageCount - 1}
              className="rounded-lg border-2 border-ink px-3 py-1 font-semibold disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
