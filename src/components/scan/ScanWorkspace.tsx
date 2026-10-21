"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { isRunning, runScan, type ScanState } from "@/lib/client/crawl";
import { loadScan, saveScan } from "@/lib/client/history";
import { useFeatures } from "@/lib/client/use-features";
import { DEFAULT_PAGE_LIMIT, MAX_PAGES_LIMIT } from "@/lib/limits";
import { buildRows, summarize } from "@/lib/seo/report";
import type { CrawledPage } from "@/lib/seo/types";
import { prettyUrl, urlKey } from "@/lib/seo/url";
import { Mascot } from "../Mascot";
import { RecentScans } from "../RecentScans";
import { buildScanHref, ScanForm } from "../ScanForm";
import { PageDrawer } from "./PageDrawer";
import { ProgressPanel } from "./ProgressPanel";
import { Report, Verdict } from "./Report";

function EmptyWorkspace() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <div className="flex items-center gap-4">
        <Mascot className="size-20 shrink-0" />
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

function Notice({ tone, title, children }: { tone: "warn" | "crit"; title: string; children: ReactNode }) {
  return (
    <div className={`rounded-2xl border-2 p-4 ${tone === "crit" ? "border-crit bg-crit/10" : "border-warn bg-warn/10"}`}>
      <p className={`font-display text-lg font-extrabold ${tone === "crit" ? "text-crit" : "text-warn"}`}>{title}</p>
      <div className="mt-1 text-sm text-ink-2">{children}</div>
    </div>
  );
}

export function ScanWorkspace() {
  const params = useSearchParams();
  const router = useRouter();
  const features = useFeatures();

  const scanUrl = params.get("url");
  const scanId = params.get("id");
  const maxPages = Math.min(Math.max(Number(params.get("max")) || DEFAULT_PAGE_LIMIT, 1), MAX_PAGES_LIMIT);
  const wantPagespeed = params.get("ps") === "1";

  const [scan, setScan] = useState<ScanState | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [missing, setMissing] = useState<string | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const currentId = useRef<string | null>(null);

  // A ?url= in the address bar means "start a fresh scan".
  useEffect(() => {
    if (!scanUrl) return;
    const controller = new AbortController();
    const live = () => !controller.signal.aborted || controller.signal.reason === "stop";
    stopRef.current = () => controller.abort("stop");

    runScan(
      { url: scanUrl, maxPages, pagespeed: wantPagespeed },
      (state) => {
        if (!live()) return;
        currentId.current = state.id;
        setScan(state);
      },
      controller.signal,
    ).then(async (final) => {
      if (!live() || final.phase === "error") return;
      if (await saveScan(final)) {
        setSavedId(final.id);
        // Swap ?url= for ?id= so a refresh shows this result instead of re-crawling.
        if (live()) router.replace(`/scan?id=${final.id}`, { scroll: false });
      }
    });

    return () => controller.abort("unmount");
  }, [scanUrl, maxPages, wantPagespeed, router]);

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

  const rows = useMemo(() => (scan ? buildRows(scan.pages, scan.robots) : []), [scan]);
  const summary = useMemo(() => summarize(rows), [rows]);
  const openRow = openKey ? rows.find((r) => urlKey(r.finalUrl) === openKey) : undefined;
  const closeDrawer = useCallback(() => setOpenKey(null), []);

  const updatePage = (key: string, patch: Partial<CrawledPage>) => {
    if (!scan) return;
    const next = { ...scan, pages: scan.pages.map((p) => (urlKey(p.finalUrl) === key ? { ...p, ...patch } : p)) };
    setScan(next);
    if (!isRunning(next.phase) && savedId === next.id) void saveScan(next);
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
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="h-32 animate-pulse rounded-2xl border-2 border-line bg-card" />
      </div>
    );
  }

  const running = isRunning(scan.phase);
  const rescan = () => router.push(buildScanHref(scan.settings.url, scan.settings.maxPages, scan.settings.pagespeed));

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-8 sm:px-6">
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
          </p>
        </div>
        {!running && (
          <button
            type="button"
            onClick={rescan}
            className="rounded-xl border-2 border-ink bg-card px-4 py-2 font-bold shadow-brutal-sm transition hover:-translate-y-0.5"
          >
            Rescan
          </button>
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
          />
          <Report rows={rows} summary={summary} domain={scan.domain} onOpen={setOpenKey} />
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
          onClose={closeDrawer}
          onUpdate={(patch) => updatePage(urlKey(openRow.finalUrl), patch)}
        />
      )}
    </div>
  );
}
