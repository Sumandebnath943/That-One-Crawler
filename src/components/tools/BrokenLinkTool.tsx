"use client";

import { useMemo, useState } from "react";
import { contextFor, isRunning } from "@/lib/client/crawl";
import { toast } from "@/lib/client/quirks";
import { checkedLinks, csvCell, downloadText, usedOn, type CheckedKind } from "@/lib/client/tools";
import { brokenLinkReport, buildRows } from "@/lib/seo/report";
import { displayPath } from "@/lib/seo/url";
import { StatusBadge } from "../scan/bits";
import { ProgressPanel } from "../scan/ProgressPanel";
import { FullAuditLinks, ResultBlock, Segmented, StatGrid, StatTile, ToolError, ToolForm } from "./kit";
import { useSiteScan } from "./use-site-scan";

type View = "broken" | "blocked" | "errors" | "heavy" | "all";

interface Item {
  url: string;
  status: number;
  kind: CheckedKind;
  foundOn: string[];
  note?: string;
}

const KIND_CHIP: Record<CheckedKind, string> = {
  internal: "bg-note/12 text-note",
  external: "bg-sunk text-ink-2",
  image: "bg-ai/15 text-ai",
};

const SHOW = 60;

function FoundOn({ pages }: { pages: string[] }) {
  const [open, setOpen] = useState(false);
  const shown = open ? pages : pages.slice(0, 3);
  if (!pages.length) return <span className="text-ink-3">—</span>;
  return (
    <div className="flex flex-col gap-0.5">
      {shown.map((page) => (
        <a key={page} href={page} target="_blank" rel="noreferrer" className="truncate font-mono text-xs hover:underline" title={page}>
          {displayPath(page)}
        </a>
      ))}
      {pages.length > 3 && (
        <button type="button" onClick={() => setOpen((o) => !o)} className="text-left text-xs font-semibold text-ink-3 hover:text-ink">
          {open ? "Show fewer" : `+${pages.length - 3} more`}
        </button>
      )}
    </div>
  );
}

export function BrokenLinkTool({ action, placeholder }: { action: string; placeholder: string }) {
  const { scan, savedId, start, stop } = useSiteScan();
  const [view, setView] = useState<View>("broken");
  const [showAll, setShowAll] = useState(false);
  const running = scan ? isRunning(scan.phase) : false;

  const results = useMemo(() => {
    if (!scan || isRunning(scan.phase)) return null;
    const rows = buildRows(scan.pages, contextFor(scan));
    const checked = checkedLinks(rows, scan.linkChecks);
    const found = usedOn(rows);
    const broken: Item[] = brokenLinkReport(rows).map((t) => ({ url: t.url, status: t.status, kind: t.kind, foundOn: t.linkedFrom }));
    const pick = (state: string): Item[] => checked.filter((c) => c.state === state).map((c) => ({ ...c, note: c.error }));
    const heavy = new Map<string, Item>();
    for (const row of rows) {
      for (const img of row.heavyImages) {
        heavy.set(img.url, { url: img.url, status: 200, kind: "image", foundOn: found.get(img.url) ?? [], note: `${Math.round(img.sizeBytes / 1024)} KB` });
      }
    }
    const order = { broken: 0, error: 1, blocked: 2, ok: 3 } as const;
    const all: Item[] = [...checked].sort((a, b) => order[a.state] - order[b.state]).map((c) => ({ ...c, note: c.error }));
    return {
      pages: rows.filter((r) => r.hasContent).length,
      checked: checked.length,
      lists: { broken, blocked: pick("blocked"), errors: pick("error"), heavy: [...heavy.values()], all } satisfies Record<View, Item[]>,
    };
  }, [scan]);

  const items = results?.lists[view] ?? [];
  const visible = showAll ? items : items.slice(0, SHOW);

  const exportCsv = () => {
    if (!scan || !results) return;
    const lines = [["status", "url", "type", "note", "found_on"].join(",")];
    for (const item of items) {
      lines.push([item.status || "ERR", item.url, item.kind, item.note ?? "", item.foundOn.join(" ")].map(csvCell).join(","));
    }
    downloadText(`${scan.domain || "site"}-${view}-links.csv`, lines.join("\n"));
    toast("CSV downloaded. Happy fixing.");
  };

  return (
    <div className="space-y-6">
      <ToolForm
        action={action}
        placeholder={placeholder}
        busy={running}
        pages
        onSubmit={(url, maxPages) => {
          setView("broken");
          setShowAll(false);
          start({ url, maxPages, pagespeed: false, checkLinks: true, brandRules: null });
        }}
      />
      {scan && running && <ProgressPanel scan={scan} onStop={stop} />}
      {scan?.phase === "error" && <ToolError>{scan.error}</ToolError>}
      {scan && results && (
        <div className="rise space-y-6">
          {scan.warnings.length > 0 && (
            <ul className="space-y-1 rounded-xl border-2 border-warn bg-warn/10 p-3 text-sm text-ink-2">
              {scan.warnings.map((w) => (
                <li key={w}>⚠ {w}</li>
              ))}
            </ul>
          )}
          <StatGrid>
            <StatTile label="Pages crawled" value={results.pages} />
            <StatTile label="Links & images" value={results.checked} hint="tested beyond your pages" />
            <StatTile label="Broken" value={results.lists.broken.length} tone={results.lists.broken.length ? "crit" : "good"} />
            <StatTile label="Refused bots" value={results.lists.blocked.length} tone="note" hint="not counted as broken" />
            <StatTile label="Heavy images" value={results.lists.heavy.length} tone={results.lists.heavy.length ? "warn" : "good"} hint="over 300 KB" />
          </StatGrid>

          <ResultBlock
            title={view === "broken" && !items.length ? "No broken links. Every link went somewhere." : "Results"}
            aside={
              <button
                type="button"
                onClick={exportCsv}
                disabled={!items.length}
                className="rounded-lg border-2 border-ink bg-card px-3 py-1.5 text-sm font-bold transition hover:-translate-y-0.5 hover:shadow-brutal-sm disabled:opacity-50"
              >
                Download CSV
              </button>
            }
          >
            <Segmented
              label="Which links"
              value={view}
              onChange={(v) => {
                setView(v);
                setShowAll(false);
              }}
              options={[
                { id: "broken", label: "Broken", count: results.lists.broken.length },
                { id: "blocked", label: "Refused bots", count: results.lists.blocked.length },
                { id: "errors", label: "Errors", count: results.lists.errors.length },
                { id: "heavy", label: "Heavy images", count: results.lists.heavy.length },
                { id: "all", label: "Everything", count: results.lists.all.length },
              ]}
            />
            {items.length ? (
              <div className="overflow-x-auto rounded-xl border-2 border-ink">
                <table className="w-full min-w-[40rem] text-left text-sm">
                  <thead>
                    <tr className="border-b-2 border-ink bg-sunk text-xs text-ink-2 uppercase">
                      <th className="w-20 px-3 py-2">Status</th>
                      <th className="px-3 py-2">URL</th>
                      <th className="w-64 px-3 py-2">Found on</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((item) => (
                      <tr key={item.url} className="border-b border-line align-top last:border-b-0">
                        <td className="px-3 py-2.5">
                          <StatusBadge status={item.status} error={item.note} />
                        </td>
                        <td className="px-3 py-2.5">
                          <a href={item.url} target="_blank" rel="noreferrer" className="font-mono text-xs break-all hover:underline">
                            {item.url}
                          </a>
                          <span className="mt-1 flex flex-wrap gap-1.5">
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${KIND_CHIP[item.kind]}`}>{item.kind}</span>
                            {item.note && <span className="rounded-full bg-sunk px-2 py-0.5 text-[11px] text-ink-2">{item.note}</span>}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <FoundOn pages={item.foundOn} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="rounded-xl bg-good/10 p-3 text-sm font-semibold text-good">Nothing here. Lovely.</p>
            )}
            {items.length > SHOW && !showAll && (
              <button type="button" onClick={() => setShowAll(true)} className="text-sm font-bold underline underline-offset-4">
                Show all {items.length}
              </button>
            )}
          </ResultBlock>
          <FullAuditLinks url={scan.startUrl} savedId={savedId} />
        </div>
      )}
    </div>
  );
}
