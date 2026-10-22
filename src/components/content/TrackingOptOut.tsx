"use client";

import { useSyncExternalStore, useState } from "react";
import { isOptedOut, OPT_OUT_KEY, setOptOut } from "@/lib/client/beacon-events";

// The visitor's own switch for visit notifications (and Google Analytics, when it's on). It reads
// and writes the same key the beacon checks, so what it shows is the real state of this browser.

type State = "loading" | "on" | "off" | "unavailable";

export function TrackingOptOut() {
  // What the browser says right now; null on the server. A click overrides it until the next render.
  const stored = useSyncExternalStore<State>(
    () => () => {},
    () => {
      try {
        localStorage.getItem(OPT_OUT_KEY);
        return isOptedOut() ? "off" : "on";
      } catch {
        return "unavailable";
      }
    },
    () => "loading",
  );
  const [chosen, setChosen] = useState<State | null>(null);
  const state = chosen ?? stored;

  const toggle = () => {
    const next = state !== "off";
    setChosen(setOptOut(next) ? (next ? "off" : "on") : "unavailable");
  };

  const off = state === "off";
  return (
    <div id="opt-out" className={`scroll-mt-24 rounded-2xl border-2 border-ink p-5 shadow-brutal ${off ? "bg-card" : "bg-lime text-lime-ink theme-light"}`}>
      <div className="flex flex-wrap items-center gap-4">
        <span aria-hidden className={`grid size-12 shrink-0 place-items-center rounded-xl border-2 border-ink text-2xl ${off ? "bg-sunk" : "bg-paper"}`}>
          {off ? "🙈" : "👀"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold tracking-wider uppercase opacity-70">This browser</p>
          <p className="font-display text-xl leading-snug font-extrabold" aria-live="polite">
            {state === "loading" && "Checking…"}
            {state === "on" && "Your visits are logged, as described on this page."}
            {state === "off" && "Your visits aren't logged. Nothing is collected or sent."}
            {state === "unavailable" && "This browser blocks storage, so the choice can't be saved here."}
          </p>
        </div>
        {(state === "on" || state === "off") && (
          <button
            type="button"
            role="switch"
            aria-checked={!off}
            aria-label="Log my visits"
            onClick={toggle}
            className="rounded-xl border-2 border-ink bg-paper px-4 py-2 font-bold text-ink transition hover:-translate-y-0.5 hover:shadow-brutal-sm"
          >
            {off ? "Turn logging back on" : "Don't log my visits"}
          </button>
        )}
      </div>
      {/* Plain links on purpose: the opt-out is read on a full page load, which <Link> would skip. */}
      {/* eslint-disable @next/next/no-html-link-for-pages */}
      <p className="mt-4 text-sm opacity-80">
        Same thing as a link you can bookmark: <a href="/?notrack=1" className="font-bold underline underline-offset-2">/?notrack=1</a> (undo with{" "}
        <a href="/?notrack=0" className="font-bold underline underline-offset-2">/?notrack=0</a>). The choice is saved in this browser only.
      </p>
    </div>
  );
}
