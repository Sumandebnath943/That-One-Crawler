import { describeClient } from "@/lib/beacon/bot";
import { clientIp, describePlace, flagFor } from "@/lib/beacon/geo";
import { clip, esc, sendTelegram, telegramConfigured } from "@/lib/beacon/telegram";
import { CONTACT_TOPICS } from "@/lib/content/pages";
import { readJson } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rate-limit";

// The contact form: messages go to the owner's Telegram chat, even while alerts are paused.

const EMAIL = /^[^\s@<>]{1,64}@[^\s@<>]{1,190}\.[a-z]{2,24}$/i;
/** A person takes longer than this to write a message; a spam bot doesn't. */
const MIN_FILL_MS = 2_500;

export async function POST(request: Request) {
  const limited = rateLimit(request, "contact", 5, 10 * 60_000);
  if (limited) return limited;
  if (!telegramConfigured()) {
    return Response.json({ error: "The contact form isn't set up on this deployment yet. Please open a GitHub issue instead.", code: "unavailable" }, { status: 503 });
  }

  const body = await readJson(request);
  if (!body) return Response.json({ error: "That didn't look like a message." }, { status: 400 });
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\r\n/g, "\n").trim().slice(0, max) : "");
  const name = str(body.name, 80);
  const email = str(body.email, 200);
  const topic = CONTACT_TOPICS.find((t) => t === body.topic) ?? "Something else";
  const message = str(body.message, 3_000);
  const elapsed = typeof body.elapsed === "number" ? body.elapsed : 0;

  // Honeypot or inhumanly fast: say thanks and drop it, so the bot learns nothing.
  if (str(body.company, 200) || elapsed < MIN_FILL_MS) return Response.json({ ok: true });
  if (message.length < 10) return Response.json({ error: "Your message needs a few more words (10 characters at least)." }, { status: 400 });
  if (email && !EMAIL.test(email)) return Response.json({ error: "That email address doesn't look right. Leave it empty if you don't need a reply." }, { status: 400 });

  const h = request.headers;
  const city = h.get("x-vercel-ip-city");
  const country = h.get("x-vercel-ip-country") ?? undefined;
  const place = describePlace({ city: city ? decodeURIComponent(city) : undefined, countryCode: country });
  const lines = [
    `✉️ <b>New message</b> via the contact form`,
    "",
    `🏷 <b>${esc(topic)}</b>`,
    `👤 ${name ? esc(name) : "<i>no name</i>"}${email ? ` · ${esc(email)}` : " · <i>no email, can't reply</i>"}`,
    "",
    esc(clip(message, 3_000)),
    "",
    `📍 ${esc(place)}${flagFor(country) ? ` ${flagFor(country)}` : ""} · <code>${esc(clientIp(h))}</code>`,
    `💻 ${esc(describeClient(h.get("user-agent") ?? ""))}`,
  ];
  const sent = await sendTelegram(lines.join("\n"));
  if (!sent.ok) return Response.json({ error: "Your message couldn't be delivered just now. Please try again in a minute, or open a GitHub issue." }, { status: 502 });
  return Response.json({ ok: true });
}
