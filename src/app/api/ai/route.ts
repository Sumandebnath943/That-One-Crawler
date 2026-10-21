import { connection } from "next/server";
import { checkQuota, spendQuota } from "@/lib/server/ai/quota";
import { aiConfigured } from "@/lib/server/ai/router";
import { ProviderError } from "@/lib/server/ai/providers";
import { runTask, sanitizeTask, TaskError } from "@/lib/server/ai/tasks";
import { jsonError, readJson } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rate-limit";
import type { QuotaInfo } from "@/lib/seo/types";

// Reading the page plus up to two provider attempts.
export const maxDuration = 90;

/** A visitor's own Gemini key, sent per request from their browser. Never stored or logged. */
function userKey(request: Request): string | undefined {
  const key = request.headers.get("x-gemini-key")?.trim();
  return key && /^[A-Za-z0-9_\-.]{20,200}$/.test(key) ? key : undefined;
}

/** How many free AI actions this visitor has left today. */
export async function GET(request: Request) {
  await connection();
  const quota = checkQuota(request);
  return Response.json({
    quota: { limit: quota.limit, remaining: quota.remaining, byok: false } satisfies QuotaInfo,
    configured: aiConfigured(),
  });
}

export async function POST(request: Request) {
  const burst = rateLimit(request, "ai-burst", 10, 60_000);
  if (burst) return burst;

  const ownKey = userKey(request);
  const quota = checkQuota(request);
  if (!ownKey) {
    if (!aiConfigured()) return jsonError("AI isn't set up on this deployment. Add your own free Gemini key to use it.", 404);
    if (quota.remaining <= 0) {
      return Response.json(
        {
          error: `That's all ${quota.limit} free AI actions for today. Add your own free Gemini key to keep going, or come back tomorrow.`,
          code: "quota",
          quota: { limit: quota.limit, remaining: 0, byok: false } satisfies QuotaInfo,
        },
        { status: 429 },
      );
    }
  }

  const task = sanitizeTask(await readJson(request));
  if (!task) return jsonError("That AI request is missing something (a task and a page URL).", 400);

  try {
    const result = await runTask(task, { userGeminiKey: ownKey, signal: request.signal });
    const headers = new Headers();
    let remaining = quota.remaining;
    if (!ownKey) {
      headers.set("Set-Cookie", spendQuota(request, quota.used));
      remaining = Math.max(0, quota.remaining - 1);
    }
    const info: QuotaInfo = { limit: quota.limit, remaining, byok: Boolean(ownKey) };
    return Response.json({ result, quota: info }, { headers });
  } catch (err) {
    if (err instanceof TaskError) return jsonError(err.message, err.status);
    if (err instanceof ProviderError) {
      console.error("AI provider error", err.status, err.message);
      const busy = err.retryable ? " The free AI tiers are busy; try again in a minute." : "";
      return jsonError(`${err.message}.${busy}`.replace("..", "."), err.status === 400 ? 400 : 502);
    }
    console.error("AI task failed", err);
    return jsonError("The AI tripped over something. Try again?", 500);
  }
}
