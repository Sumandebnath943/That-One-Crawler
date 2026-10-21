import { connection } from "next/server";
import { aiConfig } from "@/lib/server/ai";
import { pagespeedKey } from "@/lib/server/pagespeed";
import type { FeatureFlags } from "@/lib/seo/types";

/** Tells the UI which optional features have keys configured. Never exposes the keys. */
export async function GET() {
  await connection();
  return Response.json({ pagespeed: Boolean(pagespeedKey()), ai: Boolean(aiConfig().key) } satisfies FeatureFlags);
}
