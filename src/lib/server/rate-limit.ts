// In-memory, per-instance rate limiting. Serverless instances come and go, so this is a
// speed bump against hammering rather than a hard guarantee; it needs no database.

interface Bucket {
  reset: number;
  count: number;
}

const buckets = new Map<string, Bucket>();

/** The caller's IP. Vercel sets x-forwarded-for itself, so the first entry can be trusted there. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "local";
}

/** Count one hit; returns how many are left in the window (negative once over). */
export function hit(key: string, max: number, windowMs: number, now = Date.now()): number {
  let bucket = buckets.get(key);
  if (!bucket || bucket.reset <= now) {
    bucket = { reset: now + windowMs, count: 0 };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) if (b.reset <= now) buckets.delete(k);
  }
  return max - bucket.count;
}

export function peek(key: string, now = Date.now()): number {
  const bucket = buckets.get(key);
  return bucket && bucket.reset > now ? bucket.count : 0;
}

/** Returns a 429 response when this IP has made more than `max` calls to `name` in the window. */
export function rateLimit(request: Request, name: string, max: number, windowMs: number): Response | null {
  const remaining = hit(`${name}:${clientIp(request)}`, max, windowMs);
  if (remaining >= 0) return null;
  return Response.json(
    { error: "Whoa, slow down. Too many requests in a short time; try again in a minute.", code: "rate_limited" },
    { status: 429, headers: { "Retry-After": "60" } },
  );
}
