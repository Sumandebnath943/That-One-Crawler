import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { gunzipSync } from "node:zlib";
import type { RedirectHop } from "@/lib/seo/types";
import { SITE_URL } from "@/lib/site";
import { bareHost } from "@/lib/seo/url";

/** Identifies us to the sites we scan; the /bot page explains the crawler and how to opt out. */
export const USER_AGENT = `Mozilla/5.0 (compatible; ThatOneCrawler/1.0; +${SITE_URL}/bot)`;

/** Thrown for URLs we refuse to fetch (private networks, odd protocols). */
export class BlockedUrlError extends Error {}

function isPrivateIPv4(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIPv6(ip: string): boolean {
  const x = ip.toLowerCase();
  if (x === "::" || x === "::1") return true;
  const mapped = x.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  return /^(fc|fd|fe[89ab]|ff)/.test(x);
}

const dnsCache = new Map<string, { at: number; result: Promise<void> }>();

async function checkHost(hostname: string): Promise<void> {
  const host = hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || /\.(localhost|local|internal|home\.arpa)$/i.test(host)) {
    throw new BlockedUrlError("Local and internal addresses can't be crawled.");
  }
  const family = isIP(host);
  const addresses = family
    ? [{ address: host, family }]
    : await lookup(host, { all: true }).catch(() => {
        throw new Error("Domain not found");
      });
  for (const { address, family: f } of addresses) {
    if (f === 4 ? isPrivateIPv4(address) : isPrivateIPv6(address)) {
      throw new BlockedUrlError("That address points at a private network, so we won't crawl it.");
    }
  }
}

/** Refuse anything that isn't a public http(s) address. Set ALLOW_PRIVATE_URLS=1 to crawl local sites in dev. */
export async function assertPublicUrl(url: URL): Promise<void> {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new BlockedUrlError("Only http and https URLs can be crawled.");
  }
  if (process.env.ALLOW_PRIVATE_URLS === "1") return;
  const cached = dnsCache.get(url.hostname);
  if (cached && Date.now() - cached.at < 60_000) return cached.result;
  const result = checkHost(url.hostname);
  dnsCache.set(url.hostname, { at: Date.now(), result });
  if (dnsCache.size > 500) dnsCache.delete(dnsCache.keys().next().value!);
  return result;
}

export interface FetchOptions {
  /** When set, redirects leaving this site are reported instead of followed. */
  baseDomain?: string;
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  accept?: string;
  /** Only the agent-readiness check sets this, to see whether a site turns AI agents away. */
  userAgent?: string;
  signal?: AbortSignal;
  /** HEAD skips downloading the body (used by the link checker). */
  method?: "GET" | "HEAD";
}

export interface FetchResult {
  requestedUrl: string;
  finalUrl: string;
  status: number;
  redirects: RedirectHop[];
  offsiteRedirect?: string;
  headers: Headers | null;
  body: Uint8Array;
  sizeBytes: number;
  truncated: boolean;
  timeMs: number;
  /** Until the final response's headers arrived (redirects included), like a browser's TTFB. */
  ttfbMs: number;
  error?: string;
}

async function readLimited(res: Response, maxBytes: number): Promise<{ body: Uint8Array; truncated: boolean }> {
  if (!res.body) return { body: new Uint8Array(), truncated: false };
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let truncated = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (total + value.byteLength > maxBytes) {
      chunks.push(value.subarray(0, maxBytes - total));
      total = maxBytes;
      truncated = true;
      await reader.cancel().catch(() => {});
      break;
    }
    chunks.push(value);
    total += value.byteLength;
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { body, truncated };
}

function describeError(err: unknown): string {
  if (err instanceof BlockedUrlError) return err.message;
  if (err instanceof Error) {
    if (err.name === "TimeoutError") return "Timed out";
    if (err.name === "AbortError") return "Cancelled";
    const cause = (err as Error & { cause?: { code?: string } }).cause;
    switch (cause?.code) {
      case "ENOTFOUND":
        return "Domain not found";
      case "ECONNREFUSED":
        return "Connection refused";
      case "ECONNRESET":
        return "Connection reset";
      case "CERT_HAS_EXPIRED":
      case "DEPTH_ZERO_SELF_SIGNED_CERT":
      case "UNABLE_TO_VERIFY_LEAF_SIGNATURE":
      case "ERR_TLS_CERT_ALTNAME_INVALID":
        return "SSL certificate problem";
    }
    return err.message === "fetch failed" ? "Network error" : err.message;
  }
  return "Unknown error";
}

/**
 * Fetch a URL the careful way: every hop is checked against private networks,
 * redirects are followed by hand so we can record them, and the body is capped.
 */
export async function safeFetch(url: string, opts: FetchOptions = {}): Promise<FetchResult> {
  const { baseDomain, timeoutMs = 15_000, maxBytes = 3_000_000, maxRedirects = 5 } = opts;
  const started = performance.now();
  const timeout = AbortSignal.timeout(timeoutMs);
  const signal = opts.signal ? AbortSignal.any([timeout, opts.signal]) : timeout;
  const redirects: RedirectHop[] = [];
  let current = url;
  let ttfbMs = 0;

  const result = (partial: Partial<FetchResult>): FetchResult => ({
    requestedUrl: url,
    finalUrl: current,
    status: 0,
    redirects,
    headers: null,
    body: new Uint8Array(),
    sizeBytes: 0,
    truncated: false,
    timeMs: Math.round(performance.now() - started),
    ttfbMs,
    ...partial,
  });

  try {
    for (let hop = 0; ; hop++) {
      const target = new URL(current);
      await assertPublicUrl(target);
      const res = await fetch(target, {
        method: opts.method ?? "GET",
        redirect: "manual",
        signal,
        headers: {
          "User-Agent": opts.userAgent ?? USER_AGENT,
          Accept: opts.accept ?? "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.8",
        },
      });
      ttfbMs = Math.round(performance.now() - started);

      const location = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && location) {
        await res.body?.cancel().catch(() => {});
        const next = new URL(location, target).toString();
        if (baseDomain && bareHost(new URL(next).hostname) !== baseDomain) {
          return result({ status: res.status, headers: res.headers, offsiteRedirect: next });
        }
        if (hop >= maxRedirects) {
          return result({ status: res.status, headers: res.headers, error: "Too many redirects" });
        }
        redirects.push({ url: current, status: res.status });
        current = next;
        continue;
      }

      const declared = Number(res.headers.get("content-length"));
      if (opts.method === "HEAD") {
        await res.body?.cancel().catch(() => {});
        return result({
          status: res.status,
          headers: res.headers,
          sizeBytes: Number.isFinite(declared) ? declared : 0,
          timeMs: Math.round(performance.now() - started),
        });
      }
      const { body, truncated } = await readLimited(res, maxBytes);
      return result({
        status: res.status,
        headers: res.headers,
        body,
        truncated,
        sizeBytes: truncated && declared > body.byteLength ? declared : body.byteLength,
        timeMs: Math.round(performance.now() - started),
      });
    }
  } catch (err) {
    if (err instanceof BlockedUrlError) throw err;
    return result({ error: describeError(err) });
  }
}

/** Decode a response body using its declared (or sniffed) charset, falling back to UTF-8. */
export function decodeBody(body: Uint8Array, contentType: string | null): string {
  let bytes = body;
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    try {
      bytes = gunzipSync(bytes);
    } catch {
      // Not actually gzip; decode as-is.
    }
  }
  let charset = contentType?.match(/charset=["']?([\w-]+)/i)?.[1];
  if (!charset) {
    const head = new TextDecoder("latin1").decode(bytes.subarray(0, 2048));
    charset = head.match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1];
  }
  try {
    return new TextDecoder(charset || "utf-8").decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}
