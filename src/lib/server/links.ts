import type { LinkCheck, LinkState } from "@/lib/seo/types";
import { BlockedUrlError, safeFetch } from "./safe-fetch";

/** Turn an HTTP outcome into something a person can act on. Bot-blocking isn't "broken". */
export function classifyLink(status: number, error?: string): LinkState {
  if (status === 0) {
    if (error && /domain not found|connection refused|ssl certificate/i.test(error)) return "broken";
    return "error";
  }
  if (status === 404 || status === 410) return "broken";
  if ([401, 403, 405, 406, 429, 451, 999].includes(status)) return "blocked";
  if (status >= 500) return "error";
  if (status >= 400) return "broken";
  return "ok";
}

/**
 * Check one URL with HEAD, confirming any failure with a tiny GET: some servers answer every
 * HEAD with 404 or 405 (bsky.app does) while the page itself works fine.
 */
export async function checkLink(url: string, signal?: AbortSignal): Promise<LinkCheck> {
  try {
    let res = await safeFetch(url, { method: "HEAD", timeoutMs: 8_000, signal, accept: "*/*" });
    if (res.status >= 400 || (res.status === 0 && !res.error)) {
      const retry = await safeFetch(url, { timeoutMs: 8_000, maxBytes: 1, signal, accept: "*/*" });
      res = { ...retry, sizeBytes: res.sizeBytes || Number(retry.headers?.get("content-length")) || 0 };
    }
    return {
      url,
      status: res.status,
      state: classifyLink(res.status, res.error),
      sizeBytes: res.sizeBytes || undefined,
      contentType: res.headers?.get("content-type") ?? undefined,
      error: res.error,
    };
  } catch (err) {
    if (err instanceof BlockedUrlError) return { url, status: 0, state: "blocked", error: err.message };
    return { url, status: 0, state: "error", error: err instanceof Error ? err.message : "Check failed" };
  }
}
