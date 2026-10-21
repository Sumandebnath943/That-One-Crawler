"use client";

import { useMemo, useState, type ReactNode } from "react";
import { downloadCsv } from "@/lib/client/csv";
import { toast } from "@/lib/client/quirks";
import { ISSUES, SEVERITY_ORDER, type IssueCode, type PageRow } from "@/lib/seo/issues";
import { verdictFor, type ReportSummary } from "@/lib/seo/report";
import { urlKey } from "@/lib/seo/url";
import { Mascot, type Mood } from "../Mascot";
import { ScoreRing } from "./bits";
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
  const chips: [string, number, string][] = [
    ["critical", critical, "bg-crit"],
    [warning === 1 ? "warning" : "warnings", warning, "bg-warn"],
    [notice === 1 ? "notice" : "notices", notice, "bg-note"],
  ];
  return (
    <section className="grid gap-6 rounded-2xl border-2 border-ink bg-card p-5 shadow-brutal sm:p-6 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center md:gap-8">
      <div className="flex justify-center gap-6 sm:gap-8">
        <ScoreRing score={summary.avgScore} label="SEO score" kind="seo" />
        <ScoreRing score={summary.avgAiScore} label="AI readiness" kind="ai" />
      </div>
      <div className="min-w-0 text-center md:text-left">
        <p className="text-xs font-bold tracking-wider text-ink-3 uppercase">{running ? "Verdict so far" : "The verdict"}</p>
        <h2 className="mt-1 font-display text-3xl leading-tight font-extrabold tracking-tight text-balance sm:text-4xl">{verdict.headline}</h2>
        <div className="mt-4 flex flex-wrap justify-center gap-2 md:justify-start">
          <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-paper px-3 py-1 text-sm">
            <b className="tabular-nums">{summary.total}</b> {summary.total === 1 ? "page" : "pages"}
          </span>
          {chips.map(([label, count, dot]) => (
            <span key={label} className="inline-flex items-center gap-1.5 rounded-full border-2 border-line bg-paper px-3 py-1 text-sm">
              <span aria-hidden className={`size-2 rounded-full ${count ? dot : "bg-line"}`} />
              <b className="tabular-nums">{count}</b> {label}
            </span>
          ))}
        </div>
        <p className="mt-3 text-sm text-ink-3">
          {[
            method && `Found via ${method === "sitemap" ? "your sitemap" : "following links"}`,
            durationMs !== null && `took ${formatDuration(durationMs)}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      <div className="hidden shrink-0 lg:block">
        <Mascot pokeable mood={mood} title={`The crawler looks ${MOOD_WORDS[mood]}`} className="size-24" />
      </div>
    </section>
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
const TONE_BG: Record<Card["tone"], string> = { crit: "bg-crit", warn: "bg-warn", note: "bg-note" };

const GROUPS: { tone: Card["tone"]; severity: keyof ReportSummary["severityCounts"]; label: string; hint: string }[] = [
  { tone: "crit", severity: "critical", label: "Critical", hint: "Fix these first" },
  { tone: "warn", severity: "warning", label: "Warnings", hint: "Fix these soon" },
  { tone: "note", severity: "notice", label: "Notices", hint: "Nice to fix" },
];

/**
 * The headline problems grouped by severity. Each row shows how many pages have it (and what share
 * of the site that is); clicking one filters the page list.
 */
export function IssueOverview({
  summary,
  active,
  onPick,
}: {
  summary: ReportSummary;
  active: IssueFilter;
  onPick: (filter: IssueFilter) => void;
}) {
  return (
    <section aria-label="Issue overview" className="grid items-start gap-4 md:grid-cols-3">
      {GROUPS.map((group) => {
        const total = summary.severityCounts[group.severity];
        return (
          <div key={group.tone} className="rounded-2xl border-2 border-ink bg-card">
            <div className="flex items-center justify-between gap-2 border-b-2 border-ink px-4 py-3">
              <span className="flex items-center gap-2">
                <span aria-hidden className={`size-3 rounded-full border-2 border-ink ${TONE_BG[group.tone]}`} />
                <span className="font-display text-lg font-extrabold">{group.label}</span>
              </span>
              <span className="text-xs text-ink-3">
                {total ? `${total} ${total === 1 ? "issue" : "issues"} · ${group.hint.toLowerCase()}` : "None found"}
              </span>
            </div>
            <ul className="p-1.5">
              {CARDS.filter((card) => card.tone === group.tone).map((card) => {
                const count = card.count(summary);
                const share = summary.total ? Math.round((count / summary.total) * 100) : 0;
                const isActive = active === card.filter;
                return (
                  <li key={card.label}>
                    <button
                      type="button"
                      onClick={() => onPick(isActive ? "" : card.filter)}
                      aria-pressed={isActive}
                      title={count ? `${count} of ${summary.total} pages (${share}%)` : "No pages"}
                      className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition ${isActive ? "bg-lime text-lime-ink" : "hover:bg-sunk"}`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className={`block text-sm font-semibold ${count || isActive ? "" : "text-ink-3"}`}>{card.label}</span>
                        {count > 0 && (
                          <span className="mt-1 flex items-center gap-2 text-[11px] text-ink-3">
                            <span className="block h-1.5 flex-1 overflow-hidden rounded-full bg-sunk">
                              <span className={`block h-full rounded-full ${TONE_BG[card.tone]}`} style={{ width: `${Math.max(4, share)}%` }} />
                            </span>
                            {share}%
                          </span>
                        )}
                      </span>
                      <span
                        className={`w-10 shrink-0 text-right font-display text-xl font-extrabold tabular-nums ${isActive ? "" : count ? TONE_TEXT[card.tone] : "text-good"}`}
                      >
                        {count || "✓"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </section>
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

/** Issue overview on top, then tabs. Clicking an issue jumps to the filtered page list. */
export function Report({
  summary,
  counts = {},
  renderTab,
}: {
  summary: ReportSummary;
  /** Badges on the tabs, e.g. how many broken links the Links tab holds. */
  counts?: Partial<Record<ReportTab, { value: number; tone?: "crit" | "warn" }>>;
  renderTab: (tab: ReportTab, issueFilter: IssueFilter, setIssueFilter: (f: IssueFilter) => void) => ReactNode;
}) {
  const [tab, setTab] = useState<ReportTab>("pages");
  const [issueFilter, setIssueFilter] = useState<IssueFilter>("");

  return (
    <div className="space-y-5">
      <IssueOverview
        summary={summary}
        active={issueFilter}
        onPick={(filter) => {
          setIssueFilter(filter);
          setTab("pages");
        }}
      />
      <div className="space-y-3">
        <div
          role="tablist"
          aria-label="Report sections"
          className="flex gap-1 overflow-x-auto overflow-y-hidden rounded-2xl border-2 border-ink bg-card p-1 [scrollbar-width:none]"
        >
          {REPORT_TABS.map((t) => {
            const count = counts[t.id];
            const selected = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setTab(t.id)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${selected ? "bg-ink text-paper" : "text-ink-2 hover:bg-sunk hover:text-ink"}`}
              >
                {t.label}
                {count && (
                  <span
                    className={`rounded-full px-1.5 text-xs tabular-nums ${
                      count.value && count.tone === "crit"
                        ? "bg-crit text-paper"
                        : count.value && count.tone === "warn"
                          ? "bg-warn text-paper"
                          : selected
                            ? "bg-paper/20"
                            : "bg-sunk"
                    }`}
                  >
                    {count.value}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {renderTab(tab, issueFilter, setIssueFilter)}
      </div>
    </div>
  );
}
