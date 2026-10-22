import { optimizerSource } from "@/lib/seo/images";
import type { LinkCheck, LinkState } from "@/lib/seo/types";
import { displayPath } from "@/lib/seo/url";
import { BlockedUrlError, safeFetch, type FetchResult } from "./safe-fetch";

/** What Chrome sends for images, so image CDNs serve the WebP/AVIF a visitor would get (and weigh it). */
const IMAGE_ACCEPT = "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8";

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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * HEAD first, confirming any failure with a tiny GET: some servers answer every HEAD with 404 or
 * 405 (bsky.app does) while the page itself works fine.
 */
async function probe(url: string, accept: string, signal?: AbortSignal): Promise<FetchResult> {
  const head = await safeFetch(url, { method: "HEAD", timeoutMs: 8_000, signal, accept });
  if (head.status > 0 && head.status < 400) return head;
  const get = await safeFetch(url, { timeoutMs: 8_000, maxBytes: 1, signal, accept });
  return { ...get, sizeBytes: head.sizeBytes || Number(get.headers?.get("content-length")) || 0 };
}

export async function checkLink(url: string, signal?: AbortSignal, image = false): Promise<LinkCheck> {
  const accept = image ? IMAGE_ACCEPT : "*/*";
  try {
    let res = await probe(url, accept, signal);
    // Timeouts and 5xx are often a blip: one more try before we call it.
    if (classifyLink(res.status, res.error) === "error" && !signal?.aborted) {
      await sleep(1_500);
      const retry = await safeFetch(url, { timeoutMs: 10_000, maxBytes: 1, signal, accept });
      res = { ...retry, sizeBytes: res.sizeBytes || Number(retry.headers?.get("content-length")) || 0 };
    }
    const state = classifyLink(res.status, res.error);
    const check: LinkCheck = {
      url,
      status: res.status,
      state,
      sizeBytes: res.sizeBytes || undefined,
      contentType: res.headers?.get("content-type") ?? undefined,
      error: res.error,
    };

    // An image optimizer (Next.js, Vercel) answers 400 or 404 when the file it should resize is gone.
    const source = state === "broken" ? optimizerSource(url) : null;
    if (source) {
      const original = await probe(source, IMAGE_ACCEPT, signal);
      if (classifyLink(original.status, original.error) === "broken") {
        check.status = original.status || check.status;
        check.note = `The source image ${displayPath(source)} is missing (${original.status || original.error}), so every size of it fails.`;
      }
    }
    return check;
  } catch (err) {
    if (err instanceof BlockedUrlError) return { url, status: 0, state: "blocked", error: err.message };
    return { url, status: 0, state: "error", error: err instanceof Error ? err.message : "Check failed" };
  }
}
