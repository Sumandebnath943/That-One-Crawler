"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { shortUrl, track } from "@/lib/client/beacon-events";
import { loadBrandRules, siteKeyFor } from "@/lib/client/brand-rules";
import { contextFor, isRunning, runScan, type ScanState } from "@/lib/client/crawl";
import { loadScan, saveScan } from "@/lib/client/history";
import { burstConfetti, toast } from "@/lib/client/quirks";
import { downloadHtmlReport } from "@/lib/client/report-html";
import { useFeatures } from "@/lib/client/use-features";
import { DEFAULT_PAGE_LIMIT, MAX_PAGES_LIMIT } from "@/lib/limits";
import { agentGaps, agentScore, withCrawlEvidence } from "@/lib/seo/agents";
import { hasContent } from "@/lib/seo/issues";
import { agentPromptItems, issuePromptItems, speedPromptItems } from "@/lib/seo/prompt";
import { brokenLinkReport, buildRows, cannibalizationReport, summarize } from "@/lib/seo/report";
import type { CrawledPage } from "@/lib/seo/types";
import { prettyUrl, urlKey } from "@/lib/seo/url";
import { Mascot } from "../Mascot";
import { RecentScans } from "../RecentScans";
import { buildScanHref, ScanForm } from "../ScanForm";
import { BrandRulesDialog } from "./BrandRulesDialog";
import { PageDrawer } from "./PageDrawer";
import { AgentsTabPanel, ChangesPanel, KeywordsPanel, LinksPanel, PlanPanel, SpeedPanel } from "./Panels";
import { ProgressPanel } from "./ProgressPanel";
import { PagesTable, Report, Verdict } from "./Report";

function EmptyWorkspace() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <div className="flex items-center gap-4">
        <Mascot pokeable className="size-20 shrink-0" />
        <h1 className="font-display text-4xl font-extrabold tracking-tight">Who are we judging today?</h1>
      </div>
      <div className="mt-8">
        <ScanForm />
      </div>
      <div className="-mx-4 sm:-mx-6">
        <RecentScans />
      </div>
    </div>
  );
}

/** A little reaction when a live scan finishes: confetti for great blogs, moral support for rough ones. */
function celebrate(final: ScanState) {
  if (final.phase === "stopped") {
    toast("Stopped. Here's what we judged so far.");
    return;
  }
  const score = summarize(buildRows(final.pages, contextFor(final))).avgScore;
  if (score === null) return;
  if (score >= 85) {
    burstConfetti();
    toast("Fine. You're good at this. 🎉");
  } else if (score < 30) {
    toast("Deep breaths. Start with the critical ones.");
  } else {
    toast("Verdict's in. Judgment is final.");
  }
}

function Notice({ tone, title, children }: { tone: "warn" | "crit"; title: string; children: ReactNode }) {
  return (
    <div className={`rounded-2xl border-2 p-4 ${tone === "crit" ? "border-crit bg-crit/10" : "border-warn bg-warn/10"}`}>
      <p className={`font-display text-lg font-extrabold ${tone === "crit" ? "text-crit" : "text-warn"}`}>{title}</p>
      <div className="mt-1 text-sm text-ink-2">{children}</div>
    </div>
  );
}

const headerButton =
  "rounded-xl border-2 border-ink bg-card px-3 py-2 text-sm font-bold shadow-brutal-sm transition hover:-translate-y-0.5";

export function ScanWorkspace() {
  const params = useSearchParams();
  const router = useRouter();
  const features = useFeatures();

  const scanUrl = params.get("url");
  const scanId = params.get("id");
  const maxPages = Math.min(Math.max(Number(params.get("max")) || DEFAULT_PAGE_LIMIT, 1), MAX_PAGES_LIMIT);
  const wantPagespeed = params.get("ps") === "1";
  const checkLinks = params.get("links") !== "0";

  const [scan, setScan] = useState<ScanState | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [missing, setMissing] = useState<string | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);
  const currentId = useRef<string | null>(null);

  // A ?url= in the address bar means "start a fresh scan".
  useEffect(() => {
    if (!scanUrl) return;
    const controller = new AbortController();
    const live = () => !controller.signal.aborted || controller.signal.reason === "stop";
    stopRef.current = () => controller.abort("stop");
    track("scan", `${shortUrl(scanUrl)} · up to ${maxPages} pages${wantPagespeed ? " · with PageSpeed" : ""}`);

    runScan(
      { url: scanUrl, maxPages, pagespeed: wantPagespeed, checkLinks, brandRules: loadBrandRules(siteKeyFor(scanUrl)) },
      (state) => {
        if (!live()) return;
        currentId.current = state.id;
        setScan(state);
      },
      controller.signal,
    ).then(async (final) => {
      if (!live() || final.phase === "error") return;
      celebrate(final);
      const done = summarize(buildRows(final.pages, contextFor(final)));
      track(
        "scan_done",
        `${shortUrl(final.startUrl || scanUrl)} · ${done.total} pages · SEO ${done.avgScore ?? "—"} · AI search ${done.avgAiScore ?? "—"}` +
          (final.agents ? ` · AI agents ${agentScore(final.agents).score}` : "") +
          (final.phase === "stopped" ? " (stopped early)" : ""),
      );
      if (await saveScan(final)) {
        setSavedId(final.id);
        // Swap ?url= for ?id= so a refresh shows this result instead of re-crawling.
        if (live()) router.replace(`/scan?id=${final.id}`, { scroll: false });
      }
    });

    return () => controller.abort("unmount");
  }, [scanUrl, maxPages, wantPagespeed, checkLinks, router]);

  // A ?id= means "show a saved scan".
  useEffect(() => {
    if (!scanId || scanUrl || currentId.current === scanId) return;
    let alive = true;
    loadScan(scanId).then((saved) => {
      if (!alive) return;
      if (saved) {
        currentId.current = saved.id;
        setScan(saved);
        setSavedId(saved.id);
      } else {
        setMissing(scanId);
      }
    });
    return () => {
      alive = false;
    };
  }, [scanId, scanUrl]);

  // While a scan runs, the browser tab shows its progress (handy when you wander off to another tab).
  const progressTitle =
    scan && isRunning(scan.phase)
      ? `(${
          scan.phase === "pagespeed"
            ? `${scan.psDone}/${scan.psTotal}`
            : scan.phase === "links"
              ? `${scan.lcDone}/${scan.lcTotal} links`
              : scan.target
                ? `${scan.fetched}/${scan.target}`
                : scan.fetched
        }) Judging ${scan.domain || "your blog"}…`
      : null;
  useEffect(() => {
    if (!progressTitle) return;
    const previous = document.title;
    document.title = progressTitle;
    document.documentElement.dataset.scanning = "1";
    return () => {
      document.title = previous;
      delete document.documentElement.dataset.scanning;
    };
  }, [progressTitle]);

  const rows = useMemo(() => (scan ? buildRows(scan.pages, contextFor(scan)) : []), [scan]);
  const summary = useMemo(() => summarize(rows), [rows]);
  // The agent check looks at a few pages; once the crawl has read them all, its injection check uses every one.
  const scanAgents = scan?.agents;
  const scanPhase = scan?.phase;
  const agents = useMemo(() => {
    if (!scanAgents) return null;
    return scanPhase && isRunning(scanPhase) ? scanAgents : withCrawlEvidence(scanAgents, rows.filter(hasContent));
  }, [scanAgents, scanPhase, rows]);
  const speedRows = useMemo(() => rows.filter((r) => r.pagespeed && !r.pagespeed.error), [rows]);
  const tabCounts = useMemo(
    () => ({
      pages: { value: rows.length },
      links: { value: brokenLinkReport(rows).length, tone: "crit" as const },
      keywords: { value: cannibalizationReport(rows).length, tone: "warn" as const },
      ...(agents ? { agents: { value: agentGaps(agents).length, tone: "warn" as const } } : {}),
      ...(speedRows.length ? { speed: { value: speedRows.length } } : {}),
    }),
    [rows, agents, speedRows],
  );
  const agentValue = agents ? agentScore(agents).score : null;
  const speedValue = speedRows.length
    ? Math.round(speedRows.reduce((sum, r) => sum + (r.pagespeed!.performance ?? 0), 0) / speedRows.length)
    : undefined;
  const prompt = useMemo(() => {
    if (!scan) return undefined;
    const items = [
      ...issuePromptItems(rows),
      ...(agents ? agentPromptItems(agents) : []),
      ...speedPromptItems(speedRows.map((r) => ({ url: r.finalUrl, result: r.pagespeed! }))),
    ];
    const scores = [
      `SEO ${summary.avgScore ?? "—"}/100`,
      `AI search ${summary.avgAiScore ?? "—"}/100`,
      ...(agents ? [`AI agents ${agentScore(agents).score}/100`] : []),
      ...(speedRows.length ? [`PageSpeed performance ${speedValue}/100 (mobile, average of ${speedRows.length} pages)`] : []),
    ];
    const site = scan.startUrl || scan.settings.url;
    return {
      items,
      context: { site, scores, scope: `a scan of ${summary.total} pages on ${new Date(scan.startedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}` },
    };
  }, [scan, rows, agents, speedRows, summary, speedValue]);
  const openRow = openKey ? rows.find((r) => urlKey(r.finalUrl) === openKey) : undefined;
  const closeDrawer = useCallback(() => setOpenKey(null), []);
  const closeRules = useCallback(() => setRulesOpen(false), []);

  const commit = (next: ScanState) => {
    setScan(next);
    if (!isRunning(next.phase) && savedId === next.id) void saveScan(next);
  };
  const updatePage = (key: string, patch: Partial<CrawledPage>) => {
    if (!scan) return;
    commit({ ...scan, pages: scan.pages.map((p) => (urlKey(p.finalUrl) === key ? { ...p, ...patch } : p)) });
  };

  if (!scanUrl && !scanId) return <EmptyWorkspace />;

  if (!scan) {
    if (missing && missing === scanId) {
      return (
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <Notice tone="warn" title="We couldn't find that scan">
            Scans are saved in the browser that ran them, so this one may live on another device (or got cleaned up).
            Run a fresh one below.
          </Notice>
          <div className="mt-6">
            <ScanForm />
          </div>
        </div>
      );
    }
    return (
      <div className="shell py-10">
        <div className="h-32 animate-pulse rounded-2xl border-2 border-line bg-card" />
      </div>
    );
  }

  const running = isRunning(scan.phase);
  const site = scan.domain || siteKeyFor(scan.settings.url);
  const brand = scan.settings.brandRules;
  const rescan = () =>
    router.push(buildScanHref(scan.settings.url, scan.settings.maxPages, scan.settings.pagespeed, scan.settings.checkLinks));

  return (
    <div className="shell space-y-5 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-wider text-ink-3 uppercase">
            {running
              ? "Now judging"
              : scan.phase === "error"
                ? "Tried to judge"
                : scan.phase === "stopped"
                  ? "Judged (stopped early)"
                  : "Judged"}
          </p>
          <h1 className="truncate font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            {scan.domain ? `${scan.domain}${scan.scope ?? ""}` : prettyUrl(scan.settings.url)}
          </h1>
          <p className="text-sm text-ink-3">
            {new Date(scan.startedAt).toLocaleString()} · up to {scan.settings.maxPages} pages
            {scan.scope ? ` under ${scan.scope}` : ""}
            {scan.robotsFound ? " · robots.txt found" : ""}
            {scan.sitemapCount ? ` · ${scan.sitemapCount}${scan.sitemapTruncated ? "+" : ""} URLs in sitemap` : ""}
            {brand ? " · brand rules on" : ""}
          </p>
        </div>
        {!running && (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setRulesOpen(true)} className={headerButton}>
              Brand rules{brand ? " ✓" : ""}
            </button>
            {rows.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  downloadHtmlReport(scan, rows, summary);
                  toast("Report downloaded. Email it to someone who needs to hear it.");
                }}
                className={headerButton}
              >
                Download report
              </button>
            )}
            <button type="button" onClick={rescan} className={`${headerButton} bg-lime text-lime-ink`}>
              Rescan
            </button>
          </div>
        )}
      </div>

      {running && <ProgressPanel scan={scan} onStop={() => stopRef.current?.()} />}

      {scan.phase === "error" && (
        <Notice tone="crit" title="Well, that didn't work">
          <p>{scan.error}</p>
          <p className="mt-2">
            Double-check the address, make sure the site is public, then{" "}
            <button type="button" onClick={rescan} className="font-bold underline underline-offset-2">
              try again
            </button>
            .
          </p>
        </Notice>
      )}

      {scan.warnings.length > 0 && (
        <Notice tone="warn" title="Heads up">
          <ul className="list-disc space-y-1 pl-5">
            {scan.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </Notice>
      )}

      {rows.length > 0 && (
        <>
          <Verdict
            summary={summary}
            running={running}
            method={scan.method}
            durationMs={scan.finishedAt ? scan.finishedAt - scan.startedAt : null}
            agentScore={scan.settings.agents === false && !agents ? undefined : agentValue}
            speedScore={speedValue}
            prompt={prompt}
          />
          <Report
            summary={summary}
            counts={tabCounts}
            hidden={speedRows.length || scan.settings.pagespeed ? [] : ["speed"]}
            renderTab={(tab, issueFilter, setIssueFilter) => {
              if (tab === "links") return <LinksPanel rows={rows} scan={scan} onOpen={setOpenKey} />;
              if (tab === "keywords") return <KeywordsPanel rows={rows} onOpen={setOpenKey} />;
              if (tab === "agents") return <AgentsTabPanel scan={scan} report={agents} onReport={(report) => commit({ ...scan, agents: report, agentsError: undefined })} />;
              if (tab === "speed") return <SpeedPanel rows={rows} onOpen={setOpenKey} />;
              if (tab === "changes") return <ChangesPanel scan={scan} rows={rows} onOpen={setOpenKey} />;
              if (tab === "plan") return <PlanPanel scan={scan} rows={rows} summary={summary} onPlan={(plan) => commit({ ...scan, plan })} />;
              return (
                <PagesTable
                  rows={rows}
                  summary={summary}
                  domain={scan.domain}
                  issueFilter={issueFilter}
                  onIssueFilter={setIssueFilter}
                  onOpen={setOpenKey}
                />
              );
            }}
          />
          {(scan.skipped > 0 || scan.failed > 0) && (
            <p className="text-xs text-ink-3">
              {scan.skipped > 0 && `${scan.skipped} non-HTML URLs (feeds, files) skipped. `}
              {scan.failed > 0 && `${scan.failed} URLs couldn't be checked.`}
            </p>
          )}
        </>
      )}

      {!running && scan.phase !== "error" && rows.length === 0 && (
        <Notice tone="warn" title="We came back empty-handed">
          We couldn&apos;t read any pages. The site might block crawlers, need JavaScript to show anything, or just be
          having a day.
        </Notice>
      )}

      {openRow && (
        <PageDrawer
          row={openRow}
          features={features}
          brand={brand}
          onClose={closeDrawer}
          onUpdate={(patch) => updatePage(urlKey(openRow.finalUrl), patch)}
        />
      )}

      {rulesOpen && (
        <BrandRulesDialog
          site={site}
          initial={brand}
          onClose={closeRules}
          onSaved={(rules) => commit({ ...scan, settings: { ...scan.settings, brandRules: rules } })}
        />
      )}
    </div>
  );
}
