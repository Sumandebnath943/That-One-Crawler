import type { PageSpeedResult } from "@/lib/seo/types";

const API_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

export function pagespeedKey(): string {
  return process.env.PAGESPEED_KEY || process.env.PAGESPEED_API_KEY || "";
}

interface LighthouseResponse {
  error?: { message?: string };
  lighthouseResult?: {
    categories?: Record<string, { score?: number | null }>;
    audits?: Record<string, { numericValue?: number }>;
  };
}

/** Google PageSpeed Insights (mobile), trimmed to the numbers the report shows. */
export async function runPagespeed(url: string, key: string, signal?: AbortSignal): Promise<PageSpeedResult> {
  const params = new URLSearchParams({ url, strategy: "mobile", key });
  for (const category of ["performance", "seo", "accessibility", "best-practices"]) {
    params.append("category", category);
  }
  const timeout = AbortSignal.timeout(55_000);
  const res = await fetch(`${API_URL}?${params}`, {
    signal: signal ? AbortSignal.any([timeout, signal]) : timeout,
  });
  const data = (await res.json().catch(() => ({}))) as LighthouseResponse;
  if (!res.ok) {
    throw new Error(data.error?.message?.split("\n")[0] || `PageSpeed answered ${res.status}`);
  }

  const categories = data.lighthouseResult?.categories ?? {};
  const audits = data.lighthouseResult?.audits ?? {};
  const score = (name: string) => {
    const raw = categories[name]?.score;
    return typeof raw === "number" ? Math.round(raw * 100) : null;
  };
  const numeric = (name: string) => {
    const raw = audits[name]?.numericValue;
    return typeof raw === "number" ? raw : null;
  };
  const lcp = numeric("largest-contentful-paint");
  const cls = numeric("cumulative-layout-shift");
  const tbt = numeric("total-blocking-time");

  return {
    performance: score("performance"),
    seo: score("seo"),
    accessibility: score("accessibility"),
    bestPractices: score("best-practices"),
    lcpSeconds: lcp === null ? null : Math.round(lcp / 10) / 100,
    cls: cls === null ? null : Math.round(cls * 1000) / 1000,
    tbtMs: tbt === null ? null : Math.round(tbt),
  };
}
