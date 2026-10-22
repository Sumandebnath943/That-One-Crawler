// A tiny bridge from the app to the visitor beacon: components call track() when something worth
// knowing happens (a scan starts, a tool runs), and the beacon listens. Nothing is sent from here,
// and nothing happens at all when the beacon isn't running or the visitor opted out.

import type { ActivityKind } from "@/lib/beacon/payload";

export const TRACK_EVENT = "toc:track";

/** localStorage key for "don't log my visits". Shared by the beacon, analytics and the Privacy page. */
export const OPT_OUT_KEY = "toc_beacon_off";
export const OPT_OUT_PARAM = "notrack";

export interface TrackDetail {
  kind: ActivityKind;
  label: string;
}

export function track(kind: ActivityKind, label: string): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent<TrackDetail>(TRACK_EVENT, { detail: { kind, label } }));
  } catch {
    // Never let telemetry break a feature.
  }
}

/** "https://www.example.com/blog/" → "example.com/blog" */
export function shortUrl(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
}

export function isOptedOut(): boolean {
  try {
    return localStorage.getItem(OPT_OUT_KEY) === "1";
  } catch {
    return false;
  }
}

/** Returns false when the browser blocks storage, so the choice can't be remembered. */
export function setOptOut(optOut: boolean): boolean {
  try {
    if (optOut) localStorage.setItem(OPT_OUT_KEY, "1");
    else localStorage.removeItem(OPT_OUT_KEY);
    return true;
  } catch {
    return false;
  }
}

/** ?notrack=1 silences this browser for good, ?notrack=0 undoes it. Applied before anything is sent. */
export function applyOptOutParam(): void {
  try {
    const value = new URLSearchParams(location.search).get(OPT_OUT_PARAM);
    if (value === null) return;
    setOptOut(!(value === "0" || value === "false"));
  } catch {
    // An unreadable URL or blocked storage isn't worth an error.
  }
}
