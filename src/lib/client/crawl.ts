import { LINK_CHECK_LIMIT, PAGESPEED_PAGE_LIMIT } from "@/lib/limits";
import { hasContent } from "@/lib/seo/issues";
import type { BuildContext } from "@/lib/seo/report";
import { isAllowedByRobots } from "@/lib/seo/robots";
import {
  toCrawledPage,
  type AiPlan,
  type AiResult,
  type AnalyzeResponse,
  type BrandRules,
  type CrawledPage,
  type DiscoverResponse,
  type LinkCheck,
  type PageData,
  type PageSpeedResult,
  type RobotsRules,
} from "@/lib/seo/types";
import { inScope, isCrawlableUrl, robotsPath, urlKey } from "@/lib/seo/url";
import { postJson } from "./api";

export interface ScanSettings {
  url: string;
  maxPages: number;
  pagespeed: boolean;
  /** Check outgoing links and images for breakage and weight. */
  checkLinks: boolean;
  brandRules: BrandRules | null;
}

export type ScanPhase = "discovering" | "crawling" | "links" | "pagespeed" | "done" | "stopped" | "error";
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
  /** robots.txt had rules naming ThatOneCrawler, and we obeyed them. */
  robotsOwnGroup: boolean;
  /** URLs skipped because the site's robots.txt asked ThatOneCrawler to stay out. */
  optedOut: number;
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
  linkChecks: Record<string, LinkCheck>;
  lcDone: number;
  lcTotal: number;
  psDone: number;
  psTotal: number;
  /** AI action plan for the whole scan, if one was generated. */
  plan?: AiResult<AiPlan>;
  warnings: string[];
  error: string | null;
  startedAt: number;
  finishedAt: number | null;
}

// 2 requests × 3 URLs keeps ~6 pages in flight: quick, but gentle on small blogs.
const BATCH_SIZE = 3;
const CONCURRENCY = 2;
const LINK_BATCH = 15;
const LINK_CONCURRENCY = 2;
const PAGESPEED_CONCURRENCY = 3;
const PAGESPEED_MAX_CONSECUTIVE_ERRORS = 5;

export function isRunning(phase: ScanPhase): boolean {
  return phase === "discovering" || phase === "crawling" || phase === "links" || phase === "pagespeed";
}

/** The context the report needs to judge a scan's pages. */
export function contextFor(scan: ScanState): BuildContext {
  return {
    robots: scan.robots,
    asOf: scan.finishedAt ?? scan.startedAt,
    complete:
      scan.method === "sitemap" && !scan.sitemapTruncated && scan.phase === "done" && scan.failed === 0 && scan.optedOut === 0,
    startUrl: scan.startUrl,
    brandName: scan.settings.brandRules?.brandName || undefined,
    linkChecks: scan.linkChecks,
  };
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
    robotsOwnGroup: false,
    optedOut: 0,
    sitemapCount: 0,
    sitemapTruncated: false,
    pages: [],
    fetched: 0,
    target: null,
    queued: 0,
    skipped: 0,
    failed: 0,
    active: [],
    linkChecks: {},
    lcDone: 0,
    lcTotal: 0,
    psDone: 0,
    psTotal: 0,
    warnings: [],
    error: null,
    startedAt: Date.now(),
    finishedAt: null,
  };
}

/** Fill in fields that scans saved by older versions don't have. */
export function upgradeScan(scan: ScanState): ScanState {
  const defaults = newScanState({ url: scan.settings?.url ?? "", maxPages: 0, pagespeed: false, checkLinks: false, brandRules: null });
  return {
    ...defaults,
    ...scan,
    settings: { ...defaults.settings, ...scan.settings },
    linkChecks: scan.linkChecks ?? {},
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
 * (find sitemap, analyze a few URLs, check a batch of links, one PageSpeed call),
 * which is what lets this run on serverless hosting with no queue and no shared state.
 */
export async function runScan(
  settings: ScanSettings,
  onUpdate: (state: ScanState) => void,
  signal: AbortSignal,
): Promise<ScanState> {
  const state = newScanState(settings);
  const pages = new Map<string, CrawledPage>();
  const active = new Set<string>();
  let lastmods: Record<string, string> = {};
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
  // A robots.txt group naming ThatOneCrawler is an explicit request to us, so we honour it.
  const allowedForUs = (url: string) => !state.robotsOwnGroup || isAllowedByRobots(state.robots, robotsPath(url));
  const rules = settings.brandRules
    ? { bannedPhrases: settings.brandRules.bannedPhrases, requiredPhrases: settings.brandRules.requiredPhrases }
    : undefined;

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
      if (!allowedForUs(url)) {
        state.optedOut += 1;
        return;
      }
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
        const lastmod = lastmods[urlKey(page.url)] ?? lastmods[finalKey];
        pages.set(
          finalKey,
          existing
            ? { ...existing, redirectedFrom: [...new Set([...existing.redirectedFrom, ...from])] }
            : { ...toCrawledPage(page, from), sitemapLastmod: lastmod },
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
          { urls: batch, baseDomain: state.domain, rules },
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

  /** Check outgoing links we didn't crawl, plus images, for 404s and weight. */
  async function linkPhase() {
    const crawled = new Set<string>();
    for (const page of pages.values()) {
      crawled.add(urlKey(page.finalUrl));
      page.redirectedFrom.forEach((u) => crawled.add(urlKey(u)));
    }
    const internal = new Set<string>();
    const external = new Set<string>();
    const images = new Set<string>();
    for (const page of pages.values()) {
      if (!hasContent(page)) continue;
      for (const link of page.outlinksInternal) if (!crawled.has(urlKey(link)) && allowedForUs(link)) internal.add(link);
      page.outlinksExternal.forEach((link) => external.add(link));
      page.imageSrcs.forEach((src) => images.add(src));
    }
    const targets = [
      ...[...internal].slice(0, Math.round(LINK_CHECK_LIMIT * 0.35)),
      ...[...external].slice(0, Math.round(LINK_CHECK_LIMIT * 0.4)),
      ...[...images].slice(0, Math.round(LINK_CHECK_LIMIT * 0.25)),
    ];
    if (!targets.length) return;
    if (internal.size + external.size + images.size > targets.length) {
      warn(`We checked ${targets.length} of ${internal.size + external.size + images.size} links and images; the rest were over the limit.`);
    }

    state.phase = "links";
    state.lcTotal = targets.length;
    state.lcDone = 0;
    emit(true);

    let next = 0;
    const worker = async () => {
      while (next < targets.length && !signal.aborted) {
        const batch = targets.slice(next, next + LINK_BATCH);
        next += LINK_BATCH;
        batch.forEach((url) => active.add(url));
        emit();
        try {
          const res = await postJson<{ results: LinkCheck[] }>("/api/check-links", { urls: batch }, signal, 1);
          const found: Record<string, LinkCheck> = {};
          for (const result of res.results) found[result.url] = result;
          state.linkChecks = { ...state.linkChecks, ...found };
        } catch {
          if (signal.aborted) return;
          warn("Some links couldn't be checked. They're not counted as broken.");
        } finally {
          batch.forEach((url) => active.delete(url));
          state.lcDone += batch.length;
          emit();
        }
      }
    };
    await Promise.all(Array.from({ length: LINK_CONCURRENCY }, worker));
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
    state.robotsOwnGroup = discovery.robots.ownGroup;
    state.sitemapCount = discovery.sitemap.urls.length;
    state.sitemapTruncated = discovery.sitemap.truncated;
    lastmods = discovery.sitemap.lastmods ?? {};
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
    if (state.optedOut) {
      warn(`This site's robots.txt asks ThatOneCrawler to stay out of ${state.optedOut} URLs, so we did.`);
    }

    if (settings.checkLinks && !signal.aborted) await linkPhase();
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
