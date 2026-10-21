"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { QuotaError, runAi } from "@/lib/client/ai";
import { contextFor, type ScanState } from "@/lib/client/crawl";
import { loadScan, previousScans, type ScanSummary } from "@/lib/client/history";
import { DEEP_CLICKS, ISSUES, issueText, type PageRow } from "@/lib/seo/issues";
import {
  brokenLinkReport,
  buildRows,
  cannibalizationReport,
  compareRows,
  type ReportSummary,
} from "@/lib/seo/report";
import type { AiPlan, AiResult } from "@/lib/seo/types";
import { displayPath, urlKey } from "@/lib/seo/url";
import { AiQuotaBar, GuardNotes } from "./ai-ui";
import { StatusBadge } from "./bits";

function Panel({ children }: { children: ReactNode }) {
  return <div className="space-y-6 rounded-2xl rounded-tl-none border-2 border-ink bg-card p-4 shadow-brutal sm:p-5">{children}</div>;
}

function Block({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="font-display text-xl font-extrabold">{title}</h3>
      {note && <p className="mb-3 text-sm text-ink-2">{note}</p>}
      {children}
    </section>
  );
}

function PageLink({ url, onOpen }: { url: string; onOpen: (key: string) => void }) {
  return (
    <button type="button" onClick={() => onOpen(urlKey(url))} className="truncate text-left font-mono text-xs font-semibold hover:underline">
      {displayPath(url)}
    </button>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl bg-good/10 p-3 text-sm font-semibold text-good">{children}</p>;
}

// ---------------------------------------------------------------- Links

export function LinksPanel({ rows, scan, onOpen }: { rows: PageRow[]; scan: ScanState; onOpen: (key: string) => void }) {
  const broken = useMemo(() => brokenLinkReport(rows), [rows]);
  const content = rows.filter((r) => r.hasContent);
  const orphans = content.filter((r) => r.issues.some((i) => i.code === "orphan"));
  const deep = content.filter((r) => r.depth !== null && r.depth > DEEP_CLICKS).sort((a, b) => (b.depth ?? 0) - (a.depth ?? 0));
  const mostLinked = [...content].sort((a, b) => b.inbound - a.inbound).slice(0, 8);
  const checked = Object.keys(scan.linkChecks).length;
  const blocked = Object.values(scan.linkChecks).filter((c) => c.state === "blocked").length;
  const complete = contextFor(scan).complete;

  return (
    <Panel>
      <Block
        title={`Broken links · ${broken.length}`}
        note={
          checked
            ? `We checked ${checked} outgoing links and images (plus every scanned page). ${blocked ? `${blocked} sites refused bots, so they're not counted as broken.` : ""}`
            : "Link checking was off for this scan, so only links to scanned pages were checked."
        }
      >
        {broken.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b-2 border-ink text-xs text-ink-3 uppercase">
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Broken URL</th>
                  <th className="py-2">Linked from</th>
                </tr>
              </thead>
              <tbody>
                {broken.slice(0, 100).map((target) => (
                  <tr key={target.url} className="border-b border-line align-top">
                    <td className="py-2 pr-3">
                      <StatusBadge status={target.status} />
                    </td>
                    <td className="max-w-80 py-2 pr-3 font-mono text-xs break-all">
                      {target.url}
                      <span className="ml-1 text-ink-3">({target.internal ? "internal" : "external"})</span>
                    </td>
                    <td className="py-2">
                      <div className="flex max-w-64 flex-col gap-0.5">
                        {target.linkedFrom.slice(0, 4).map((from) => (
                          <PageLink key={from} url={from} onOpen={onOpen} />
                        ))}
                        {target.linkedFrom.length > 4 && <span className="text-xs text-ink-3">+{target.linkedFrom.length - 4} more</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No broken links found. Every link we followed went somewhere.</Empty>
        )}
      </Block>

      <Block
        title={`Orphan pages · ${orphans.length}`}
        note={complete ? "Pages in your sitemap that no other page links to." : "Orphans can only be called after a full sitemap scan (no page limit hit, nothing stopped early)."}
      >
        {orphans.length ? (
          <ul className="grid gap-1 sm:grid-cols-2">
            {orphans.map((r) => (
              <li key={r.finalUrl}>
                <PageLink url={r.finalUrl} onOpen={onOpen} />
              </li>
            ))}
          </ul>
        ) : (
          complete && <Empty>No orphans. Every page has at least one link pointing at it.</Empty>
        )}
      </Block>

      <Block title={`Buried pages · ${deep.length}`} note={`More than ${DEEP_CLICKS} clicks from the start page.`}>
        {deep.length ? (
          <ul className="space-y-1">
            {deep.slice(0, 20).map((r) => (
              <li key={r.finalUrl} className="flex items-center gap-2">
                <span className="rounded bg-warn/15 px-1.5 font-mono text-xs font-bold text-warn">{r.depth} clicks</span>
                <PageLink url={r.finalUrl} onOpen={onOpen} />
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Everything is within {DEEP_CLICKS} clicks of the start page.</Empty>
        )}
      </Block>

      <Block title="Most linked pages" note="The pages your site points at most often: your de facto hubs.">
        <ul className="space-y-1">
          {mostLinked.map((r) => (
            <li key={r.finalUrl} className="flex items-center gap-2">
              <span className="w-12 shrink-0 text-right font-mono text-xs font-bold">{r.inbound}</span>
              <PageLink url={r.finalUrl} onOpen={onOpen} />
            </li>
          ))}
        </ul>
      </Block>
    </Panel>
  );
}

// ---------------------------------------------------------------- Keywords

export function KeywordsPanel({ rows, onOpen }: { rows: PageRow[]; onOpen: (key: string) => void }) {
  const groups = useMemo(() => cannibalizationReport(rows), [rows]);
  const withKeywords = rows.filter((r) => r.primaryKeyword).sort((a, b) => (b.primaryKeyword!.score ?? 0) - (a.primaryKeyword!.score ?? 0));
  const stuffed = rows.filter((r) => r.issues.some((i) => i.code === "keyword-stuffing"));

  return (
    <Panel>
      <Block
        title={`Keyword cannibalization · ${groups.length}`}
        note="Groups of pages chasing the same main keyword. Pick one page to own each keyword; merge, redirect or re-angle the rest."
      >
        {groups.length ? (
          <ul className="space-y-3">
            {groups.map((group) => (
              <li key={group.keyword} className="rounded-xl border-2 border-line p-3">
                <p className="mb-2">
                  <span className="rounded-md bg-lime px-2 py-0.5 font-mono text-sm font-bold text-lime-ink">{group.keyword}</span>{" "}
                  <span className="text-sm text-ink-3">{group.pages.length} pages</span>
                </p>
                <ul className="space-y-1">
                  {group.pages.map((page) => (
                    <li key={page.finalUrl} className="flex items-center gap-2">
                      <span className="w-10 shrink-0 font-mono text-xs text-ink-3">{page.score ?? "—"}</span>
                      <PageLink url={page.finalUrl} onOpen={onOpen} />
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No cannibalization. Every page has its own main keyword.</Empty>
        )}
      </Block>

      {stuffed.length > 0 && (
        <Block title={`Possible keyword stuffing · ${stuffed.length}`}>
          <ul className="space-y-1">
            {stuffed.map((r) => (
              <li key={r.finalUrl} className="flex items-center gap-2">
                <span className="rounded bg-warn/15 px-1.5 font-mono text-xs font-bold text-warn">{r.keywordDensity}%</span>
                <PageLink url={r.finalUrl} onOpen={onOpen} />
              </li>
            ))}
          </ul>
        </Block>
      )}

      <Block title="Keyword map" note="Each page's main keyword (phrases that appear on most pages, like your blog's name, are ignored) and where it's used.">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b-2 border-ink text-xs text-ink-3 uppercase">
                <th className="py-2 pr-3">Page</th>
                <th className="py-2 pr-3">Main keyword</th>
                <th className="py-2 pr-3">Uses</th>
                <th className="py-2">In title · H1 · desc · URL</th>
              </tr>
            </thead>
            <tbody>
              {withKeywords.slice(0, 200).map((r) => {
                const k = r.primaryKeyword!;
                const tick = (ok: boolean) => <span className={ok ? "text-good" : "text-crit"}>{ok ? "✓" : "✗"}</span>;
                return (
                  <tr key={r.finalUrl} className="border-b border-line">
                    <td className="max-w-56 py-1.5 pr-3">
                      <PageLink url={r.finalUrl} onOpen={onOpen} />
                    </td>
                    <td className="py-1.5 pr-3 font-mono text-xs">{k.phrase}</td>
                    <td className="py-1.5 pr-3 font-mono text-xs">{k.count}</td>
                    <td className="space-x-2 py-1.5 font-mono text-xs">
                      {tick(k.title)} {tick(k.h1)} {tick(k.meta)} {tick(k.url)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Block>
    </Panel>
  );
}

// ---------------------------------------------------------------- Changes

export function ChangesPanel({ scan, rows, onOpen }: { scan: ScanState; rows: PageRow[]; onOpen: (key: string) => void }) {
  const [options, setOptions] = useState<ScanSummary[] | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [previous, setPrevious] = useState<ScanState | null>(null);
  const { id, domain, scope, startedAt } = scan;

  useEffect(() => {
    let alive = true;
    previousScans({ id, domain, scope, startedAt }).then((list) => {
      if (!alive) return;
      setOptions(list);
      setChosen((c) => c ?? list[0]?.id ?? null);
    });
    return () => {
      alive = false;
    };
  }, [id, domain, scope, startedAt]);

  useEffect(() => {
    if (!chosen) return;
    let alive = true;
    loadScan(chosen).then((s) => alive && setPrevious(s));
    return () => {
      alive = false;
    };
  }, [chosen]);

  const comparison = useMemo(() => {
    if (!previous || previous.id !== chosen) return null;
    return compareRows(buildRows(previous.pages, contextFor(previous)), rows);
  }, [previous, chosen, rows]);

  if (options === null) return <Panel>Looking for earlier scans of this site…</Panel>;
  if (!options.length) {
    return (
      <Panel>
        <Block title="No earlier scans to compare with">
          <p className="text-sm text-ink-2">
            Fix a few things, then rescan {scan.domain}. We&apos;ll show what you fixed, what broke and how the scores moved. Scans are kept in
            this browser.
          </p>
        </Block>
      </Panel>
    );
  }

  const delta = (value: number | null) =>
    value === null ? "—" : <span className={value > 0 ? "text-good" : value < 0 ? "text-crit" : ""}>{value > 0 ? `+${value}` : value}</span>;

  return (
    <Panel>
      <label className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold">Compare with</span>
        <select
          value={chosen ?? ""}
          onChange={(e) => setChosen(e.target.value)}
          className="rounded-lg border-2 border-ink bg-paper px-2 py-1"
        >
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {new Date(o.startedAt).toLocaleString()} · {o.pageCount} pages · score {o.avgScore ?? "—"}
            </option>
          ))}
        </select>
      </label>
      {!comparison ? (
        <p className="text-sm text-ink-3">Loading that scan…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["SEO score", delta(comparison.scoreDelta)],
              ["AI readiness", delta(comparison.aiDelta)],
              ["Issues fixed", <span key="f" className="text-good">{comparison.fixedTotal}</span>],
              ["New issues", <span key="n" className={comparison.introducedTotal ? "text-crit" : ""}>{comparison.introducedTotal}</span>],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl border-2 border-ink p-3">
                <div className="font-display text-3xl font-extrabold tabular-nums">{value}</div>
                <div className="text-sm font-semibold">{label}</div>
              </div>
            ))}
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Block title="Fixed since then">
              {comparison.fixed.length ? (
                <ul className="space-y-1 text-sm">
                  {comparison.fixed.map((f) => (
                    <li key={f.code}>
                      <b className="text-good">−{f.count}</b> {ISSUES[f.code].label}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-3">Nothing yet. No judgment. (Some judgment.)</p>
              )}
            </Block>
            <Block title="New since then">
              {comparison.introduced.length ? (
                <ul className="space-y-1 text-sm">
                  {comparison.introduced.map((f) => (
                    <li key={f.code}>
                      <b className="text-crit">+{f.count}</b> {ISSUES[f.code].label}
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>No new issues. Nice.</Empty>
              )}
            </Block>
          </div>
          {(comparison.improved.length > 0 || comparison.worsened.length > 0) && (
            <div className="grid gap-6 md:grid-cols-2">
              <Block title="Biggest improvements">
                <ul className="space-y-1">
                  {comparison.improved.slice(0, 8).map((p) => (
                    <li key={p.url} className="flex items-center gap-2">
                      <span className="w-16 shrink-0 font-mono text-xs text-good">
                        {p.from}→{p.to}
                      </span>
                      <PageLink url={p.url} onOpen={onOpen} />
                    </li>
                  ))}
                </ul>
              </Block>
              <Block title="Got worse">
                <ul className="space-y-1">
                  {comparison.worsened.slice(0, 8).map((p) => (
                    <li key={p.url} className="flex items-center gap-2">
                      <span className="w-16 shrink-0 font-mono text-xs text-crit">
                        {p.from}→{p.to}
                      </span>
                      <PageLink url={p.url} onOpen={onOpen} />
                    </li>
                  ))}
                </ul>
              </Block>
            </div>
          )}
          {(comparison.newPages.length > 0 || comparison.removedPages.length > 0) && (
            <p className="text-sm text-ink-2">
              {comparison.newPages.length} new {comparison.newPages.length === 1 ? "page" : "pages"} and{" "}
              {comparison.removedPages.length} {comparison.removedPages.length === 1 ? "page" : "pages"} no longer found since that scan.
            </p>
          )}
        </>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------- AI action plan

export function PlanPanel({
  scan,
  rows,
  summary,
  onPlan,
}: {
  scan: ScanState;
  rows: PageRow[];
  summary: ReportSummary;
  onPlan: (plan: AiResult<AiPlan>) => void;
}) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const plan = scan.plan;

  const generate = async () => {
    setRunning(true);
    setError(null);
    const issues = (Object.entries(summary.issueCounts) as [keyof typeof ISSUES, number][])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([code, count]) => ({ label: ISSUES[code].label, severity: ISSUES[code].severity, count }));
    const worstPages = rows
      .filter((r) => r.hasContent || r.status >= 400)
      .sort((a, b) => (a.score ?? -1) - (b.score ?? -1))
      .slice(0, 8)
      .map((r) => ({ url: r.finalUrl, score: r.score, issues: r.issues.slice(0, 6).map(issueText) }));
    try {
      const result = await runAi<AiPlan>({
        task: "plan",
        plan: {
          domain: `${scan.domain}${scan.scope}`,
          pages: summary.total,
          avgScore: summary.avgScore,
          avgAiScore: summary.avgAiScore,
          issues,
          worstPages,
        },
      });
      onPlan(result);
    } catch (err) {
      setError(err instanceof QuotaError || err instanceof Error ? err.message : "The AI wandered off.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <Panel>
      <AiQuotaBar />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-extrabold">Your action plan</h3>
          <p className="text-sm text-ink-2">Five steps, ordered by impact, written from this scan&apos;s numbers. Costs one AI action.</p>
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={running}
          className="rounded-xl border-2 border-ink bg-lime px-4 py-2 font-display font-extrabold text-lime-ink transition hover:-translate-y-0.5 hover:shadow-brutal-sm disabled:opacity-60"
        >
          {running ? "Writing your plan…" : plan ? "✦ Write a fresh plan" : "✦ Write my plan"}
        </button>
      </div>
      {error && <p className="rounded-lg bg-crit/10 p-2 text-sm font-semibold text-crit">{error}</p>}
      {plan && (
        <div className="space-y-4">
          <p className="rounded-xl bg-sunk p-3 font-semibold italic">{plan.summary}</p>
          <ol className="space-y-3">
            {plan.steps.map((step, i) => (
              <li key={step.title} className="flex gap-3 rounded-xl border-2 border-line p-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-ink bg-lime font-display font-extrabold text-lime-ink">
                  {i + 1}
                </span>
                <div>
                  <p className="font-display text-lg font-extrabold">{step.title}</p>
                  <p className="text-sm text-ink-2">{step.why}</p>
                  <p className="mt-1 text-sm">{step.how}</p>
                </div>
              </li>
            ))}
          </ol>
          <GuardNotes guard={plan.guard} source="your scan or our checks" />
          <p className="text-[11px] text-ink-3">
            via {plan.provider} · {plan.model}
          </p>
        </div>
      )}
    </Panel>
  );
}
