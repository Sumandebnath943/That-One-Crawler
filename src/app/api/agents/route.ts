import { AgentAuditError, auditAgents } from "@/lib/server/agents";
import { jsonError, readJson } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rate-limit";
import { BlockedUrlError } from "@/lib/server/safe-fetch";
import { normalizeInputUrl } from "@/lib/seo/url";

export const maxDuration = 60;

/** One agent-readiness audit of a site: about 25 small requests to it, so it's limited more tightly. */
export async function POST(request: Request) {
  const limited = rateLimit(request, "agents", 10, 60_000);
  if (limited) return limited;

  const body = await readJson(request);
  const url = typeof body?.url === "string" ? normalizeInputUrl(body.url) : null;
  if (!url) return jsonError("Send a website address, like myblog.com.", 400);

  try {
    return Response.json(await auditAgents(url, AbortSignal.any([request.signal, AbortSignal.timeout(50_000)])));
  } catch (err) {
    if (err instanceof AgentAuditError || err instanceof BlockedUrlError) return jsonError(err.message, 422);
    const message = err instanceof Error && err.name !== "TimeoutError" ? err.message : "The check took too long.";
    return jsonError(message, 502);
  }
}
