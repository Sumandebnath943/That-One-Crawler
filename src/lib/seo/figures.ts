// Specific numbers ("figures") on a page. Used to measure how fact-dense content is (GEO)
// and by the fabrication guard: an AI rewrite must not introduce numbers the page never stated.

const FIGURE_RE =
  /(?:[$€£₹¥]|rs\.?\s?|inr\s?|usd\s?)?\s?\d[\d,]*(?:\.\d+)?\s?(?:%|percent|k\b|m\b|bn\b|million|billion|lakhs?|crores?|x\b|years?|months?|weeks?|days?|hours?|minutes?|mins?|seconds?|kg|km|mb|gb)?/gi;

const UNIT_RE = /[$€£₹¥%]|rs|inr|usd|percent|k\b|m\b|bn\b|million|billion|lakh|crore|x\b|year|month|week|day|hour|min|second|kg|km|mb|gb/i;

function normalizeFigure(raw: string): { digits: string; hasUnit: boolean } {
  const num = raw.match(/\d[\d,]*(?:\.\d+)?/)?.[0] ?? "";
  const digits = num.replace(/,/g, "").replace(/\.0+$/, "").replace(/^0+(?=\d)/, "");
  return { digits, hasUnit: UNIT_RE.test(raw) };
}

/** Distinct figures in the text. Small bare counts ("3 steps", "Step 2") are not factual claims and are skipped. */
export function extractFigures(text: string): string[] {
  const found = new Set<string>();
  for (const match of (text || "").matchAll(FIGURE_RE)) {
    const raw = match[0].trim();
    const { digits, hasUnit } = normalizeFigure(raw);
    if (!digits) continue;
    if (!hasUnit && Number(digits) <= 12) continue;
    found.add(raw.replace(/\s+/g, " "));
  }
  return [...found];
}

/** Figures in `draft` whose number never appears in `source`. */
export function findUnsupportedFigures(draft: string, source: string): string[] {
  const allowed = new Set([...(source || "").matchAll(FIGURE_RE)].map((m) => normalizeFigure(m[0]).digits).filter(Boolean));
  return extractFigures(draft).filter((figure) => !allowed.has(normalizeFigure(figure).digits));
}

/** Web and email addresses in `draft` that don't occur in `source`. An invented link misleads as much as an invented number. */
export function findUnsupportedLinks(draft: string, source: string): string[] {
  const norm = (v: string) =>
    v
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/[.,;:!?)\]}'"]+$/, "")
      .replace(/\/$/, "");
  const allowed = (source || "").toLowerCase().replace(/https?:\/\//g, "").replace(/\bwww\./g, "");
  const found = draft.match(/\bhttps?:\/\/[^\s)\]}"'<>]+|\bwww\.[^\s)\]}"'<>]+|[\w.+-]+@[\w-]+(?:\.[\w-]+)+/gi) ?? [];
  return [...new Set(found.map((f) => f.replace(/[.,;:!?)\]}'"]+$/, "")))].filter((f) => !allowed.includes(norm(f)));
}
