"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { deleteScan, listScans, type ScanSummary } from "@/lib/client/history";
import { ScoreBadge } from "./scan/bits";

function timeAgo(ms: number, now: number): string {
  const minutes = Math.round((now - ms) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

/** The visitor's own past scans, straight from IndexedDB. Renders nothing if there are none. */
export function RecentScans() {
  const [scans, setScans] = useState<ScanSummary[] | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    let alive = true;
    listScans().then((list) => {
      if (!alive) return;
      setNow(Date.now());
      setScans(list);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!scans?.length) return null;

  const remove = async (id: string) => {
    await deleteScan(id);
    setScans((list) => list?.filter((s) => s.id !== id) ?? null);
  };

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pt-10 sm:px-6" aria-labelledby="recent-heading">
      <div className="rounded-2xl border-2 border-ink bg-card p-4 shadow-brutal sm:p-5">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 id="recent-heading" className="font-display text-xl font-extrabold">
            Your recent judgments
          </h2>
          <span className="text-xs text-ink-3">Saved in this browser only</span>
        </div>
        <ul className="divide-y-2 divide-dashed divide-line">
          {scans.slice(0, 6).map((scan) => (
            <li key={scan.id} className="flex items-center gap-3 py-2.5">
              <ScoreBadge score={scan.avgScore} />
              <Link href={`/scan?id=${scan.id}`} className="min-w-0 flex-1 hover:underline">
                <span className="block truncate font-mono text-sm font-semibold">{scan.domain || scan.startUrl}</span>
                <span className="block text-xs text-ink-3">
                  {scan.pageCount} pages · {scan.critical} critical · {timeAgo(scan.startedAt, now)}
                  {scan.phase === "stopped" ? " · stopped early" : ""}
                </span>
              </Link>
              <button
                type="button"
                onClick={() => remove(scan.id)}
                className="rounded-full px-2 py-1 text-xs font-semibold text-ink-3 hover:bg-sunk hover:text-crit"
                aria-label={`Forget the scan of ${scan.domain}`}
              >
                Forget
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
