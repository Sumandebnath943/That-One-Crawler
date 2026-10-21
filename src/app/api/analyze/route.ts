import { analyzeUrl } from "@/lib/server/analyze";
import { jsonError, readJson } from "@/lib/server/http";
import type { AnalyzeResponse } from "@/lib/seo/types";

export const maxDuration = 60;

const MAX_URLS_PER_REQUEST = 10;

export async function POST(request: Request) {
  const body = await readJson(request);
  const urls = Array.isArray(body?.urls) ? body.urls.filter((u): u is string => typeof u === "string") : [];
  const baseDomain = typeof body?.baseDomain === "string" ? body.baseDomain.toLowerCase() : "";
  if (!urls.length || urls.length > MAX_URLS_PER_REQUEST || !baseDomain) {
    return jsonError(`Send 1–${MAX_URLS_PER_REQUEST} URLs and a baseDomain.`, 400);
  }

  const pages = await Promise.all(urls.map((url) => analyzeUrl(url, baseDomain, request.signal)));
  return Response.json({ pages } satisfies AnalyzeResponse);
}
