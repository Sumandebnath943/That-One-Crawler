import { jsonError, readJson } from "@/lib/server/http";
import { checkLink } from "@/lib/server/links";
import { rateLimit } from "@/lib/server/rate-limit";

export const maxDuration = 60;

const MAX_URLS_PER_REQUEST = 20;

const httpUrls = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((u): u is string => typeof u === "string" && /^https?:\/\//i.test(u)) : [];

/** Checks a batch of links/images found during a scan: is it alive, and how heavy is it? */
export async function POST(request: Request) {
  const limited = rateLimit(request, "check-links", 120, 60_000);
  if (limited) return limited;

  const body = await readJson(request);
  const urls = httpUrls(body?.urls);
  // Images get a browser's image Accept header, so CDNs answer with the format a visitor would get.
  const images = new Set(httpUrls(body?.images));
  const all = [...new Set([...urls, ...images])].slice(0, MAX_URLS_PER_REQUEST);
  if (!all.length) return jsonError(`Send 1–${MAX_URLS_PER_REQUEST} http(s) URLs.`, 400);

  const results = await Promise.all(all.map((url) => checkLink(url, request.signal, images.has(url))));
  return Response.json({ results });
}
