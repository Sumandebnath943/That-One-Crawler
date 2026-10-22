// Which file a browser actually downloads for an <img>. Weighing the plain src overstates things:
// Next.js and most CMSs put the largest variant (often 3840px wide) there as a fallback, while
// browsers pick a much smaller one from srcset. We pick the way Chrome does for Lighthouse's
// desktop run: a 1350px-wide viewport at 1x.

export const DESKTOP_VIEWPORT = 1350;
const REM = 16;

interface Candidate {
  url: string;
  width?: number;
  density?: number;
}

export function parseSrcset(srcset: string): Candidate[] {
  const candidates: Candidate[] = [];
  // Candidates are "url descriptor" pairs split on a comma followed by whitespace (URLs can hold bare commas).
  for (const part of srcset.split(/,\s+/)) {
    const [url, descriptor = ""] = part.trim().split(/\s+/);
    if (!url) continue;
    const w = descriptor.match(/^(\d+)w$/i);
    const x = descriptor.match(/^(\d*\.?\d+)x$/i);
    candidates.push({ url: url.replace(/,$/, ""), width: w ? Number(w[1]) : undefined, density: x ? Number(x[1]) : w ? undefined : 1 });
  }
  return candidates;
}

function lengthPx(value: string, viewport: number): number | null {
  const v = value.trim().toLowerCase();
  const calc = v.match(/^calc\((.+)\)$/);
  if (calc) {
    // Enough of calc() for "100vw - 3rem" and friends: sum the terms left to right.
    let total = 0;
    let sign = 1;
    for (const token of calc[1].split(/\s+/)) {
      if (token === "+") sign = 1;
      else if (token === "-") sign = -1;
      else {
        const px = lengthPx(token, viewport);
        if (px === null) return null;
        total += sign * px;
      }
    }
    return total;
  }
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return null;
  if (v.endsWith("vw")) return (n / 100) * viewport;
  if (v.endsWith("rem") || v.endsWith("em")) return n * REM;
  if (v.endsWith("px") || /^\d+(\.\d+)?$/.test(v)) return n;
  return null;
}

function mediaMatches(media: string, viewport: number): boolean {
  const conditions = [...media.matchAll(/\((min|max)-width\s*:\s*([^)]+)\)/gi)];
  if (!conditions.length) return false;
  return conditions.every(([, kind, value]) => {
    const px = lengthPx(value, viewport);
    if (px === null) return false;
    return kind.toLowerCase() === "min" ? viewport >= px : viewport <= px;
  });
}

/** The image slot width the `sizes` attribute gives at this viewport (100vw when it's missing). */
export function slotWidth(sizes: string | undefined, viewport = DESKTOP_VIEWPORT): number {
  if (!sizes) return viewport;
  for (const entry of sizes.split(",")) {
    const trimmed = entry.trim();
    const media = trimmed.match(/^(\(.*\))\s+(.+)$/);
    if (media) {
      if (mediaMatches(media[1], viewport)) return lengthPx(media[2], viewport) ?? viewport;
    } else {
      return lengthPx(trimmed, viewport) ?? viewport;
    }
  }
  return viewport;
}

/** The URL a 1350px desktop browser at 1x would fetch for this image. */
export function pickImageCandidate(src: string, srcset: string | undefined, sizes: string | undefined, viewport = DESKTOP_VIEWPORT): string {
  if (!srcset) return src;
  const candidates = parseSrcset(srcset);
  if (!candidates.length) return src;
  const byWidth = candidates.filter((c) => c.width).sort((a, b) => a.width! - b.width!);
  if (byWidth.length) {
    const needed = slotWidth(sizes, viewport);
    return (byWidth.find((c) => c.width! >= needed) ?? byWidth[byWidth.length - 1]).url;
  }
  const byDensity = candidates.sort((a, b) => (a.density ?? 1) - (b.density ?? 1));
  return (byDensity.find((c) => (c.density ?? 1) >= 1) ?? byDensity[0]).url;
}

/** For Next.js and Vercel image-optimizer URLs, the original file they resize. */
export function optimizerSource(url: string): string | null {
  try {
    const u = new URL(url);
    if (!/^\/(?:_next|_vercel)\/image\/?$/.test(u.pathname)) return null;
    const original = u.searchParams.get("url");
    return original ? new URL(original, u.origin).toString() : null;
  } catch {
    return null;
  }
}
