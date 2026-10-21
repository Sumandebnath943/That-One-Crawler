import { DEFAULT_PAGE_LIMIT, MAX_PAGES_LIMIT } from "@/lib/limits";
import { DiscoverError, discoverSite } from "@/lib/server/discover";
import { jsonError, readJson } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rate-limit";
import { BlockedUrlError } from "@/lib/server/safe-fetch";
import { normalizeInputUrl } from "@/lib/seo/url";

export const maxDuration = 60;

export async function POST(request: Request) {
  const limited = rateLimit(request, "discover", 20, 60_000);
  if (limited) return limited;

  const body = await readJson(request);
  const url = typeof body?.url === "string" ? normalizeInputUrl(body.url) : null;
  if (!url) return jsonError("That doesn't look like a URL. Even we can't crawl vibes.", 400);
  const limit = Math.min(Math.max(Math.floor(Number(body?.limit) || DEFAULT_PAGE_LIMIT), 1), MAX_PAGES_LIMIT);

  try {
    return Response.json(await discoverSite(url, limit, request.signal));
  } catch (err) {
    if (err instanceof BlockedUrlError) return jsonError(err.message, 400);
    if (err instanceof DiscoverError) return jsonError(err.message, 502);
    console.error("discover failed", err);
    return jsonError("Something broke while looking for your sitemap. Try again?", 500);
  }
}
