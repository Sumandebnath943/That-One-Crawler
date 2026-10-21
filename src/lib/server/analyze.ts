import { emptyPage, type PageData } from "@/lib/seo/types";
import { extractContent } from "./extract";
import { BlockedUrlError, decodeBody, safeFetch } from "./safe-fetch";

function looksLikeHtml(contentType: string, body: Uint8Array): boolean {
  if (/html/i.test(contentType)) return true;
  if (contentType) return false;
  const head = new TextDecoder("latin1").decode(body.subarray(0, 512)).toLowerCase();
  return head.includes("<html") || head.includes("<!doctype html");
}

/** Fetch one URL and turn it into PageData. Never throws; failures come back as status 0 + error. */
export async function analyzeUrl(url: string, baseDomain: string, signal?: AbortSignal): Promise<PageData> {
  const page = emptyPage(url);
  let res;
  try {
    res = await safeFetch(url, { baseDomain, signal });
  } catch (err) {
    if (err instanceof BlockedUrlError) return { ...page, error: err.message };
    throw err;
  }

  const contentType = res.headers?.get("content-type") ?? "";
  const network = {
    finalUrl: res.finalUrl,
    status: res.status,
    error: res.error,
    redirects: res.redirects,
    offsiteRedirect: res.offsiteRedirect,
    contentType,
    loadTimeMs: res.timeMs,
    sizeBytes: res.sizeBytes,
    xRobotsTag: res.headers?.get("x-robots-tag") ?? "",
  };

  const isHtml = looksLikeHtml(contentType, res.body);
  if (res.error || res.offsiteRedirect || res.status >= 400 || !isHtml) {
    return { ...page, ...network, isHtml };
  }

  const html = decodeBody(res.body, contentType);
  return { ...page, ...network, isHtml: true, ...extractContent(html, res.finalUrl, baseDomain) };
}
