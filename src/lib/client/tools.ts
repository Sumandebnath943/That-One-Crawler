import { buildRows } from "@/lib/seo/report";
import type { PageRow } from "@/lib/seo/issues";
import { toCrawledPage, type AnalyzeResponse, type LinkCheck } from "@/lib/seo/types";
import { bareHost, urlKey } from "@/lib/seo/url";
import { postJson } from "./api";

// Helpers behind the focused tools on the tool pages.

/** Read and judge one page, the same way a full scan would (minus the site-wide checks). */
export async function analyzePage(url: string, signal?: AbortSignal): Promise<PageRow> {
  const baseDomain = bareHost(new URL(url).hostname);
  const res = await postJson<AnalyzeResponse>("/api/analyze", { urls: [url], baseDomain }, signal, 1);
  const page = res.pages[0];
  if (!page) throw new Error("We couldn't read that page.");
  const crawled = toCrawledPage(page, page.redirects.length ? [page.url] : []);
  return buildRows([crawled], { asOf: Date.now(), complete: false, startUrl: page.finalUrl })[0];
}

/** Why a single page can't be judged, or null when it can. */
export function unreadableReason(row: PageRow): string | null {
  if (row.status === 0) return row.error ? `We couldn't reach it: ${row.error}.` : "We couldn't reach it.";
  if (row.offsiteRedirect) return `It redirects to another site (${row.offsiteRedirect}). Try that address instead.`;
  if (row.status >= 400) return `It answered with HTTP ${row.status}, so there's nothing to check.`;
  if (!row.isHtml) return "That address isn't an HTML page (it looks like a file or feed).";
  return null;
}

/** For each URL, the pages that use it (as a link or an image). */
export function usedOn(rows: PageRow[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const add = (url: string, page: string) => {
    const list = map.get(url);
    if (!list) map.set(url, [page]);
    else if (!list.includes(page)) list.push(page);
  };
  for (const row of rows) {
    if (!row.hasContent) continue;
    for (const link of row.outlinksInternal) add(link, row.finalUrl);
    for (const link of row.outlinksExternal) add(link, row.finalUrl);
    for (const src of row.imageSrcs) add(src, row.finalUrl);
  }
  return map;
}

export type CheckedKind = "internal" | "external" | "image";

export interface CheckedLink extends LinkCheck {
  kind: CheckedKind;
  foundOn: string[];
}

/** Every link and image a crawl checked, labeled by kind and where it was found. */
export function checkedLinks(rows: PageRow[], checks: Record<string, LinkCheck>): CheckedLink[] {
  const found = usedOn(rows);
  const images = new Set(rows.flatMap((r) => r.imageSrcs));
  const internal = new Set(rows.flatMap((r) => r.outlinksInternal.map(urlKey)));
  return Object.values(checks).map((check) => ({
    ...check,
    kind: images.has(check.url) ? "image" : internal.has(urlKey(check.url)) ? "internal" : "external",
    foundOn: found.get(check.url) ?? [],
  }));
}

/** A CSV cell, quoted when it needs to be. */
export function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function downloadText(filename: string, text: string, type = "text/csv;charset=utf-8"): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
