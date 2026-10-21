import type { CruxMetric, CruxResult } from "@/lib/seo/types";

// Real-user speed from the Chrome UX Report (field data from actual Chrome visitors, last 28 days).
// Uses the same Google API key as PageSpeed; the "Chrome UX Report API" must be enabled for it.

const API = "https://chromeuxreport.googleapis.com/v1/records:queryRecord";

/** [good up to, poor above] per Google's Core Web Vitals thresholds. */
const THRESHOLDS = {
  lcp: [2500, 4000],
  inp: [200, 500],
  cls: [0.1, 0.25],
  fcp: [1800, 3000],
  ttfb: [800, 1800],
} as const;

const METRIC_KEYS = {
  lcp: ["largest_contentful_paint"],
  inp: ["interaction_to_next_paint"],
  cls: ["cumulative_layout_shift"],
  fcp: ["first_contentful_paint"],
  ttfb: ["time_to_first_byte", "experimental_time_to_first_byte"],
} as const;

type MetricName = keyof typeof THRESHOLDS;

interface CruxResponse {
  error?: { message?: string; code?: number };
  record?: {
    metrics?: Record<string, { percentiles?: { p75?: number | string } }>;
    collectionPeriod?: { firstDate?: DateParts; lastDate?: DateParts };
  };
}

interface DateParts {
  year: number;
  month: number;
  day: number;
}

export class CruxError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function metric(record: CruxResponse["record"], name: MetricName): CruxMetric {
  const raw = METRIC_KEYS[name].map((k) => record?.metrics?.[k]?.percentiles?.p75).find((v) => v !== undefined);
  const p75 = raw === undefined ? null : Number(raw);
  if (p75 === null || !Number.isFinite(p75)) return { p75: null, rating: null };
  const [good, poor] = THRESHOLDS[name];
  return { p75, rating: p75 <= good ? "good" : p75 > poor ? "poor" : "ok" };
}

const fmt = (d?: DateParts) => (d ? `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}` : "");

async function query(body: Record<string, string>, key: string, signal?: AbortSignal): Promise<CruxResponse["record"] | null> {
  const timeout = AbortSignal.timeout(15_000);
  const res = await fetch(API, {
    method: "POST",
    signal: signal ? AbortSignal.any([timeout, signal]) : timeout,
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as CruxResponse;
  if (res.status === 404) return null;
  if (!res.ok) throw new CruxError(data.error?.message?.split("\n")[0] || `Chrome UX Report answered ${res.status}`, res.status);
  return data.record ?? null;
}

/** Field data for the page, falling back to the whole site when the page has too few visitors. */
export async function fetchCrux(url: string, key: string, signal?: AbortSignal): Promise<CruxResult | null> {
  let scope: CruxResult["scope"] = "url";
  let record = await query({ url }, key, signal);
  if (!record) {
    scope = "origin";
    record = await query({ origin: new URL(url).origin }, key, signal);
  }
  if (!record) return null;
  const period = record.collectionPeriod;
  return {
    scope,
    lcp: metric(record, "lcp"),
    inp: metric(record, "inp"),
    cls: metric(record, "cls"),
    fcp: metric(record, "fcp"),
    ttfb: metric(record, "ttfb"),
    collectionPeriod: period ? `${fmt(period.firstDate)} to ${fmt(period.lastDate)}` : undefined,
  };
}
