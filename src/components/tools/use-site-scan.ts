"use client";

import { useEffect, useRef, useState } from "react";
import { runScan, type ScanSettings, type ScanState } from "@/lib/client/crawl";
import { saveScan } from "@/lib/client/history";

/**
 * Runs a focused site crawl for a tool page. Finished crawls are saved like any scan, so
 * "Open the full report" can show everything else the crawl found.
 */
export function useSiteScan() {
  const [scan, setScan] = useState<ScanState | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const current = useRef<AbortController | null>(null);

  useEffect(() => () => current.current?.abort("unmount"), []);

  const start = (settings: ScanSettings) => {
    current.current?.abort("restart");
    const controller = new AbortController();
    current.current = controller;
    const live = () => current.current === controller && controller.signal.reason !== "unmount";
    setSavedId(null);
    setScan(null);
    runScan(settings, (state) => live() && setScan(state), controller.signal).then(async (final) => {
      if (!live() || final.phase === "error") return;
      if (await saveScan(final)) setSavedId(final.id);
    });
  };

  const stop = () => current.current?.abort("stop");

  return { scan, savedId, start, stop };
}
