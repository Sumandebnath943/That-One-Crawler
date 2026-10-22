"use client";

/**
 * The visitor beacon: tells the site owner (on Telegram) when someone visits, what they did and
 * how they left. See /privacy for what's collected and how to opt out (?notrack=1).
 *
 * A visit is one browser tab and spans page loads, so its state lives in sessionStorage: it
 * survives a full page load and dies with the tab, which is exactly a visit's lifetime.
 *
 * At most three kinds of message per visit:
 *   arrival  once, when the visit starts
 *   event    a scan or tool run, as it starts (a few per visit at most)
 *   end      the whole visit, when the tab closes or leaves the site
 *
 * Every listener is passive, and the exit uses sendBeacon, the only send that survives unload.
 */

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import type { ActionType, BeaconActivity, BeaconKind, BeaconPage } from "@/lib/beacon/payload";
import { LIMITS } from "@/lib/beacon/payload";
import { applyOptOutParam, isOptedOut, TRACK_EVENT, type TrackDetail } from "@/lib/client/beacon-events";

const ENDPOINT = "/api/beacon";
const ARRIVAL_DELAY_MS = 900; // let the page settle without making the alert late
const IDLE_AFTER_MS = 30_000; // no input for this long stops the "active" clock
const VISIT_GAP_MS = 30 * 60_000; // a tab resumed after this long is a new visit
const INTERNAL_NAV_MS = 2_500; // an unload this soon after an internal click means "still here"
const MAX_REPORTS = 3; // someone who comes back to the tab can produce an updated report
const MAX_INSTANT_EVENTS = 5;

const VISIT_KEY = "toc_visit"; // sessionStorage: this tab's visit
const VISITOR_KEY = "toc_visitor"; // localStorage: has this browser been here before

interface Visit {
  sid: string;
  startedAt: number;
  lastActivity: number;
  activeMs: number;
  pages: BeaconPage[];
  actions: { t: number; type: ActionType; label: string; path?: string }[];
  activity: BeaconActivity[];
  scroll: { maxPx: number; maxPct: number; milestones: number[]; events: number };
  pointerMoves: number;
  clicks: number;
  keys: number;
  touches: number;
  visibilityChanges: number;
  firstActionMs: number | null;
  lastActionMs: number | null;
  arrivalSent: boolean;
  instantSent: string[];
  reportsSent: number;
  dirtySinceReport: boolean;
  pageLoads: number;
  returning: boolean;
  visitCount: number;
  sinceLastMs: number | null;
  /** Where the visit came from, kept from its first page. */
  referrer?: string;
}

let visit: Visit | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let internalNavUntil = 0;

function readJson<T>(store: Storage, key: string): T | null {
  try {
    const raw = store.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(store: Storage, key: string, value: unknown): void {
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or a full quota: losing the record isn't worth an error.
  }
}

const persist = () => visit && writeJson(sessionStorage, VISIT_KEY, visit);
const since = () => (visit ? Date.now() - visit.startedAt : 0);

function newSid(): string {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("");
}

function visitorMemory() {
  const prior = readJson<{ visits: number; lastSeen: number }>(localStorage, VISITOR_KEY);
  const now = Date.now();
  writeJson(localStorage, VISITOR_KEY, { visits: (prior?.visits ?? 0) + 1, lastSeen: now });
  return {
    returning: Boolean(prior),
    visitCount: (prior?.visits ?? 0) + 1,
    sinceLastMs: prior?.lastSeen ? Math.max(0, now - prior.lastSeen) : null,
  };
}

function loadVisit(): Visit {
  const saved = readJson<Visit>(sessionStorage, VISIT_KEY);
  // A tab left open overnight isn't one very long visit.
  if (saved?.sid && typeof saved.startedAt === "number" && Date.now() - saved.lastActivity < VISIT_GAP_MS) {
    for (const key of ["pages", "actions", "activity", "instantSent"] as const) if (!Array.isArray(saved[key])) saved[key] = [];
    return saved;
  }
  return {
    sid: newSid(),
    startedAt: Date.now(),
    lastActivity: Date.now(),
    activeMs: 0,
    pages: [],
    actions: [],
    activity: [],
    scroll: { maxPx: 0, maxPct: 0, milestones: [], events: 0 },
    pointerMoves: 0,
    clicks: 0,
    keys: 0,
    touches: 0,
    visibilityChanges: 0,
    firstActionMs: null,
    lastActionMs: null,
    arrivalSent: false,
    instantSent: [],
    reportsSent: 0,
    dirtySinceReport: true,
    pageLoads: 0,
    referrer: document.referrer || undefined,
    ...visitorMemory(),
  };
}

function markActivity() {
  if (!visit) return;
  visit.lastActivity = Date.now();
  visit.dirtySinceReport = true;
}

function recordAction(type: ActionType, label: string) {
  if (!visit) return;
  const t = since();
  visit.firstActionMs ??= t;
  visit.lastActionMs = t;
  if (visit.actions.length < LIMITS.actions) visit.actions.push({ type, label: label.slice(0, 120), t, path: location.pathname });
  markActivity();
}

/** A readable name for whatever was clicked. */
function labelFor(el: Element): string {
  const node = el.closest("a, button, [role='button'], input[type='submit'], input[type='button'], summary, label, select") ?? el;
  const aria = node.getAttribute?.("aria-label");
  if (aria) return aria.trim();
  const text = (node as HTMLElement).innerText?.trim();
  if (text) return text.replace(/\s+/g, " ").slice(0, 120);
  const title = node.getAttribute?.("title");
  if (title) return title.trim();
  if (node instanceof HTMLAnchorElement && node.href) return node.href;
  return node.tagName.toLowerCase();
}

function scrollPct(): number {
  const height = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
  if (height <= window.innerHeight) return 100;
  return Math.max(0, Math.min(100, Math.round(((window.scrollY + window.innerHeight) / height) * 100)));
}

function build(kind: BeaconKind, event?: BeaconActivity) {
  if (!visit) return null;
  // Close out the page being viewed so its time is counted.
  const pages = visit.pages.map((p) => ({ ...p }));
  const last = pages[pages.length - 1];
  if (last && last.ms === undefined) last.ms = Math.max(0, since() - last.t);
  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    v: 1 as const,
    sid: visit.sid,
    kind,
    ...(event ? { event } : {}),
    visitor: { returning: visit.returning, visitCount: visit.visitCount, sinceLastMs: visit.sinceLastMs, pageLoads: Math.max(1, visit.pageLoads) },
    path: location.pathname + location.search,
    title: document.title?.slice(0, 160),
    // Where the visit came from: the first page's referrer, not the last internal hop.
    referrer: visit.referrer,
    sessionMs: since(),
    activeMs: Math.round(visit.activeMs),
    pages,
    actions: visit.actions,
    activity: visit.activity,
    scroll: visit.scroll,
    signals: {
      pointerMoves: visit.pointerMoves,
      clicks: visit.clicks,
      keys: visit.keys,
      touches: visit.touches,
      visibilityChanges: visit.visibilityChanges,
      firstActionMs: visit.firstActionMs,
      lastActionMs: visit.lastActionMs,
      webdriver: Boolean(navigator.webdriver),
      touchSupport: "ontouchstart" in window || navigator.maxTouchPoints > 0,
      cookiesEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack === "1",
      languages: navigator.languages?.length ?? 0,
      plugins: navigator.plugins?.length ?? 0,
      hardwareConcurrency: navigator.hardwareConcurrency ?? 0,
      deviceMemory: nav.deviceMemory ?? 0,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
    },
    device: {
      screenW: screen.width,
      screenH: screen.height,
      viewportW: window.innerWidth,
      viewportH: window.innerHeight,
      dpr: window.devicePixelRatio || 1,
    },
  };
}

function send(kind: BeaconKind, viaBeacon: boolean, event?: BeaconActivity) {
  const body = build(kind, event);
  if (!body) return;
  const json = JSON.stringify(body);
  if (viaBeacon && typeof navigator.sendBeacon === "function") {
    try {
      if (navigator.sendBeacon(ENDPOINT, new Blob([json], { type: "application/json" }))) return;
    } catch {
      // Fall through to fetch.
    }
  }
  fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: json, keepalive: true }).catch(() => {
    // A dropped beacon isn't worth surfacing to the visitor.
  });
}

/** Something happened in the app (a scan, a tool run, an AI rewrite). */
function onTrack(detail: TrackDetail) {
  if (!visit || !detail?.label) return;
  const entry: BeaconActivity = { t: since(), kind: detail.kind, label: detail.label.slice(0, 160) };
  if (visit.activity.length < LIMITS.activity) visit.activity.push(entry);
  markActivity();
  // Scans and tool runs are the moments worth a ping right away; everything else waits for the report.
  const key = `${detail.kind}|${detail.label}`;
  if ((detail.kind === "scan" || detail.kind === "tool") && !visit.instantSent.includes(key) && visit.instantSent.length < MAX_INSTANT_EVENTS) {
    visit.instantSent.push(key);
    persist();
    send("event", false, entry);
    return;
  }
  persist();
}

function endVisit() {
  if (!visit || visit.reportsSent >= MAX_REPORTS) return;
  if (visit.reportsSent > 0 && !visit.dirtySinceReport) return;
  visit.reportsSent += 1;
  visit.dirtySinceReport = false;
  persist();
  send("end", true);
}

function shouldRun(): boolean {
  if (typeof window === "undefined") return false;
  // Do Not Track isn't treated as an opt-out (it's often switched on by extensions without the
  // person knowing); it's reported in the alert. The opt-out is ?notrack=1, or the Privacy page.
  applyOptOutParam();
  if (isOptedOut()) return false;
  if (process.env.NEXT_PUBLIC_BEACON_DEBUG === "1") return true;
  if (process.env.NODE_ENV !== "production") return false;
  return !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
}

export function Beacon() {
  const pathname = usePathname();

  useEffect(() => {
    if (!shouldRun()) return;
    if (!visit) {
      visit = loadVisit();
      visit.pageLoads += 1;
      const path = location.pathname + location.search;
      const last = visit.pages[visit.pages.length - 1];
      if (last && last.ms === undefined) last.ms = Math.max(0, since() - last.t);
      if (visit.pages.length < LIMITS.pages) visit.pages.push({ path, title: document.title.slice(0, 160), t: since() });
      visit.scroll.maxPct = Math.max(visit.scroll.maxPct, scrollPct());
      persist();
    }
    const v = visit;
    const passive = { passive: true } as const;

    const onPointerMove = () => {
      v.pointerMoves += 1;
      markActivity();
    };
    const onScroll = () => {
      v.scroll.events += 1;
      v.scroll.maxPx = Math.max(v.scroll.maxPx, Math.round(window.scrollY));
      v.scroll.maxPct = Math.max(v.scroll.maxPct, scrollPct());
      for (const m of [25, 50, 75, 100]) if (v.scroll.maxPct >= m && !v.scroll.milestones.includes(m)) v.scroll.milestones.push(m);
      markActivity();
    };
    const onClick = (e: MouseEvent) => {
      v.clicks += 1;
      const el = e.target as Element | null;
      if (!el?.closest) return markActivity();
      const anchor = el.closest("a") as HTMLAnchorElement | null;
      // A same-site link means the tab is moving, not leaving.
      if (anchor?.href && anchor.origin === location.origin && !anchor.target) internalNavUntil = Date.now() + INTERNAL_NAV_MS;
      const type: ActionType = anchor?.hasAttribute("download") ? "download" : anchor?.href && anchor.origin !== location.origin ? "external" : "click";
      recordAction(type, labelFor(el));
      persist();
    };
    const onKey = () => {
      v.keys += 1;
      markActivity();
    };
    const onTouch = () => {
      v.touches += 1;
      markActivity();
    };
    const onSubmit = (e: Event) => {
      internalNavUntil = Date.now() + INTERNAL_NAV_MS;
      const form = e.target as HTMLFormElement | null;
      recordAction("submit", form?.getAttribute("aria-label") ?? form?.getAttribute("name") ?? form?.id ?? "form");
      persist();
    };
    const onCopy = () => recordAction("copy", "copied text");
    const onVisibility = () => {
      v.visibilityChanges += 1;
      if (document.visibilityState === "hidden") persist();
      else markActivity();
    };
    const onPageHide = () => {
      persist();
      if (Date.now() < internalNavUntil) return; // still on the site: the next page resumes this visit
      endVisit();
    };
    const onTrackEvent = (e: Event) => onTrack((e as CustomEvent<TrackDetail>).detail);

    window.addEventListener("pointermove", onPointerMove, passive);
    window.addEventListener("scroll", onScroll, passive);
    window.addEventListener("click", onClick, true);
    window.addEventListener("keydown", onKey, passive);
    window.addEventListener("touchstart", onTouch, passive);
    window.addEventListener("submit", onSubmit, true);
    document.addEventListener("copy", onCopy, passive);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener(TRACK_EVENT, onTrackEvent);

    // Active time, plus a periodic save so a crash doesn't lose the visit.
    timer ??= setInterval(() => {
      if (document.visibilityState !== "visible" || Date.now() - v.lastActivity > IDLE_AFTER_MS) return;
      v.activeMs += 1000;
      if (v.activeMs % 5000 === 0) persist();
    }, 1000);

    // Announced once per visit, not once per page load.
    const arrival = v.arrivalSent
      ? null
      : setTimeout(() => {
          if (v.arrivalSent) return;
          v.arrivalSent = true;
          persist();
          send("arrival", false);
        }, ARRIVAL_DELAY_MS);

    return () => {
      if (arrival) clearTimeout(arrival);
      if (timer) clearInterval(timer);
      timer = null;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTouch);
      window.removeEventListener("submit", onSubmit, true);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener(TRACK_EVENT, onTrackEvent);
    };
  }, []);

  // Client-side route changes.
  useEffect(() => {
    const v = visit;
    if (!v) return;
    const path = location.pathname + location.search;
    const last = v.pages[v.pages.length - 1];
    if (last?.path === path) return;
    if (last && last.ms === undefined) last.ms = Math.max(0, since() - last.t);
    if (v.pages.length < LIMITS.pages) v.pages.push({ path, title: document.title.slice(0, 160), t: since() });
    markActivity();
    persist();
  }, [pathname]);

  return null;
}
