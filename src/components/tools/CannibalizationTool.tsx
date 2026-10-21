"use client";

import { useMemo, useState } from "react";
import { contextFor, isRunning } from "@/lib/client/crawl";
import { toast } from "@/lib/client/quirks";
import { csvCell, downloadText } from "@/lib/client/tools";
import type { PageRow } from "@/lib/seo/issues";
import { buildRows, cannibalizationReport } from "@/lib/seo/report";
import { displayPath } from "@/lib/seo/url";
import { ScoreBadge } from "../scan/bits";
import { ProgressPanel } from "../scan/ProgressPanel";
import { FullAuditLinks, ResultBlock, StatGrid, StatTile, ToolError, ToolForm } from "./kit";
import { useSiteScan } from "./use-site-scan";

/** The page most worth keeping: best score, then most internal links, then most words. */
function strongest(pages: PageRow[]): PageRow[] {
  return [...pages].sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || b.inbound - a.inbound || b.wordCount - a.wordCount);
}

function Tick({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span title={`${label}: ${ok ? "yes" : "no"}`} className={`font-bold ${ok ? "text-good" : "text-crit"}`}>
      {ok ? "✓" : "✗"}
      <span className="sr-only">{`${label}: ${ok ? "yes" : "no"}`}</span>
    </span>
  );
}

const SPOTS = [
  ["title", "Title"],
  ["h1", "H1"],
  ["meta", "Desc"],
  ["url", "URL"],
] as const;

export function CannibalizationTool({ action, placeholder }: { action: string; placeholder: string }) {
  const { scan, savedId, start, stop } = useSiteScan();
  const [query, setQuery] = useState("");
  const running = scan ? isRunning(scan.phase) : false;

  const results = useMemo(() => {
    if (!scan || isRunning(scan.phase)) return null;
    const rows = buildRows(scan.pages, contextFor(scan));
    const content = rows.filter((r) => r.hasContent);
    const groups = cannibalizationReport(rows).map((g) => ({ keyword: g.keyword, pages: strongest(g.pages) }));
    const mapped = content.filter((r) => r.primaryKeyword).sort((a, b) => a.primaryKeyword!.phrase.localeCompare(b.primaryKeyword!.phrase));
    const stuffed = content.filter((r) => r.issues.some((i) => i.code === "keyword-stuffing"));
    return { content, groups, mapped, stuffed, affected: groups.reduce((n, g) => n + g.pages.length, 0) };
  }, [scan]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!results || !q) return results?.mapped ?? [];
    return results.mapped.filter((r) => r.primaryKeyword!.phrase.includes(q) || r.finalUrl.toLowerCase().includes(q));
  }, [results, query]);

  const exportCsv = () => {
    if (!scan || !results) return;
    const lines = [["page", "main_keyword", "uses", "in_title", "in_h1", "in_description", "in_url", "competing_pages"].join(",")];
    const competing = new Map(results.groups.flatMap((g) => g.pages.map((p) => [p.finalUrl, g.pages.length] as const)));
    for (const row of results.mapped) {
      const k = row.primaryKeyword!;
      lines.push([row.finalUrl, k.phrase, k.count, k.title, k.h1, k.meta, k.url, competing.get(row.finalUrl) ?? 1].map((v) => csvCell(String(v))).join(","));
    }
    downloadText(`${scan.domain || "site"}-keyword-map.csv`, lines.join("\n"));
    toast("Keyword map downloaded.");
  };

  return (
    <div className="space-y-6">
      <ToolForm
        action={action}
        placeholder={placeholder}
        busy={running}
        pages
        onSubmit={(url, maxPages) => {
          setQuery("");
          start({ url, maxPages, pagespeed: false, checkLinks: false, brandRules: null });
        }}
      />
      {scan && running && <ProgressPanel scan={scan} onStop={stop} />}
      {scan?.phase === "error" && <ToolError>{scan.error}</ToolError>}
      {scan && results && (
        <div className="rise space-y-8">
          <StatGrid>
            <StatTile label="Pages read" value={results.content.length} />
            <StatTile label="With a main keyword" value={results.mapped.length} />
            <StatTile label="Competing groups" value={results.groups.length} tone={results.groups.length ? "warn" : "good"} />
            <StatTile label="Pages affected" value={results.affected} tone={results.affected ? "warn" : "good"} />
            <StatTile label="Possible stuffing" value={results.stuffed.length} tone={results.stuffed.length ? "warn" : "good"} hint="keyword over 3%" />
          </StatGrid>

          <ResultBlock
            title={results.groups.length ? `Competing posts · ${results.groups.length} groups` : "No keyword cannibalization"}
            note={
              results.groups.length
                ? "Each group targets the same main keyword. Keep the marked page; merge, redirect or re-angle the rest."
                : "Every page has its own main keyword. Nothing is fighting itself for a ranking."
            }
          >
            {results.groups.length > 0 && (
              <ul className="space-y-4">
                {results.groups.map((group) => (
                  <li key={group.keyword} className="overflow-hidden rounded-2xl border-2 border-ink bg-paper">
                    <div className="flex flex-wrap items-center gap-2 border-b-2 border-ink bg-sunk px-4 py-2.5">
                      <span className="rounded-md border-2 border-ink bg-lime px-2 py-0.5 font-mono text-sm font-bold text-lime-ink">{group.keyword}</span>
                      <span className="text-sm text-ink-2">{group.pages.length} pages competing</span>
                    </div>
                    <ul className="divide-y-2 divide-dashed divide-line">
                      {group.pages.map((page, i) => (
                        <li key={page.finalUrl} className="grid gap-3 px-4 py-3 sm:grid-cols-[6.5rem_minmax(0,1fr)_auto] sm:items-center">
                          <span
                            className={`justify-self-start rounded-full px-2.5 py-0.5 text-xs font-extrabold ${i === 0 ? "border-2 border-ink bg-lime text-lime-ink" : "bg-sunk text-ink-2"}`}
                          >
                            {i === 0 ? "★ Keep" : "Merge or re-angle"}
                          </span>
                          <div className="min-w-0">
                            <a href={page.finalUrl} target="_blank" rel="noreferrer" className="block truncate font-mono text-xs font-bold hover:underline">
                              {displayPath(page.finalUrl)}
                            </a>
                            <p className="truncate text-sm text-ink-2" title={page.title}>
                              {page.title || "(no title)"}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-ink-3">
                            <ScoreBadge score={page.score} size="sm" />
                            <span title="Internal links pointing here">
                              {page.inbound} {page.inbound === 1 ? "link" : "links"} in
                            </span>
                            <span>{page.wordCount.toLocaleString()} words</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </ResultBlock>

          {results.stuffed.length > 0 && (
            <ResultBlock title="Possible keyword stuffing" note="The main keyword makes up more than 3% of the text on these pages.">
              <ul className="flex flex-wrap gap-2">
                {results.stuffed.map((row) => (
                  <li key={row.finalUrl} className="rounded-full border-2 border-line px-3 py-1 text-sm">
                    <span className="font-mono text-xs">{displayPath(row.finalUrl)}</span>{" "}
                    <b className="text-warn">{row.keywordDensity}%</b>
                  </li>
                ))}
              </ul>
            </ResultBlock>
          )}

          <ResultBlock
            title="Keyword map"
            note="Every page's main keyword and where it's used. Site-wide phrases (like your blog's name) are ignored."
            aside={
              <div className="flex flex-wrap gap-2">
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter keywords…"
                  aria-label="Filter keywords"
                  className="h-9 w-48 rounded-lg border-2 border-ink bg-paper px-2 text-sm placeholder:text-ink-3"
                />
                <button
                  type="button"
                  onClick={exportCsv}
                  className="h-9 rounded-lg border-2 border-ink bg-card px-3 text-sm font-bold transition hover:-translate-y-0.5 hover:shadow-brutal-sm"
                >
                  Download CSV
                </button>
              </div>
            }
          >
            <div className="max-h-[32rem] overflow-auto rounded-xl border-2 border-ink">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b-2 border-ink bg-sunk text-xs text-ink-2 uppercase">
                    <th className="px-3 py-2">Page</th>
                    <th className="px-3 py-2">Main keyword</th>
                    <th className="w-14 px-3 py-2 text-right">Uses</th>
                    {SPOTS.map(([, label]) => (
                      <th key={label} className="w-14 px-2 py-2 text-center">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => {
                    const k = row.primaryKeyword!;
                    return (
                      <tr key={row.finalUrl} className="border-b border-line last:border-b-0">
                        <td className="max-w-64 truncate px-3 py-2 font-mono text-xs" title={row.finalUrl}>
                          {displayPath(row.finalUrl)}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs font-semibold">{k.phrase}</td>
                        <td className="px-3 py-2 text-right font-mono text-xs tabular-nums">{k.count}</td>
                        {SPOTS.map(([key, label]) => (
                          <td key={key} className="px-2 py-2 text-center">
                            <Tick ok={k[key]} label={label} />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                  {!filtered.length && (
                    <tr>
                      <td colSpan={3 + SPOTS.length} className="px-3 py-8 text-center text-ink-3">
                        No keywords match that filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </ResultBlock>
          <FullAuditLinks url={scan.startUrl} savedId={savedId} />
        </div>
      )}
    </div>
  );
}
