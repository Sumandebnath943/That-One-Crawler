import { CruxError, fetchCrux } from "@/lib/server/crux";
import { jsonError, readJson } from "@/lib/server/http";
import { pagespeedKey } from "@/lib/server/pagespeed";
import { rateLimit } from "@/lib/server/rate-limit";

export const maxDuration = 40;

export async function POST(request: Request) {
  const limited = rateLimit(request, "crux", 30, 60_000);
  if (limited) return limited;
  const key = pagespeedKey();
  if (!key) return jsonError("Real-user speed data isn't set up on this deployment (no PAGESPEED_KEY).", 404);

  const body = await readJson(request);
  const url = typeof body?.url === "string" ? body.url : "";
  if (!/^https?:\/\//i.test(url)) return jsonError("Send an http(s) URL.", 400);

  try {
    const result = await fetchCrux(url, key, request.signal);
    if (!result) {
      return jsonError("Not enough real Chrome visitors to this page or site yet for Google to publish speed data.", 404);
    }
    return Response.json(result);
  } catch (err) {
    if (err instanceof CruxError && err.status === 403) {
      return jsonError("The Google key doesn't have the Chrome UX Report API enabled. Turn it on in Google Cloud Console.", 502);
    }
    return jsonError(err instanceof Error ? err.message : "Chrome UX Report failed", 502);
  }
}
