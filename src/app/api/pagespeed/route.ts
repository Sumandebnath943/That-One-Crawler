import { jsonError, readJson } from "@/lib/server/http";
import { pagespeedKey, runPagespeed } from "@/lib/server/pagespeed";

export const maxDuration = 60;

export async function POST(request: Request) {
  const key = pagespeedKey();
  if (!key) return jsonError("PageSpeed isn't set up on this deployment (no PAGESPEED_KEY).", 404);

  const body = await readJson(request);
  const url = typeof body?.url === "string" ? body.url : "";
  if (!/^https?:\/\//i.test(url)) return jsonError("Send an http(s) URL.", 400);

  try {
    return Response.json(await runPagespeed(url, key, request.signal));
  } catch (err) {
    const message = err instanceof Error && err.name !== "TimeoutError" ? err.message : "PageSpeed timed out";
    return jsonError(message, 502);
  }
}
