"use client";

import { useEffect, useState } from "react";
import type { ScanState } from "@/lib/client/crawl";
import { CRAWLING_QUIPS, DISCOVERY_QUIPS, LINK_QUIPS, PAGESPEED_QUIPS } from "@/lib/client/jokes";
import { displayPath } from "@/lib/seo/url";
import { Mascot } from "../Mascot";

function formatSeconds(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}

export function ProgressPanel({ scan, onStop }: { scan: ScanState; onStop: () => void }) {
  const [now, setNow] = useState(scan.startedAt);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const elapsedSeconds = Math.max(0, (now - scan.startedAt) / 1000);
  const tick = Math.floor(elapsedSeconds / 4);

  let label: string;
  let quips: string[];
  let done = 0;
  let total: number | null = null;
  if (scan.phase === "discovering") {
    label = "Finding your pages";
    quips = DISCOVERY_QUIPS;
  } else if (scan.phase === "pagespeed") {
    label = "Running PageSpeed";
    quips = PAGESPEED_QUIPS;
    done = scan.psDone;
    total = scan.psTotal;
  } else if (scan.phase === "links") {
    label = "Checking links and images";
    quips = LINK_QUIPS;
    done = scan.lcDone;
    total = scan.lcTotal;
  } else {
    label = scan.method === "sitemap" ? "Reading pages from your sitemap" : "Following links";
    quips = CRAWLING_QUIPS;
    done = scan.fetched;
    total = scan.target ?? Math.min(scan.settings.maxPages, scan.fetched + scan.queued);
  }

  const fraction = total ? Math.min(1, done / total) : null;
  const rate = elapsedSeconds > 3 && done > 0 ? done / elapsedSeconds : 0;
  // Only the crawl phase has a steady enough rate (since the start) to estimate from.
  const remaining = scan.phase === "crawling" && total && rate && done >= 6 ? (total - done) / rate : null;

  return (
    <section
      aria-live="polite"
      className="rise flex flex-col gap-4 rounded-2xl border-2 border-ink bg-card p-5 shadow-brutal sm:flex-row sm:items-center"
    >
      <Mascot pokeable className="wobble size-20 shrink-0 self-center" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="font-display text-2xl font-extrabold">{label}…</h2>
          <span className="font-mono text-sm text-ink-2 tabular-nums">
            {[
              total ? `${done} / ${total}` : done ? `${done} checked` : "",
              formatSeconds(elapsedSeconds),
              remaining !== null ? `~${formatSeconds(remaining)} left` : "",
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>
        <p className="mt-1 text-ink-2">{quips[tick % quips.length]}</p>
        <div className="relative mt-8">
          <div className="h-4 overflow-hidden rounded-full border-2 border-ink bg-paper">
            {fraction === null ? (
              <div className="bar-indeterminate h-full w-2/5 rounded-full bg-lime" />
            ) : (
              <div
                className="h-full rounded-full bg-lime transition-[width] duration-500"
                style={{ width: `${Math.max(3, fraction * 100)}%` }}
              />
            )}
          </div>
          {/* A tiny crawler walking the bar: patrolling while we don't know the total, riding the edge once we do. */}
          <div
            aria-hidden
            className={`absolute -top-6 size-7 ${fraction === null ? "crawl-patrol" : "transition-[left] duration-500"}`}
            style={fraction === null ? undefined : { left: `calc(${Math.max(3, fraction * 100)}% - 1.1rem)` }}
          >
            <Mascot className="crawl-bob size-7" follow={false} />
          </div>
        </div>
        <ul className="mt-2 space-y-0.5 font-mono text-xs text-ink-3">
          {scan.active.slice(0, 3).map((url) => (
            <li key={url} className="truncate">
              → {displayPath(url)}
            </li>
          ))}
        </ul>
      </div>
      <button
        type="button"
        onClick={onStop}
        className="shrink-0 rounded-xl border-2 border-ink bg-paper px-4 py-2 font-bold transition hover:-translate-y-0.5 hover:shadow-brutal-sm"
      >
        Stop &amp; keep results
      </button>
    </section>
  );
}
