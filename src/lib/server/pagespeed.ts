import type {
  FieldData,
  FieldMetric,
  FieldRating,
  PageSpeedAudit,
  PageSpeedCategory,
  PageSpeedCategoryId,
  PageSpeedResult,
} from "@/lib/seo/types";

const API_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const CATEGORY_IDS: PageSpeedCategoryId[] = ["performance", "accessibility", "best-practices", "seo"];

export function pagespeedKey(): string {
  return process.env.PAGESPEED_KEY || process.env.PAGESPEED_API_KEY || "";
}

interface LhAudit {
  id: string;
  title?: string;
  description?: string;
  score?: number | null;
  scoreDisplayMode?: string;
  displayValue?: string;
  numericValue?: number;
  metricSavings?: Record<string, number>;
  details?: {
    type?: string;
    data?: string;
    overallSavingsMs?: number;
    overallSavingsBytes?: number;
    items?: Record<string, unknown>[];
  };
}

interface LhCategory {
  score?: number | null;
  auditRefs?: { id: string; weight?: number; group?: string }[];
}

interface CruxBlock {
  overall_category?: string;
  origin_fallback?: boolean;
  metrics?: Record<string, { percentile?: number; category?: string; distributions?: { proportion?: number }[] }>;
}

export interface PsiResponse {
  error?: { message?: string };
  loadingExperience?: CruxBlock;
  originLoadingExperience?: CruxBlock;
  lighthouseResult?: {
    lighthouseVersion?: string;
    fetchTime?: string;
    finalDisplayedUrl?: string;
    finalUrl?: string;
    runWarnings?: string[];
    categories?: Record<string, LhCategory>;
    audits?: Record<string, LhAudit>;
  };
}

/** "[Learn more](https://…)" → "Learn more", and the first link kept separately. */
function plain(markdown = ""): { text: string; link?: string } {
  const link = markdown.match(/\]\((https?:\/\/[^)]+)\)/)?.[1];
  const text = markdown
    .replace(/\[([^\]]+)\]\([^)]+\)\.?/g, (_, label: string) => (/^learn (more|how)/i.test(label) ? "" : label))
    .replace(/`/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return { text, link };
}

function itemLabel(item: Record<string, unknown>): string | null {
  const node = item.node as { snippet?: string; selector?: string; nodeLabel?: string } | undefined;
  const source = item.source as { url?: string } | undefined;
  const value = (typeof item.url === "string" && item.url) || source?.url || node?.nodeLabel || node?.selector || node?.snippet;
  if (typeof value !== "string" || !value.trim()) return null;
  return value.replace(/\s+/g, " ").trim().slice(0, 160);
}

function toAudit(audit: LhAudit, maxItems: number): PageSpeedAudit {
  const { text, link } = plain(audit.description);
  // Lighthouse 13 "insights" report savings per metric; the biggest one is what the fix is worth.
  const savingsMs = Math.max(audit.details?.overallSavingsMs ?? 0, audit.metricSavings?.LCP ?? 0, audit.metricSavings?.FCP ?? 0);
  const savingsBytes = audit.details?.overallSavingsBytes;
  const items = (audit.details?.items ?? []).map(itemLabel).filter((v): v is string => Boolean(v));
  return {
    id: audit.id,
    title: plain(audit.title).text,
    description: text.slice(0, 400),
    learnMore: link,
    displayValue: audit.displayValue,
    score: typeof audit.score === "number" ? audit.score : null,
    savingsMs: savingsMs && savingsMs > 0 ? Math.round(savingsMs) : undefined,
    savingsBytes: savingsBytes && savingsBytes > 0 ? Math.round(savingsBytes) : undefined,
    items: items.length ? [...new Set(items)].slice(0, maxItems) : undefined,
  };
}

const SCORED = new Set(["binary", "numeric", "metricSavings"]);

function category(id: PageSpeedCategoryId, data: NonNullable<PsiResponse["lighthouseResult"]>, maxItems: number): PageSpeedCategory | null {
  const cat = data.categories?.[id];
  if (!cat) return null;
  const audits = data.audits ?? {};
  const failed: PageSpeedAudit[] = [];
  const diagnostics: PageSpeedAudit[] = [];
  let passed = 0;
  let manual = 0;
  for (const ref of cat.auditRefs ?? []) {
    // The metrics group holds LCP, TBT and friends, which we report as numbers.
    if (ref.group === "metrics" || ref.group === "hidden") continue;
    const audit = audits[ref.id];
    if (!audit) continue;
    const mode = audit.scoreDisplayMode ?? "";
    if (mode === "manual") manual += 1;
    else if (mode === "notApplicable" || mode === "error") continue;
    else if (mode === "informative") {
      if (audit.displayValue || audit.details?.items?.length) diagnostics.push(toAudit(audit, maxItems));
    } else if (SCORED.has(mode) && typeof audit.score === "number") {
      if (audit.score >= 0.9) passed += 1;
      else failed.push(toAudit(audit, maxItems));
    }
  }
  failed.sort((a, b) => (b.savingsMs ?? 0) - (a.savingsMs ?? 0) || (a.score ?? 1) - (b.score ?? 1));
  return {
    id,
    score: typeof cat.score === "number" ? Math.round(cat.score * 100) : null,
    failed,
    diagnostics: diagnostics.slice(0, 10),
    passed,
    manual,
  };
}

const RATING: Record<string, FieldRating> = { FAST: "good", AVERAGE: "ok", SLOW: "poor" };

function fieldMetric(block: CruxBlock, key: string, scale = 1): FieldMetric {
  const metric = block.metrics?.[key];
  if (!metric || typeof metric.percentile !== "number") return { p75: null, rating: null };
  const shares = (metric.distributions ?? []).map((d) => Math.round((d.proportion ?? 0) * 100));
  return {
    p75: metric.percentile / scale,
    rating: RATING[metric.category ?? ""] ?? null,
    distribution: shares.length === 3 ? (shares as [number, number, number]) : undefined,
  };
}

/** PageSpeed's "Discover what your real users are experiencing" panel, for the page or the whole origin. */
function fieldData(block: CruxBlock | undefined, scope: "url" | "origin"): FieldData | null {
  if (!block?.metrics || !Object.keys(block.metrics).length) return null;
  const lcp = fieldMetric(block, "LARGEST_CONTENTFUL_PAINT_MS");
  const inp = fieldMetric(block, "INTERACTION_TO_NEXT_PAINT");
  // CrUX reports CLS multiplied by 100.
  const cls = fieldMetric(block, "CUMULATIVE_LAYOUT_SHIFT_SCORE", 100);
  const core = [lcp, inp, cls].filter((m) => m.rating);
  return {
    scope,
    // Like PageSpeed: with too little INP data, the assessment rests on LCP and CLS.
    passed: lcp.rating && cls.rating ? core.every((m) => m.rating === "good") : null,
    lcp,
    inp,
    cls,
    fcp: fieldMetric(block, "FIRST_CONTENTFUL_PAINT_MS"),
    ttfb: fieldMetric(block, "EXPERIMENTAL_TIME_TO_FIRST_BYTE"),
  };
}

export interface PagespeedOptions {
  strategy?: "mobile" | "desktop";
  /** The single-page test wants the screenshot and longer item lists; scans keep it lean. */
  full?: boolean;
}

/** Google PageSpeed Insights: the four Lighthouse categories, lab metrics, failed audits and real-user data. */
export async function runPagespeed(url: string, key: string, signal?: AbortSignal, opts: PagespeedOptions = {}): Promise<PageSpeedResult> {
  const strategy = opts.strategy ?? "mobile";
  const params = new URLSearchParams({ url, strategy, key });
  for (const id of CATEGORY_IDS) params.append("category", id);
  const timeout = AbortSignal.timeout(55_000);
  const res = await fetch(`${API_URL}?${params}`, {
    signal: signal ? AbortSignal.any([timeout, signal]) : timeout,
  });
  const data = (await res.json().catch(() => ({}))) as PsiResponse;
  if (!res.ok) {
    throw new Error(data.error?.message?.split("\n")[0] || `PageSpeed answered ${res.status}`);
  }
  return parsePagespeed(data, strategy, opts.full);
}

/** Trim a PageSpeed Insights response (often over 1 MB) to what the report shows. */
export function parsePagespeed(data: PsiResponse, strategy: "mobile" | "desktop", full = false): PageSpeedResult {
  const lh = data.lighthouseResult ?? {};
  const audits = lh.audits ?? {};
  const score = (name: string) => {
    const raw = lh.categories?.[name]?.score;
    return typeof raw === "number" ? Math.round(raw * 100) : null;
  };
  const numeric = (name: string) => {
    const raw = audits[name]?.numericValue;
    return typeof raw === "number" ? raw : null;
  };
  const seconds = (ms: number | null) => (ms === null ? null : Math.round(ms / 10) / 100);
  const lcp = numeric("largest-contentful-paint");
  const cls = numeric("cumulative-layout-shift");
  const tbt = numeric("total-blocking-time");
  const maxItems = full ? 8 : 3;

  const urlField = data.loadingExperience && !data.loadingExperience.origin_fallback ? fieldData(data.loadingExperience, "url") : null;
  const screenshot = audits["final-screenshot"]?.details?.data;

  return {
    performance: score("performance"),
    seo: score("seo"),
    accessibility: score("accessibility"),
    bestPractices: score("best-practices"),
    lcpSeconds: seconds(lcp),
    cls: cls === null ? null : Math.round(cls * 1000) / 1000,
    tbtMs: tbt === null ? null : Math.round(tbt),
    strategy,
    fcpSeconds: seconds(numeric("first-contentful-paint")),
    speedIndexSeconds: seconds(numeric("speed-index")),
    categories: CATEGORY_IDS.map((id) => category(id, lh, maxItems)).filter((c): c is PageSpeedCategory => c !== null),
    field: urlField ?? fieldData(data.originLoadingExperience, "origin"),
    lighthouseVersion: lh.lighthouseVersion,
    fetchedAt: lh.fetchTime,
    finalUrl: lh.finalDisplayedUrl ?? lh.finalUrl,
    warnings: lh.runWarnings?.slice(0, 3),
    screenshot: full && typeof screenshot === "string" && screenshot.length < 400_000 ? screenshot : undefined,
  };
}
