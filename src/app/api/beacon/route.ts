import { connection } from "next/server";
import { BOT_THRESHOLD, describeClient, judge } from "@/lib/beacon/bot";
import { formatArrival, formatEnd, formatEvent } from "@/lib/beacon/format";
import { resolveGeo } from "@/lib/beacon/geo";
import { parseBeacon } from "@/lib/beacon/payload";
import { describeMode, getSettings, isPaused } from "@/lib/beacon/settings";
import { sendTelegram, telegramConfigured } from "@/lib/beacon/telegram";
import { hit } from "@/lib/server/rate-limit";
import { SITE_URL } from "@/lib/site";

// The visitor beacon's collector. Location comes from per-request edge headers, so nothing here
// may be cached. The worst case is a 1.5s location lookup plus an 8s Telegram send (twice).
export const maxDuration = 25;

// Per visitor: a long browse with a few scans, not enough to flood.
const PER_IP = { max: 20, windowMs: 10 * 60_000 };
// A bot swarm comes from many addresses, so cap the whole endpoint too. Humans and suspects have
// separate budgets, so automated traffic can never use up a real visitor's alert.
const GLOBAL = { max: 150, windowMs: 10 * 60_000 };
const MAX_BODY_BYTES = 24_000;

const empty = () => new Response(null, { status: 204 });

/**
 * Health check: open /api/beacon in any browser to see whether alerts are configured and what the
 * server sees for you (your own IP and location only). Never shows the token.
 */
export async function GET(request: Request) {
  await connection();
  const geo = await resolveGeo(request.headers);
  if (hit(`beacon-check:${geo.ip}`, 20, 10 * 60_000) < 0) return Response.json({ error: "rate limited" }, { status: 429 });
  const configured = telegramConfigured();
  const settings = configured ? await getSettings() : null;
  const ua = request.headers.get("user-agent") ?? "";
  return Response.json(
    {
      ok: true,
      telegramConfigured: configured,
      commandsConfigured: Boolean(process.env.TELEGRAM_WEBHOOK_SECRET),
      alerts: settings
        ? { botAlerts: describeMode(settings.bots), pausedUntil: isPaused(settings) ? new Date(settings.pausedUntil!).toISOString() : null }
        : null,
      you: { geo, client: describeClient(ua), userAgent: ua, acceptLanguage: request.headers.get("accept-language") },
      optOut: `${SITE_URL}/?notrack=1`,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  // Fire-and-forget: the visitor's page must never see an error, so every path answers 204.
  try {
    if (!telegramConfigured()) return empty();
    const raw = await request.text();
    if (!raw || raw.length > MAX_BODY_BYTES) return empty();
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return empty();
    }
    const payload = parseBeacon(json);
    if (!payload) return empty();

    const geo = await resolveGeo(request.headers);
    const ua = request.headers.get("user-agent") ?? "";
    const verdict = judge(payload, geo, ua, request.headers.get("accept-language"));

    // Crawlers that run JavaScript are already reported by the proxy, with better detail.
    if (verdict.crawler) return empty();

    const settings = await getSettings();
    if (isPaused(settings)) return empty();
    const isBot = verdict.score < BOT_THRESHOLD;
    // "AI only" and "off" both mean: no alerts for bot-like visits here.
    if (isBot && settings.bots !== "all") return empty();

    const bucket = isBot ? "suspect" : "human";
    if (hit(`beacon:${bucket}:${geo.ip}`, PER_IP.max, PER_IP.windowMs) < 0) return empty();
    if (hit(`beacon:global:${bucket}`, GLOBAL.max, GLOBAL.windowMs) < 0) return empty();

    const text =
      payload.kind === "arrival"
        ? formatArrival(payload, geo, verdict, ua)
        : payload.kind === "event"
          ? formatEvent(payload, geo, ua)
          : formatEnd(payload, geo, verdict, ua);

    // Awaited, not backgrounded: work left running after the response is killed on serverless.
    await sendTelegram(text, { silent: isBot || payload.kind === "end" });
    return empty();
  } catch (err) {
    console.error("[beacon] unhandled:", err);
    return empty();
  }
}
