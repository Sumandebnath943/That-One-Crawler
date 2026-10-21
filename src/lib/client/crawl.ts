import { PAGESPEED_PAGE_LIMIT } from "@/lib/limits";
import { hasContent } from "@/lib/seo/issues";
import {
  toCrawledPage,
  type AnalyzeResponse,
  type CrawledPage,
  type DiscoverResponse,
  type PageData,
  type PageSpeedResult,
  type RobotsRules,
} from "@/lib/seo/types";
import { inScope, isCrawlableUrl, urlKey } from "@/lib/seo/url";
import { postJson } from "./api";

export interface ScanSettings {
  url: string;
  maxPages: number;
  pagespeed: boolean;
}

export type ScanPhase = "discovering" | "crawling" | "pagespeed" | "done" | "stopped" | "error";
export type CrawlMethod = "sitemap" | "links";

export interface ScanState {
  id: string;
  settings: ScanSettings;
  phase: ScanPhase;
  method: CrawlMethod | null;
  startUrl: string;
  domain: string;
  /** Path prefix the scan is limited to ("" = whole site). */
  scope: string;
  robots: RobotsRules | null;
  robotsFound: boolean;
  sitemapCount: number;
  sitemapTruncated: boolean;
  pages: CrawledPage[];
  /** URLs we got an answer for (including skipped non-HTML ones). */
  fetched: number;
  /** Planned number of URLs when known up front (sitemap mode). */
  target: number | null;
  /** URLs waiting in the queue. */
  queued: number;
  /** Responses that weren't HTML pages (feeds, images, PDFs…). */
  skipped: number;
  /** URLs our own API couldn't check. */
  failed: number;
  active: string[];
  psDone: number;
  psTotal: number;
  warnings: string[];
  error: string | null;
  startedAt: number;
  finishedAt: number | null;
}

// 2 requests × 3 URLs keeps ~6 pages in flight: quick, but gentle on small blogs.
const BATCH_SIZE = 3;
const CONCURRENCY = 2;
const PAGESPEED_CONCURRENCY = 3;
const PAGESPEED_MAX_CONSECUTIVE_ERRORS = 5;

export function isRunning(phase: ScanPhase): boolean {
  return phase === "discovering" || phase === "crawling" || phase === "pagespeed";
}

export function newScanState(settings: ScanSettings): ScanState {
  return {
    id: crypto.randomUUID(),
    settings,
    phase: "discovering",
    method: null,
    startUrl: settings.url,
    domain: "",
    scope: "",
    robots: null,
    robotsFound: false,
    sitemapCount: 0,
    sitemapTruncated: false,
    pages: [],
    fetched: 0,
    target: null,
    queued: 0,
    skipped: 0,
    failed: 0,
    active: [],
    psDone: 0,
    psTotal: 0,
    warnings: [],
    error: null,
    startedAt: Date.now(),
    finishedAt: null,
  };
}

export async function fetchPagespeed(url: string, signal?: AbortSignal): Promise<PageSpeedResult> {
  return postJson<PageSpeedResult>("/api/pagespeed", { url }, signal, 1);
}

function failedPagespeed(error: string): PageSpeedResult {
  return {
    performance: null,
    seo: null,
    accessibility: null,
    bestPractices: null,
    lcpSeconds: null,
    cls: null,
    tbtMs: null,
    error,
  };
}

/**
 * Run a whole scan from the browser. The server only ever does small, quick jobs
 * (find sitemap, analyze a few URLs, one PageSpeed call), which is what lets this
 * run on serverless hosting with no queue and no shared state.
 */
export async function runScan(
  settings: ScanSettings,
  onUpdate: (state: ScanState) => void,
  signal: AbortSignal,
): Promise<ScanState> {
  const state = newScanState(settings);
  const pages = new Map<string, CrawledPage>();
  const active = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | null = null;

  const snapshot = (): ScanState => ({ ...state, pages: [...pages.values()], active: [...active] });
  const emit = (immediate = false) => {
    if (immediate) {
      if (timer) clearTimeout(timer);
      timer = null;
      onUpdate(snapshot());
    } else if (!timer) {
      timer = setTimeout(() => {
        timer = null;
        onUpdate(snapshot());
      }, 150);
    }
  };
  const warn = (message: string) => {
    if (!state.warnings.includes(message)) state.warnings.push(message);
  };

  async function crawl(method: CrawlMethod, seeds: string[]) {
    state.method = method;
    state.phase = "crawling";
    const visited = new Set<string>();
    const queue: string[] = [];
    let dispatched = 0;

    const enqueue = (url: string) => {
      const key = urlKey(url);
      if (visited.has(key)) return;
      visited.add(key);
      queue.push(url);
    };
    seeds.forEach(enqueue);
    state.target = method === "sitemap" ? Math.min(queue.length, settings.maxPages) : null;
    state.queued = queue.length;
    emit(true);

    const handle = (page: PageData) => {
      state.fetched += 1;
      const finalKey = urlKey(page.finalUrl);
      visited.add(finalKey);
      const isRow = page.isHtml || page.status === 0 || page.status >= 400 || Boolean(page.offsiteRedirect);
      if (!isRow) {
        state.skipped += 1;
      } else {
        const from = page.redirects.length ? [page.url] : [];
        const existing = pages.get(finalKey);
        pages.set(
          finalKey,
          existing
            ? { ...existing, redirectedFrom: [...new Set([...existing.redirectedFrom, ...from])] }
            : toCrawledPage(page, from),
        );
      }
      if (method === "links" && visited.size < settings.maxPages * 20) {
        for (const link of page.links) if (isCrawlableUrl(link) && inScope(link, state.scope)) enqueue(link);
      }
    };

    const runBatch = async (batch: string[]) => {
      batch.forEach((url) => active.add(url));
      emit();
      try {
        const res = await postJson<AnalyzeResponse>(
          "/api/analyze",
          { urls: batch, baseDomain: state.domain },
          signal,
          1,
        );
        res.pages.forEach(handle);
      } catch {
        if (signal.aborted) return;
        state.failed += batch.length;
        warn("Some URLs couldn't be checked because our crawler hiccuped. They're not counted as broken.");
      } finally {
        batch.forEach((url) => active.delete(url));
        state.queued = queue.length;
        emit();
      }
    };

    const inflight = new Set<Promise<void>>();
    while (!signal.aborted) {
      while (inflight.size < CONCURRENCY && queue.length && dispatched < settings.maxPages) {
        const batch = queue.splice(0, Math.min(BATCH_SIZE, settings.maxPages - dispatched));
        dispatched += batch.length;
        const task: Promise<void> = runBatch(batch).finally(() => inflight.delete(task));
        inflight.add(task);
      }
      if (!inflight.size) break;
      await Promise.race(inflight);
    }
    await Promise.allSettled(inflight);
    state.queued = 0;
  }

  async function pagespeedPhase() {
    const targets = [...pages.values()].filter((p) => hasContent(p) && p.status === 200).slice(0, PAGESPEED_PAGE_LIMIT);
    if (!targets.length) return;
    state.phase = "pagespeed";
    state.psTotal = targets.length;
    state.psDone = 0;
    emit(true);

    let next = 0;
    let consecutiveErrors = 0;
    const worker = async () => {
      while (next < targets.length && !signal.aborted && consecutiveErrors < PAGESPEED_MAX_CONSECUTIVE_ERRORS) {
        const target = targets[next++];
        active.add(target.finalUrl);
        emit();
        let result: PageSpeedResult;
        try {
          result = await fetchPagespeed(target.finalUrl, signal);
          consecutiveErrors = 0;
        } catch (err) {
          if (signal.aborted) return;
          consecutiveErrors += 1;
          result = failedPagespeed(err instanceof Error ? err.message : "PageSpeed failed");
        } finally {
          active.delete(target.finalUrl);
        }
        const key = urlKey(target.finalUrl);
        const current = pages.get(key);
        if (current) pages.set(key, { ...current, pagespeed: result });
        state.psDone += 1;
        emit();
      }
    };
    await Promise.all(Array.from({ length: PAGESPEED_CONCURRENCY }, worker));
    if (consecutiveErrors >= PAGESPEED_MAX_CONSECUTIVE_ERRORS) {
      warn("PageSpeed kept failing, so we stopped asking. (Quota, or a temporarily grumpy Google API.)");
    }
  }

  emit(true);
  try {
    const discovery = await postJson<DiscoverResponse>(
      "/api/discover",
      { url: settings.url, limit: settings.maxPages },
      signal,
    );
    state.startUrl = discovery.startUrl;
    state.domain = discovery.baseDomain;
    state.scope = discovery.scope;
    state.robots = discovery.robots.rules;
    state.robotsFound = discovery.robots.found;
    state.sitemapCount = discovery.sitemap.urls.length;
    state.sitemapTruncated = discovery.sitemap.truncated;
    discovery.warnings.forEach(warn);

    if (discovery.sitemap.urls.length) {
      await crawl("sitemap", discovery.sitemap.urls);
      if (!signal.aborted && ![...pages.values()].some(hasContent)) {
        warn("The sitemap's URLs didn't give us any readable pages, so we followed links from the homepage instead.");
        pages.clear();
        state.fetched = 0;
        state.skipped = 0;
        state.failed = 0;
        await crawl("links", [discovery.startUrl]);
      }
    } else {
      warn(
        discovery.sitemap.sources.length
          ? `Your sitemap didn't list any pages ${state.scope ? `under ${state.scope}` : "on this domain"}, so we followed links instead.`
          : "No sitemap found, so we followed links from the homepage like a nosy neighbor.",
      );
      await crawl("links", [discovery.startUrl]);
    }

    if (settings.pagespeed && !signal.aborted) await pagespeedPhase();
    state.phase = signal.aborted ? "stopped" : "done";
  } catch (err) {
    if (signal.aborted) {
      state.phase = "stopped";
    } else {
      state.phase = "error";
      state.error = err instanceof Error ? err.message : "Something went wrong.";
    }
  }

  active.clear();
  state.finishedAt = Date.now();
  emit(true);
  return snapshot();
}
