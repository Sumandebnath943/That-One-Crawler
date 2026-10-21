"use client";

import { useMemo, useState, type ReactNode } from "react";
import { downloadCsv } from "@/lib/client/csv";
import { toast } from "@/lib/client/quirks";
import { ISSUES, SEVERITY_ORDER, type IssueCode, type PageRow } from "@/lib/seo/issues";
import { verdictFor, type ReportSummary } from "@/lib/seo/report";
import { urlKey } from "@/lib/seo/url";
import { Mascot, type Mood } from "../Mascot";
import { COLUMN_GROUPS, COLUMNS, issueWeight, type ColumnGroup } from "./columns";

const PAGE_SIZE = 50;

export type IssueFilter = IssueCode | "@critical" | "@hidden" | "@redirects" | "@clean" | "";
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

function ScoreRing({ score, label, size = "lg" }: { score: number | null; label: string; size?: "lg" | "md" }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const value = score ?? 0;
  const tone = score === null ? "var(--ink-3)" : value >= 80 ? "var(--good)" : value >= 50 ? "var(--warn)" : "var(--crit)";
  return (
    <div className={`relative shrink-0 ${size === "lg" ? "size-28" : "size-24"}`}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
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
          <div className={`font-display leading-none font-extrabold tabular-nums ${size === "lg" ? "text-3xl" : "text-2xl"}`}>
            {score ?? "—"}
          </div>
          <div className="text-[10px] font-bold tracking-wider text-ink-3 uppercase">{label}</div>
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

const MOOD_WORDS: Record<Mood, string> = {
  cool: "impressed (sunglasses on)",
  happy: "pleased",
  smirk: "smug",
  meh: "unimpressed",
  shocked: "horrified",
};

/** How the crawler feels about your average score. */
export function moodFor(score: number | null): Mood {
  if (score === null) return "shocked";
  if (score >= 85) return "cool";
  if (score >= 70) return "happy";
  if (score >= 50) return "smirk";
  if (score >= 30) return "meh";
  return "shocked";
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
  const mood = moodFor(summary.avgScore);
  return (
    <div className="flex flex-col gap-5 rounded-2xl border-2 border-ink bg-card p-5 shadow-brutal sm:flex-row sm:items-center">
      <div className="flex gap-3">
        <ScoreRing score={summary.avgScore} label="SEO score" />
        <ScoreRing score={summary.avgAiScore} label="AI ready" size="md" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold tracking-wider text-ink-3 uppercase">{running ? "Verdict so far" : "The verdict"}</p>
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
      <Mascot pokeable mood={mood} title={`The crawler looks ${MOOD_WORDS[mood]}`} className="hidden size-24 shrink-0 sm:block" />
    </div>
  );
}

interface Card {
  filter: IssueFilter;
  label: string;
  count: (s: ReportSummary) => number;
  tone: "crit" | "warn" | "note";
}

const CARDS: Card[] = [
  { filter: "broken", label: "Broken pages", count: (s) => s.issueCounts.broken ?? 0, tone: "crit" },
  {
    filter: "@hidden",
    label: "Hidden from Google",
    count: (s) => (s.issueCounts.noindex ?? 0) + (s.issueCounts["robots-blocked"] ?? 0),
    tone: "crit",
  },
  { filter: "no-h1", label: "Missing H1", count: (s) => s.issueCounts["no-h1"] ?? 0, tone: "crit" },
  { filter: "broken-links", label: "Pages with broken links", count: (s) => s.issueCounts["broken-links"] ?? 0, tone: "warn" },
  { filter: "no-meta", label: "Missing meta desc", count: (s) => s.issueCounts["no-meta"] ?? 0, tone: "warn" },
  { filter: "thin", label: "Thin content", count: (s) => s.issueCounts.thin ?? 0, tone: "warn" },
  { filter: "duplicate-title", label: "Duplicate titles", count: (s) => s.issueCounts["duplicate-title"] ?? 0, tone: "warn" },
  { filter: "cannibalization", label: "Cannibalization", count: (s) => s.issueCounts.cannibalization ?? 0, tone: "warn" },
  { filter: "orphan", label: "Orphan pages", count: (s) => s.issueCounts.orphan ?? 0, tone: "warn" },
  { filter: "stale", label: "Stale posts", count: (s) => s.issueCounts.stale ?? 0, tone: "note" },
  { filter: "ai-readiness", label: "Weak AI readiness", count: (s) => s.issueCounts["ai-readiness"] ?? 0, tone: "note" },
  {
    filter: "@redirects",
    label: "Redirects",
    count: (s) => (s.issueCounts.redirected ?? 0) + (s.issueCounts["offsite-redirect"] ?? 0),
    tone: "note",
  },
];

const TONE_TEXT: Record<Card["tone"], string> = { crit: "text-crit", warn: "text-warn", note: "text-note" };

export function SummaryCards({
  summary,
  active,
  onPick,
}: {
  summary: ReportSummary;
  active: IssueFilter;
  onPick: (filter: IssueFilter) => void;
}) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {CARDS.map((card) => {
        const count = card.count(summary);
        const isActive = active === card.filter;
        return (
          <li key={card.label}>
            <button
              type="button"
              onClick={() => onPick(isActive ? "" : card.filter)}
              aria-pressed={isActive}
              className={`w-full rounded-xl border-2 p-3 text-left transition hover:-translate-y-0.5 ${isActive ? "border-ink bg-lime text-lime-ink shadow-brutal-sm" : "border-ink bg-card"}`}
            >
              <span className={`block font-display text-3xl font-extrabold tabular-nums ${isActive ? "" : count ? TONE_TEXT[card.tone] : "text-good"}`}>
                {count}
              </span>
              <span className="block text-sm font-semibold">{card.label}</span>
              <span className={`block text-xs ${isActive ? "" : "text-ink-3"}`}>
                {summary.total ? `${Math.round((count / summary.total) * 100)}% of pages` : "—"}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function PagesTable({
  rows,
  summary,
  domain,
  issueFilter,
  onIssueFilter,
  onOpen,
}: {
  rows: PageRow[];
  summary: ReportSummary;
  domain: string;
  issueFilter: IssueFilter;
  onIssueFilter: (filter: IssueFilter) => void;
  onOpen: (key: string) => void;
}) {
  const [filters, setFilters] = useState<Omit<Filters, "issue">>({ q: NO_FILTERS.q, words: NO_FILTERS.words });
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>({ key: "issues", dir: -1 });
  const [groupChoice, setGroupChoice] = useState<Partial<Record<ColumnGroup, boolean>>>({});
  const [page, setPage] = useState(0);

  const hasPagespeed = rows.some((r) => r.pagespeed);
  const groupOn = (group: ColumnGroup) => groupChoice[group] ?? (group === "pagespeed" ? hasPagespeed : group !== "social");
  const columns = COLUMNS.filter((c) => c.group === "core" || groupOn(c.group));

  const updateFilters = (patch: Partial<Filters>) => {
    if (patch.issue !== undefined) onIssueFilter(patch.issue);
    setFilters((f) => ({ q: patch.q ?? f.q, words: patch.words ?? f.words }));
    setPage(0);
  };

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return rows.filter(
      (row) =>
        matchesIssue(row, issueFilter) &&
        matchesWords(row, filters.words) &&
        (!q ||
          row.finalUrl.toLowerCase().includes(q) ||
          row.title.toLowerCase().includes(q) ||
          row.metaDescription.toLowerCase().includes(q) ||
          (row.primaryKeyword?.phrase.includes(q) ?? false)),
    );
  }, [rows, filters, issueFilter]);

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
  const filtering = filters.q || issueFilter || filters.words;

  const toggleSort = (key: string) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === "issues" ? -1 : 1 }));
    setPage(0);
  };

  return (
    <div className="rounded-2xl border-2 border-ink bg-card shadow-brutal">
      <div className="flex flex-col gap-3 border-b-2 border-ink p-3 lg:flex-row lg:items-center">
        <input
          type="search"
          value={filters.q}
          onChange={(e) => updateFilters({ q: e.target.value })}
          placeholder="Search URL, title, description or keyword…"
          aria-label="Search pages"
          className="h-10 min-w-0 flex-1 rounded-lg border-2 border-ink bg-paper px-3 text-sm placeholder:text-ink-3"
        />
        <div className="flex flex-wrap gap-2">
          <select
            value={issueFilter}
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
              onClick={() => updateFilters({ ...NO_FILTERS })}
              className="h-10 rounded-lg px-3 text-sm font-semibold underline underline-offset-4"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              downloadCsv(sorted, domain);
              toast("CSV downloaded. Spreadsheet crying session: ready.");
            }}
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
                <tr key={key} onClick={() => onOpen(key)} className="group cursor-pointer border-b border-line last:border-b-0 hover:bg-lime/25">
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
  );
}

export type ReportTab = "pages" | "links" | "keywords" | "changes" | "plan";

const REPORT_TABS: { id: ReportTab; label: string }[] = [
  { id: "pages", label: "Pages" },
  { id: "links", label: "Links" },
  { id: "keywords", label: "Keywords" },
  { id: "changes", label: "Changes" },
  { id: "plan", label: "✦ Action plan" },
];

/** Summary cards on top, then tabs. Clicking a card jumps to the filtered page list. */
export function Report({
  summary,
  renderTab,
}: {
  summary: ReportSummary;
  renderTab: (tab: ReportTab, issueFilter: IssueFilter, setIssueFilter: (f: IssueFilter) => void) => ReactNode;
}) {
  const [tab, setTab] = useState<ReportTab>("pages");
  const [issueFilter, setIssueFilter] = useState<IssueFilter>("");

  return (
    <div className="space-y-5">
      <SummaryCards
        summary={summary}
        active={issueFilter}
        onPick={(filter) => {
          setIssueFilter(filter);
          setTab("pages");
        }}
      />
      <div>
        <nav className="flex gap-1 overflow-x-auto" role="tablist" aria-label="Report sections">
          {REPORT_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`-mb-0.5 shrink-0 rounded-t-xl border-2 border-b-0 px-4 py-2 text-sm font-bold ${tab === t.id ? "border-ink bg-card" : "border-transparent text-ink-2 hover:text-ink"}`}
            >
              {t.label}
            </button>
          ))}
        </nav>
        {renderTab(tab, issueFilter, setIssueFilter)}
      </div>
    </div>
  );
}
