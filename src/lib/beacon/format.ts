import { SITE_URL } from "@/lib/site";
import { describeClient, trafficSource, type Source, type Verdict } from "./bot";
import { describePlace, mapLink, type Geo } from "./geo";
import type { BeaconActivity, BeaconPayload } from "./payload";
import { clip, esc } from "./telegram";

// Visitor alerts, formatted for Telegram (HTML mode). Three per visit at most:
//   arrival  when the visit starts: who, from where, which page, how they found us
//   event    a scan or tool run, as it starts (capped per visit)
//   end      the whole visit in one message: journey, what they did, how human they looked

const OWN_HOST = (() => {
  try {
    return new URL(SITE_URL).hostname;
  } catch {
    return undefined;
  }
})();

export function duration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return s % 60 ? `${m}m ${s % 60}s` : `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return m % 60 ? `${h}h ${m % 60}m` : `${h}h`;
  const d = Math.floor(h / 24);
  return h % 24 ? `${d}d ${h % 24}h` : `${d}d`;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function verdictIcon(v: Verdict): string {
  return v.score >= 80 ? "🧑" : v.score >= 62 ? "🙂" : v.score >= 40 ? "❔" : v.score >= 20 ? "🤖" : "⛔️";
}

function verdictLine(v: Verdict, provisional: boolean): string {
  return (
    `${verdictIcon(v)} <b>${v.label}</b> ${v.score}/100${provisional ? " <i>(first impression)</i>" : ""}` +
    (v.reasons.length ? ` · ${esc(v.reasons.join(", "))}` : "")
  );
}

/** The visitor's own wall-clock time, which says more than the server's UTC. */
function localTime(tz: string | undefined): string {
  const now = new Date();
  if (tz) {
    try {
      const local = new Intl.DateTimeFormat("en-GB", { timeZone: tz, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(now);
      return `${local} their time (${esc(tz)})`;
    } catch {
      // Fall through to UTC.
    }
  }
  return now.toUTCString().replace("GMT", "UTC");
}

/** Location, never more precise than it really is. */
function locationBlock(geo: Geo): string[] {
  const lines: string[] = [];
  const flag = geo.flag ? ` ${geo.flag}` : "";
  if (geo.precision === "city") {
    lines.push(`📍 <b>${esc(describePlace(geo))}</b>${flag}`);
    const coords = geo.latitude && geo.longitude ? `${Number(geo.latitude).toFixed(3)}, ${Number(geo.longitude).toFixed(3)}` : null;
    const bits = [geo.postal ? `postal ${esc(geo.postal)}` : null, coords, geo.timezone ? esc(geo.timezone) : null].filter(Boolean);
    if (bits.length) lines.push(`   ${bits.join(" · ")}`);
  } else if (geo.precision === "country") {
    lines.push(`📍 <b>${esc(describePlace(geo))}</b>${flag} <i>(country only, no map pin)</i>`);
  } else {
    lines.push("📍 <b>Location unknown</b> <i>(private or local address)</i>");
  }
  const net = [geo.isp ? esc(clip(geo.isp, 42)) : null, geo.asn ? esc(geo.asn) : null].filter(Boolean).join(" · ");
  lines.push(`🛰 <code>${esc(geo.ip)}</code>${net ? ` · ${net}` : ""}`);
  if (geo.mobile) lines.push("   📶 mobile network: the city may be the carrier's gateway");
  if (geo.datacenter) lines.push("   ⚠️ datacenter or hosting network (VPN, proxy or bot)");
  if (geo.disagreement) lines.push(`   ℹ️ sources differ: ${esc(geo.disagreement)}`);
  const link = mapLink(geo);
  if (link) lines.push(`   <a href="${link}">open in maps</a>`);
  return lines;
}

/** One line for events: enough to tell visitors apart. */
function shortWho(payload: BeaconPayload, geo: Geo, ua: string): string {
  const place = geo.precision === "unknown" ? "unknown location" : describePlace(geo);
  const visit = payload.visitor.returning ? `visit #${payload.visitor.visitCount}` : "first visit";
  return `👤 ${esc(place)}${geo.flag ? ` ${geo.flag}` : ""} · ${esc(describeClient(ua))} · ${visit}`;
}

function sourceLine(source: Source): string {
  switch (source.kind) {
    case "ai":
      return `✨ <b>Came from ${esc(source.name)}</b>: an AI answer linked here`;
    case "search":
      return `🔎 from ${esc(source.name)} search`;
    case "social":
      return `💬 from ${esc(source.name)}`;
    case "site":
      return `↩️ from ${esc(clip(source.name, 80))}`;
    default:
      return `↩️ ${esc(source.name)}`;
  }
}

const ACTIVITY_ICON: Record<BeaconActivity["kind"], string> = { scan: "🔍", scan_done: "📊", tool: "🛠", ai: "✦" };
const ACTIVITY_VERB: Record<BeaconActivity["kind"], string> = { scan: "Started a scan:", scan_done: "Scan finished:", tool: "Used", ai: "AI:" };

export function formatArrival(payload: BeaconPayload, geo: Geo, verdict: Verdict, ua: string): string {
  const v = payload.visitor;
  const source = trafficSource(payload.referrer, payload.path, OWN_HOST);
  const lines = [
    v.returning
      ? `🔁 <b>Returning visitor</b> · visit #${v.visitCount}${v.sinceLastMs !== null ? ` · last here ${duration(v.sinceLastMs)} ago` : ""}`
      : "🟢 <b>New visitor</b> on That One Crawler",
    "",
    ...locationBlock(geo),
    "",
    `📄 <b>${esc(clip(payload.path, 90))}</b>`,
    ...(payload.title ? [`   ${esc(clip(payload.title, 80))}`] : []),
    sourceLine(source),
    ...(source.kind !== "direct" && payload.referrer ? [`   <i>${esc(clip(payload.referrer, 90))}</i>`] : []),
    "",
    `💻 ${esc(describeClient(ua))} · ${payload.device.viewportW}×${payload.device.viewportH}${payload.signals.language ? ` · ${esc(payload.signals.language)}` : ""}`,
    verdictLine(verdict, true),
    ...(payload.signals.doNotTrack ? ["🔕 <i>Their browser sends Do Not Track</i>"] : []),
    `🕒 ${localTime(payload.signals.timezone)}`,
  ];
  return lines.join("\n");
}

export function formatEvent(payload: BeaconPayload, geo: Geo, ua: string): string {
  const e = payload.event!;
  const title =
    e.kind === "scan" ? "🔍 <b>Scan started</b>" : e.kind === "tool" ? "🛠 <b>Tool used</b>" : e.kind === "scan_done" ? "📊 <b>Scan finished</b>" : "✦ <b>AI tool used</b>";
  return [`${title} on That One Crawler`, "", `<b>${esc(clip(e.label, 160))}</b>`, "", shortWho(payload, geo, ua), `📄 from ${esc(clip(payload.path, 80))}`].join("\n");
}

export function formatEnd(payload: BeaconPayload, geo: Geo, verdict: Verdict, ua: string): string {
  const s = payload.signals;
  const lines: string[] = [
    "📋 <b>Visit ended</b> on That One Crawler",
    "",
    `⏱ <b>${duration(payload.sessionMs)}</b> on site · <b>${duration(payload.activeMs)}</b> active`,
    `🚪 entered on <b>${esc(clip(payload.pages[0]?.path ?? payload.path, 50))}</b> · left from <b>${esc(clip(payload.path, 50))}</b>`,
  ];

  if (payload.pages.length) {
    const journey = payload.pages.map((p) => `${esc(clip(p.path, 40))}${p.ms ? ` (${duration(p.ms)})` : ""}`).join("  →  ");
    lines.push(`🧭 <b>${plural(payload.pages.length, "page")}</b>`, `   ${clip(journey, 420)}`);
  }

  if (payload.activity.length) {
    lines.push("", "🔍 <b>What they did</b>");
    for (const a of payload.activity.slice(0, 10)) {
      lines.push(`   ${ACTIVITY_ICON[a.kind]} ${ACTIVITY_VERB[a.kind]} ${esc(clip(a.label, 110))}`);
    }
    if (payload.activity.length > 10) lines.push(`   …and ${payload.activity.length - 10} more`);
  }

  const sc = payload.scroll;
  lines.push(
    "",
    `📜 scrolled <b>${sc.maxPct}%</b>${sc.milestones.length ? ` · passed ${sc.milestones.join("/")}` : ""} · ${plural(sc.events, "scroll event")}`,
  );
  if (payload.actions.length) {
    lines.push(`🖱 <b>${plural(payload.actions.length, "action")}</b>`);
    for (const a of payload.actions.slice(0, 10)) lines.push(`   ${duration(a.t)} · ${a.type} · ${esc(clip(a.label, 60))}`);
    if (payload.actions.length > 10) lines.push(`   …and ${payload.actions.length - 10} more`);
  } else {
    lines.push("🖱 no clicks on anything");
  }
  lines.push(`🎛 ${s.pointerMoves} moves · ${s.clicks} clicks · ${s.keys} keys · ${s.touches} touches`);
  lines.push("", ...locationBlock(geo), "", `💻 ${esc(describeClient(ua))}`, verdictLine(verdict, false));
  if (payload.visitor.returning) lines.push(`🔁 visit #${payload.visitor.visitCount} from this browser`);
  return lines.join("\n");
}
