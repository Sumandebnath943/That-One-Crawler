"use client";

import { useEffect } from "react";
import { isDaddyMode, setDaddyMode } from "@/lib/client/quirks";
import { DanglingSpider } from "./DanglingSpider";
import { Toaster } from "./Toaster";

const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
const AWAY_TITLE = "👀 Psst… your blog still has issues";

/** Site-wide quirks: toasts, the dangling spider, the Konami code and the come-back tab title. */
export function GlobalQuirks() {
  useEffect(() => {
    let progress = 0;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest("input, textarea, select, [contenteditable]")) return;
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      progress = key === KONAMI[progress] ? progress + 1 : key === KONAMI[0] ? 1 : 0;
      if (progress === KONAMI.length) {
        progress = 0;
        setDaddyMode(!isDaddyMode());
      }
    };

    let savedTitle: string | null = null;
    const onVisibility = () => {
      // While a scan runs, the tab title shows its progress instead.
      if (document.documentElement.dataset.scanning) return;
      if (document.hidden) {
        savedTitle = document.title;
        document.title = AWAY_TITLE;
      } else if (savedTitle !== null && document.title === AWAY_TITLE) {
        document.title = savedTitle;
        savedTitle = null;
      }
    };

    window.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <>
      <Toaster />
      <DanglingSpider />
    </>
  );
}
