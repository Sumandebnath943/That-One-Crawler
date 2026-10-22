// Where a visitor is, how sure we are, and whose network they're on.
//
// Location comes from exactly one source, never a mix of two:
//  1. Vercel's edge headers (x-vercel-ip-*): free, instant, accurate to the city.
//  2. A free IP lookup (ipwho.is, then ipapi.co), used for location only when Vercel named no city.
//     It also supplies the ISP and ASN, which Vercel doesn't send.
// Mixing them once produced a Bengaluru city with a Chennai postcode. And a country with no city
// gets no coordinates: a country's centroid is not a position.

export type Precision = "city" | "country" | "unknown";

export interface Geo {
  ip: string;
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  flag?: string;
  postal?: string;
  latitude?: string;
  longitude?: string;
  timezone?: string;
  isp?: string;
  asn?: string;
  /** The network looks like a hosting provider rather than a home or mobile ISP. */
  datacenter: boolean;
  /** Mobile carriers geolocate to a regional gateway, often far from the phone. */
  mobile: boolean;
  precision: Precision;
  source: "vercel" | "lookup" | "none";
  /** Set when the two sources named different cities. */
  disagreement?: string;
}

const HOSTING = [
  "amazon", "aws", "google cloud", "google llc", "microsoft", "azure", "digitalocean", "linode", "akamai",
  "vultr", "hetzner", "ovh", "scaleway", "contabo", "oracle", "alibaba", "tencent", "cloudflare",
  "fastly", "leaseweb", "choopa", "hostinger", "godaddy", "namecheap", "bluehost", "rackspace",
  "equinix", "colocation", "datacenter", "data center", "hosting", "server", "vps", "m247", "cogent",
  "zenlayer", "upcloud", "datacamp", "hostroyale", "psychz", "quadranet", "servers.com", "netcup",
];

const MOBILE = [
  "jio", "airtel", "vodafone", "idea", "bsnl", "vi india", "t-mobile", "verizon wireless", "at&t mobility",
  "orange", "telefonica", "movistar", "o2", "ee limited", "three", "telstra", "optus", "rogers",
  "bell mobility", "telus mobility", "safaricom", "mtn", "globe telecom", "smart communications",
];

const matches = (list: string[], text?: string) => Boolean(text && list.some((h) => text.toLowerCase().includes(h)));

/** "IN" → 🇮🇳 */
export function flagFor(code?: string): string | undefined {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return undefined;
  const upper = code.toUpperCase();
  return String.fromCodePoint(0x1f1e6 + upper.charCodeAt(0) - 65, 0x1f1e6 + upper.charCodeAt(1) - 65);
}

/** "IN" → "India", without waiting on a lookup provider. */
export function countryName(code?: string): string | undefined {
  if (!code) return undefined;
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

/** The original client. Vercel's x-real-ip is already resolved; otherwise the left-most forwarded hop. */
export function clientIp(headers: Headers): string {
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  const forwarded = headers.get("x-vercel-forwarded-for") ?? headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

export function isPrivateIp(ip: string): boolean {
  return (
    ip === "unknown" ||
    ip === "::1" ||
    ip.startsWith("127.") ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("::ffff:127.") ||
    ip.startsWith("fc") ||
    ip.startsWith("fd") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
  );
}

interface Place {
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  postal?: string;
  latitude?: string;
  longitude?: string;
  timezone?: string;
}

interface Lookup extends Place {
  isp?: string;
  asn?: string;
}

function fromVercel(headers: Headers): Place {
  // Vercel percent-encodes city and region names ("New%20Delhi").
  const decode = (value: string | null) => {
    if (!value) return undefined;
    try {
      return decodeURIComponent(value) || undefined;
    } catch {
      return value || undefined;
    }
  };
  return {
    city: decode(headers.get("x-vercel-ip-city")),
    region: decode(headers.get("x-vercel-ip-country-region")),
    countryCode: headers.get("x-vercel-ip-country") ?? undefined,
    latitude: headers.get("x-vercel-ip-latitude") ?? undefined,
    longitude: headers.get("x-vercel-ip-longitude") ?? undefined,
    timezone: headers.get("x-vercel-ip-timezone") ?? undefined,
    postal: decode(headers.get("x-vercel-ip-postal-code")),
  };
}

const cache = new Map<string, { at: number; value: Lookup | null }>();
const CACHE_TTL_MS = 60 * 60_000;
// The location itself comes from Vercel; a slow lookup only costs the ISP name, so keep it short.
const LOOKUP_TIMEOUT_MS = 1_500;

async function getJson(url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS), cache: "no-store" });
    return res.ok ? ((await res.json()) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);
const num = (v: unknown) => (typeof v === "number" ? String(v) : undefined);

async function lookup(ip: string): Promise<Lookup | null> {
  const hit = cache.get(ip);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  let value: Lookup | null = null;
  const a = await getJson(`https://ipwho.is/${encodeURIComponent(ip)}`);
  if (a && a.success !== false) {
    const conn = (a.connection ?? {}) as Record<string, unknown>;
    const tz = (a.timezone ?? {}) as Record<string, unknown>;
    value = {
      city: str(a.city),
      region: str(a.region),
      country: str(a.country),
      countryCode: str(a.country_code),
      postal: str(a.postal),
      latitude: num(a.latitude),
      longitude: num(a.longitude),
      timezone: str(tz.id),
      isp: str(conn.isp) ?? str(conn.org),
      asn: conn.asn ? `AS${String(conn.asn)}` : undefined,
    };
  }
  // A second opinion only when the first couldn't name a city.
  if (!value?.city) {
    const b = await getJson(`https://ipapi.co/${encodeURIComponent(ip)}/json/`);
    if (b && !b.error && str(b.city)) {
      value = {
        city: str(b.city),
        region: str(b.region),
        country: str(b.country_name),
        countryCode: str(b.country_code),
        postal: str(b.postal),
        latitude: num(b.latitude),
        longitude: num(b.longitude),
        timezone: str(b.timezone),
        isp: str(b.org) ?? value?.isp,
        asn: str(b.asn) ?? value?.asn,
      };
    }
  }
  if (cache.size > 2_000) cache.clear();
  cache.set(ip, { at: Date.now(), value });
  return value;
}

export async function resolveGeo(headers: Headers): Promise<Geo> {
  const ip = clientIp(headers);
  const v = fromVercel(headers);
  const l = isPrivateIp(ip) ? null : await lookup(ip);

  const network = {
    isp: l?.isp,
    asn: l?.asn,
    datacenter: matches(HOSTING, l?.isp) || matches(HOSTING, l?.asn),
    mobile: matches(MOBILE, l?.isp),
  };
  const disagreement = v.city && l?.city && v.city.toLowerCase() !== l.city.toLowerCase() ? `lookup says ${l.city}` : undefined;
  const place: Place | null = v.city ? v : l?.city ? l : null;
  const source: Geo["source"] = v.city ? "vercel" : l?.city ? "lookup" : "none";

  if (place) {
    const countryCode = place.countryCode ?? v.countryCode;
    // Vercel's region is a code ("MH"); borrow the lookup's full name only when both agree on the city.
    const region = source === "vercel" && l?.city && !disagreement && l.region ? l.region : place.region;
    return {
      ip,
      city: place.city,
      region,
      country: place.country ?? countryName(countryCode),
      countryCode,
      flag: flagFor(countryCode),
      postal: place.postal,
      latitude: place.latitude,
      longitude: place.longitude,
      timezone: place.timezone ?? v.timezone,
      ...network,
      precision: "city",
      source,
      disagreement,
    };
  }

  const countryCode = v.countryCode ?? l?.countryCode;
  if (countryCode) {
    return {
      ip,
      country: l?.country ?? countryName(countryCode),
      countryCode,
      flag: flagFor(countryCode),
      timezone: v.timezone ?? l?.timezone,
      ...network,
      precision: "country",
      source: "none",
    };
  }
  return { ip, ...network, precision: "unknown", source: "none" };
}

/** "Pune, Maharashtra, India": whatever parts we have, without repeats. */
export function describePlace(geo: Pick<Geo, "city" | "region" | "country" | "countryCode">): string {
  const parts = [geo.city, geo.region, geo.country ?? countryName(geo.countryCode)].filter((p): p is string => Boolean(p));
  const unique = parts.filter((p, i) => parts.findIndex((q) => q.toLowerCase() === p.toLowerCase()) === i);
  return unique.length ? unique.join(", ") : "Unknown location";
}

/** Only ever a real position, never a country's centroid. */
export function mapLink(geo: Geo): string | undefined {
  if (geo.precision !== "city" || !geo.latitude || !geo.longitude) return undefined;
  return `https://www.google.com/maps?q=${geo.latitude},${geo.longitude}`;
}
