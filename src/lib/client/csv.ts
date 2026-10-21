import { canonicalMatches, issueText, readingMinutes, type PageRow } from "@/lib/seo/issues";

type Cell = string | number | boolean | null | undefined;

const COLUMNS: [string, (row: PageRow) => Cell][] = [
  ["url", (r) => r.finalUrl],
  ["status_code", (r) => r.status || "error"],
  ["seo_score", (r) => r.score],
  ["issues", (r) => r.issues.map(issueText).join("; ")],
  ["title", (r) => r.title],
  ["title_length", (r) => (r.hasContent ? r.title.length : "")],
  ["meta_description", (r) => r.metaDescription],
  ["meta_description_length", (r) => (r.hasContent ? r.metaDescription.length : "")],
  ["h1_tags", (r) => r.h1.join(" | ")],
  ["h1_count", (r) => (r.hasContent ? r.h1Count : "")],
  ["h2_tags", (r) => r.h2.join(" | ")],
  ["h3_tags", (r) => r.h3.join(" | ")],
  ["meta_keywords", (r) => r.metaKeywords],
  ["robots_meta", (r) => r.robotsMeta],
  ["x_robots_tag", (r) => r.xRobotsTag],
  ["canonical_url", (r) => r.canonicalUrl],
  [
    "canonical_matches",
    (r) => {
      const matches = canonicalMatches(r);
      return matches === null ? "" : matches ? "Yes" : "No";
    },
  ],
  ["redirected_from", (r) => r.redirectedFrom.join(" | ")],
  ["offsite_redirect", (r) => r.offsiteRedirect],
  ["lang", (r) => r.lang],
  ["hreflang_languages", (r) => r.hreflang.join(", ")],
  ["og_title", (r) => r.ogTitle],
  ["og_description", (r) => r.ogDescription],
  ["og_image", (r) => r.ogImage],
  ["twitter_card", (r) => r.twitterCard],
  ["jsonld_schema_types", (r) => r.schemaTypes.join(", ")],
  ["date_published", (r) => r.datePublished],
  ["author", (r) => r.author],
  ["word_count", (r) => (r.hasContent ? r.wordCount : "")],
  ["reading_time_min", (r) => (r.hasContent ? readingMinutes(r.wordCount) : "")],
  ["internal_links", (r) => (r.hasContent ? r.internalLinks : "")],
  ["external_links", (r) => (r.hasContent ? r.externalLinks : "")],
  ["image_count", (r) => (r.hasContent ? r.imageCount : "")],
  ["images_missing_alt", (r) => (r.hasContent ? r.imagesMissingAlt : "")],
  ["load_time_ms", (r) => r.loadTimeMs],
  ["size_bytes", (r) => r.sizeBytes],
  ["ps_performance", (r) => r.pagespeed?.performance],
  ["ps_seo", (r) => r.pagespeed?.seo],
  ["ps_accessibility", (r) => r.pagespeed?.accessibility],
  ["ps_best_practices", (r) => r.pagespeed?.bestPractices],
  ["ps_lcp_s", (r) => r.pagespeed?.lcpSeconds],
  ["ps_cls", (r) => r.pagespeed?.cls],
  ["ps_tbt_ms", (r) => r.pagespeed?.tbtMs],
];

function escape(value: Cell): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: PageRow[]): string {
  const lines = [COLUMNS.map(([name]) => name).join(",")];
  for (const row of rows) lines.push(COLUMNS.map(([, get]) => escape(get(row))).join(","));
  return lines.join("\r\n");
}

export function downloadCsv(rows: PageRow[], domain: string): void {
  // The BOM makes Excel open UTF-8 correctly.
  const blob = new Blob(["﻿", toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `that-one-crawler-${domain || "scan"}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
