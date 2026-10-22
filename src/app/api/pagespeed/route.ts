import { jsonError, readJson } from "@/lib/server/http";
import { pagespeedKey, runPagespeed } from "@/lib/server/pagespeed";
import { rateLimit } from "@/lib/server/rate-limit";

export const maxDuration = 60;

export async function POST(request: Request) {
  // A scan sends at most ~18 a minute (25 pages, 3 at a time, 10–30s each), so 30 never gets in the way.
  const limited = rateLimit(request, "pagespeed", 30, 60_000);
  if (limited) return limited;

  const key = pagespeedKey();
  if (!key) return jsonError("PageSpeed isn't set up on this deployment (no PAGESPEED_KEY).", 404);

  const body = await readJson(request);
  const url = typeof body?.url === "string" ? body.url : "";
  if (!/^https?:\/\//i.test(url)) return jsonError("Send an http(s) URL.", 400);
  const strategy = body?.strategy === "desktop" ? "desktop" : "mobile";

  try {
    return Response.json(await runPagespeed(url, key, request.signal, { strategy, full: body?.full === true }));
  } catch (err) {
    const message = err instanceof Error && err.name !== "TimeoutError" ? err.message : "PageSpeed timed out";
    return jsonError(message, 502);
  }
}
