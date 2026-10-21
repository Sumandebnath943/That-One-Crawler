import { connection } from "next/server";
import { dailyLimit } from "@/lib/server/ai/quota";
import { aiConfigured } from "@/lib/server/ai/router";
import { pagespeedKey } from "@/lib/server/pagespeed";
import type { FeatureFlags } from "@/lib/seo/types";

/** Tells the UI which optional features have keys configured. Never exposes the keys. */
export async function GET() {
  await connection();
  const google = Boolean(pagespeedKey());
  return Response.json({
    pagespeed: google,
    crux: google,
    ai: aiConfigured(),
    aiDailyLimit: dailyLimit(),
  } satisfies FeatureFlags);
}
