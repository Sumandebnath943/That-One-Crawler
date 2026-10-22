// The visitor beacon's payload, and the only way it gets into the server: parseBeacon().
//
// Everything here is reported by a browser, so it's untrusted and bounded on every axis: a crafted
// request can't blow up a Telegram message or the server's memory. Network facts (IP, location,
// user agent) are never taken from the payload; the server reads them from the request.

export type BeaconKind = "arrival" | "event" | "end";
/** Things that happen on That One Crawler worth knowing about. */
export type ActivityKind = "scan" | "scan_done" | "tool" | "ai";
export type ActionType = "click" | "submit" | "copy" | "download" | "external";

export interface BeaconActivity {
  /** Milliseconds since the visit started. */
  t: number;
  kind: ActivityKind;
  /** "example.com · up to 300 pages", "Broken link checker · example.com", "title & meta"… */
  label: string;
}

export interface BeaconAction {
  t: number;
  type: ActionType;
  label: string;
  path?: string;
}

export interface BeaconPage {
  path: string;
  title?: string;
  t: number;
  ms?: number;
}

export interface BeaconPayload {
  v: 1;
  sid: string;
  kind: BeaconKind;
  /** Set when kind is "event": the activity that triggered it. */
  event?: BeaconActivity;
  path: string;
  title?: string;
  referrer?: string;
  visitor: { returning: boolean; visitCount: number; sinceLastMs: number | null; pageLoads: number };
  sessionMs: number;
  activeMs: number;
  pages: BeaconPage[];
  actions: BeaconAction[];
  activity: BeaconActivity[];
  scroll: { maxPx: number; maxPct: number; milestones: number[]; events: number };
  signals: {
    pointerMoves: number;
    clicks: number;
    keys: number;
    touches: number;
    visibilityChanges: number;
    firstActionMs: number | null;
    lastActionMs: number | null;
    webdriver: boolean;
    touchSupport: boolean;
    cookiesEnabled: boolean;
    doNotTrack: boolean;
    languages: number;
    plugins: number;
    hardwareConcurrency: number;
    deviceMemory: number;
    timezone?: string;
    language?: string;
  };
  device: { screenW: number; screenH: number; viewportW: number; viewportH: number; dpr: number };
}

export const LIMITS = { pages: 40, actions: 30, activity: 20 } as const;

const DAY = 86_400_000;
const KINDS: BeaconKind[] = ["arrival", "event", "end"];
const ACTIVITY: ActivityKind[] = ["scan", "scan_done", "tool", "ai"];
const ACTIONS: ActionType[] = ["click", "submit", "copy", "download", "external"];

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const int = (v: unknown, max: number, fallback = 0): number =>
  typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.round(v))) : fallback;
const real = (v: unknown, max: number, fallback = 0): number =>
  typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(max, v)) : fallback;
const intOrNull = (v: unknown, max: number): number | null => (typeof v === "number" && Number.isFinite(v) ? int(v, max) : null);
const text = (v: unknown, max: number): string | undefined => {
  if (typeof v !== "string") return undefined;
  // Control characters have no business in an alert.
  const clean = v.replace(/[\u0000-\u001f\u007f]+/g, " ").trim();
  return clean ? clean.slice(0, max) : undefined;
};
const bool = (v: unknown, fallback = false) => (typeof v === "boolean" ? v : fallback);
const list = (v: unknown, max: number): unknown[] => (Array.isArray(v) ? v.slice(0, max) : []);
const oneOf = <T extends string>(v: unknown, options: readonly T[]): T | undefined =>
  typeof v === "string" && (options as readonly string[]).includes(v) ? (v as T) : undefined;

function activity(v: unknown): BeaconActivity | null {
  const a = obj(v);
  const kind = oneOf(a.kind, ACTIVITY);
  const label = text(a.label, 160);
  return kind && label ? { t: int(a.t, DAY), kind, label } : null;
}

/** A clean, bounded payload, or null when the body isn't a beacon at all. */
export function parseBeacon(input: unknown): BeaconPayload | null {
  const b = obj(input);
  const kind = oneOf(b.kind, KINDS);
  const sid = typeof b.sid === "string" && /^[a-z0-9]{6,40}$/i.test(b.sid) ? b.sid : null;
  const path = text(b.path, 300);
  if (b.v !== 1 || !kind || !sid || !path || !path.startsWith("/")) return null;

  const event = kind === "event" ? activity(b.event) : null;
  if (kind === "event" && !event) return null;

  const visitor = obj(b.visitor);
  const scroll = obj(b.scroll);
  const s = obj(b.signals);
  const device = obj(b.device);

  return {
    v: 1,
    sid,
    kind,
    ...(event ? { event } : {}),
    path,
    title: text(b.title, 160),
    referrer: text(b.referrer, 400),
    visitor: {
      returning: bool(visitor.returning),
      visitCount: Math.max(1, int(visitor.visitCount, 100_000, 1)),
      sinceLastMs: intOrNull(visitor.sinceLastMs, 365 * DAY),
      pageLoads: Math.max(1, int(visitor.pageLoads, 500, 1)),
    },
    sessionMs: int(b.sessionMs, DAY),
    activeMs: int(b.activeMs, DAY),
    pages: list(b.pages, LIMITS.pages)
      .map((p): BeaconPage | null => {
        const page = obj(p);
        const pagePath = text(page.path, 300);
        if (!pagePath) return null;
        return {
          path: pagePath,
          title: text(page.title, 160),
          t: int(page.t, DAY),
          ...(typeof page.ms === "number" ? { ms: int(page.ms, DAY) } : {}),
        };
      })
      .filter((p): p is BeaconPage => p !== null),
    actions: list(b.actions, LIMITS.actions)
      .map((a): BeaconAction | null => {
        const action = obj(a);
        const type = oneOf(action.type, ACTIONS);
        const label = text(action.label, 120);
        return type && label ? { t: int(action.t, DAY), type, label, path: text(action.path, 300) } : null;
      })
      .filter((a): a is BeaconAction => a !== null),
    activity: list(b.activity, LIMITS.activity)
      .map(activity)
      .filter((a): a is BeaconActivity => a !== null),
    scroll: {
      maxPx: int(scroll.maxPx, 2_000_000),
      maxPct: int(scroll.maxPct, 100),
      milestones: list(scroll.milestones, 4).filter((m): m is number => m === 25 || m === 50 || m === 75 || m === 100),
      events: int(scroll.events, 100_000),
    },
    signals: {
      pointerMoves: int(s.pointerMoves, 1_000_000),
      clicks: int(s.clicks, 10_000),
      keys: int(s.keys, 100_000),
      touches: int(s.touches, 10_000),
      visibilityChanges: int(s.visibilityChanges, 10_000),
      firstActionMs: intOrNull(s.firstActionMs, DAY),
      lastActionMs: intOrNull(s.lastActionMs, DAY),
      webdriver: bool(s.webdriver),
      touchSupport: bool(s.touchSupport),
      cookiesEnabled: bool(s.cookiesEnabled, true),
      doNotTrack: bool(s.doNotTrack),
      languages: int(s.languages, 50),
      plugins: int(s.plugins, 200),
      hardwareConcurrency: int(s.hardwareConcurrency, 1024),
      deviceMemory: real(s.deviceMemory, 1024),
      timezone: text(s.timezone, 60),
      language: text(s.language, 35),
    },
    device: {
      screenW: int(device.screenW, 30_000),
      screenH: int(device.screenH, 30_000),
      viewportW: int(device.viewportW, 30_000),
      viewportH: int(device.viewportH, 30_000),
      dpr: real(device.dpr, 10, 1),
    },
  };
}
