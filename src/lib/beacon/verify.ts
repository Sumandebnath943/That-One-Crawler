import { promises as dns } from "node:dns";

// Is that really Googlebot? Search engines publish a reverse-DNS domain for their crawlers: the
// IP's PTR name must end in it, and that name must resolve back to the same IP. Anyone can type
// "Googlebot" into a user agent; this is the part that can't be faked. It runs in the background
// (inside waitUntil), so it never slows a page down.

export type Verification = { state: "verified"; host: string } | { state: "spoofed"; host?: string } | { state: "unknown" };

const TIMEOUT_MS = 1_500;
const cache = new Map<string, { at: number; value: Verification }>();
const TTL_MS = 6 * 60 * 60_000;

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS))]);
}

export async function verifyCrawler(ip: string, domains: string[]): Promise<Verification> {
  if (!ip || ip === "unknown") return { state: "unknown" };
  const key = `${ip}|${domains.join(",")}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

  let value: Verification = { state: "unknown" };
  try {
    const names = await withTimeout(dns.reverse(ip));
    const host = names.find((name) => domains.some((d) => name === d || name.endsWith(`.${d}`)));
    if (!host) {
      value = { state: "spoofed", host: names[0] };
    } else {
      const addresses = await withTimeout(dns.lookup(host, { all: true }));
      value = addresses.some((a) => a.address === ip) ? { state: "verified", host } : { state: "spoofed", host };
    }
  } catch (err) {
    // No PTR record at all is a "no": real crawlers always have one. A timeout tells us nothing.
    const code = (err as NodeJS.ErrnoException).code;
    value = code === "ENOTFOUND" || code === "ENODATA" ? { state: "spoofed" } : { state: "unknown" };
  }
  if (cache.size > 2_000) cache.clear();
  cache.set(key, { at: Date.now(), value });
  return value;
}
