import type { ReactNode } from "react";
import {
  canonicalMatches,
  ISSUES,
  isNoindex,
  META_MAX,
  META_MIN,
  readingMinutes,
  SEVERITY_ORDER,
  TITLE_MAX_PX,
  TITLE_MIN,
  type PageRow,
} from "@/lib/seo/issues";
import { titleWidth } from "@/lib/seo/pixels";
import { displayPath } from "@/lib/seo/url";
import { IssueChip, MetricBadge, ScoreBadge, StatusBadge } from "./bits";

export type ColumnGroup = "basic" | "technical" | "content" | "social" | "pagespeed";

export const COLUMN_GROUPS: { id: ColumnGroup; label: string }[] = [
  { id: "basic", label: "Basic SEO" },
  { id: "technical", label: "Technical" },
  { id: "content", label: "Content" },
  { id: "social", label: "Social" },
  { id: "pagespeed", label: "PageSpeed" },
];

export interface Column {
  key: string;
  label: string;
  group: ColumnGroup | "core";
  width: string;
  sort?: (row: PageRow) => number | string | null;
  render: (row: PageRow) => ReactNode;
}

const dash = <span className="text-ink-3">—</span>;

function text(value: string, mono = false): ReactNode {
  if (!value) return dash;
  return (
    <span className={`block truncate ${mono ? "font-mono text-xs" : ""}`} title={value}>
      {value}
    </span>
  );
}

function list(values: string[]): ReactNode {
  if (!values.length) return dash;
  return (
    <span className="block truncate" title={values.join("\n")}>
      {values.join(" · ")}
    </span>
  );
}

function length(value: number, min: number, max: number, present: boolean): ReactNode {
  if (!present) return dash;
  const tone = value === 0 ? "text-crit" : value < min || value > max ? "text-warn" : "text-good";
  return <span className={`font-mono text-xs font-bold ${tone}`}>{value}</span>;
}

function num(value: number, show: boolean): ReactNode {
  return show ? <span className="font-mono text-xs tabular-nums">{value.toLocaleString()}</span> : dash;
}

/** Sort key that puts the scariest pages first. */
export function issueWeight(row: PageRow): number {
  return row.issues.reduce((sum, issue) => sum + [100, 10, 1][SEVERITY_ORDER[ISSUES[issue.code].severity]], 0);
}

export const COLUMNS: Column[] = [
  {
    key: "url",
    label: "Page",
    group: "core",
    width: "min-w-64 max-w-80",
    sort: (r) => r.finalUrl,
    render: (r) => (
      <span className="block truncate font-mono text-xs font-semibold" title={r.finalUrl}>
        {displayPath(r.finalUrl)}
      </span>
    ),
  },
  {
    key: "score",
    label: "Score",
    group: "core",
    width: "w-20",
    sort: (r) => r.score,
    render: (r) => <ScoreBadge score={r.score} size="sm" />,
  },
  {
    key: "issues",
    label: "Issues",
    group: "core",
    width: "min-w-72 max-w-96",
    sort: issueWeight,
    render: (r) =>
      r.issues.length ? (
        <span className="flex flex-wrap gap-1">
          {r.issues.slice(0, 3).map((issue) => (
            <IssueChip key={issue.code} issue={issue} />
          ))}
          {r.issues.length > 3 && (
            <span className="rounded-full bg-sunk px-2 py-0.5 text-xs font-semibold text-ink-2">
              +{r.issues.length - 3}
            </span>
          )}
        </span>
      ) : (
        <span className="text-xs font-semibold text-good">Nothing. Suspicious.</span>
      ),
  },
  {
    key: "status",
    label: "Status",
    group: "basic",
    width: "w-20",
    sort: (r) => r.status,
    render: (r) => <StatusBadge status={r.offsiteRedirect ? 301 : r.status} error={r.error} />,
  },
  { key: "title", label: "Title", group: "basic", width: "min-w-56 max-w-72", sort: (r) => r.title, render: (r) => text(r.title) },
  {
    key: "titleLength",
    label: "Title len",
    group: "basic",
    width: "w-20",
    sort: (r) => (r.hasContent ? r.title.length : null),
    // Colored by pixel width, which is what decides whether Google cuts it off.
    render: (r) => {
      if (!r.hasContent) return dash;
      const px = titleWidth(r.title);
      const tone = !r.title ? "text-crit" : r.title.length < TITLE_MIN || px > TITLE_MAX_PX ? "text-warn" : "text-good";
      return (
        <span className={`font-mono text-xs font-bold ${tone}`} title={`~${px}px of ${TITLE_MAX_PX}px`}>
          {r.title.length}
        </span>
      );
    },
  },
  { key: "h1", label: "H1", group: "basic", width: "min-w-48 max-w-64", sort: (r) => r.h1[0] ?? "", render: (r) => list(r.h1) },
  {
    key: "keyword",
    label: "Main keyword",
    group: "basic",
    width: "min-w-36 max-w-48",
    sort: (r) => r.primaryKeyword?.phrase ?? "",
    render: (r) => (r.primaryKeyword ? text(r.primaryKeyword.phrase, true) : dash),
  },
  {
    key: "meta",
    label: "Meta description",
    group: "basic",
    width: "min-w-64 max-w-80",
    sort: (r) => r.metaDescription,
    render: (r) => text(r.metaDescription),
  },
  {
    key: "metaLength",
    label: "Meta len",
    group: "basic",
    width: "w-20",
    sort: (r) => (r.hasContent ? r.metaDescription.length : null),
    render: (r) => length(r.metaDescription.length, META_MIN, META_MAX, r.hasContent),
  },
  {
    key: "ttfb",
    label: "TTFB",
    group: "technical",
    width: "w-20",
    sort: (r) => r.ttfbMs || r.loadTimeMs,
    // web.dev: good up to 0.8s, poor over 1.8s. Older scans only have the download time.
    render: (r) =>
      r.ttfbMs ? (
        <MetricBadge value={r.ttfbMs} good={800} ok={1800} suffix="ms" higherIsBetter={false} />
      ) : (
        <MetricBadge value={r.loadTimeMs} good={1000} ok={3000} suffix="ms" higherIsBetter={false} />
      ),
  },
  {
    key: "size",
    label: "Size",
    group: "technical",
    width: "w-20",
    sort: (r) => r.sizeBytes,
    render: (r) => num(Math.round(r.sizeBytes / 1024), r.sizeBytes > 0),
  },
  {
    key: "canonical",
    label: "Canonical",
    group: "technical",
    width: "min-w-48 max-w-64",
    sort: (r) => r.canonicalUrl,
    render: (r) => {
      const matches = canonicalMatches(r);
      if (matches === null) return dash;
      return matches ? (
        <span className="text-xs font-semibold text-good">Self ✓</span>
      ) : (
        text(r.canonicalUrl, true)
      );
    },
  },
  {
    key: "indexable",
    label: "Indexable",
    group: "technical",
    width: "w-24",
    sort: (r) => (r.hasContent ? (isNoindex(r) ? 0 : 1) : null),
    render: (r) =>
      !r.hasContent ? dash : isNoindex(r) ? (
        <span className="text-xs font-bold text-crit">noindex</span>
      ) : (
        <span className="text-xs font-semibold text-good">Yes</span>
      ),
  },
  {
    key: "redirects",
    label: "Redirected from",
    group: "technical",
    width: "min-w-40 max-w-56",
    sort: (r) => r.redirectedFrom.length,
    render: (r) => (r.offsiteRedirect ? text(`→ ${r.offsiteRedirect}`, true) : list(r.redirectedFrom.map(displayPath))),
  },
  { key: "lang", label: "Lang", group: "technical", width: "w-16", sort: (r) => r.lang, render: (r) => text(r.lang, true) },
  {
    key: "inbound",
    label: "Linked from",
    group: "technical",
    width: "w-24",
    sort: (r) => (r.hasContent ? r.inbound : null),
    render: (r) =>
      r.hasContent ? (
        <span className={`font-mono text-xs font-bold ${r.inbound === 0 ? "text-warn" : ""}`}>{r.inbound}</span>
      ) : (
        dash
      ),
  },
  {
    key: "depth",
    label: "Depth",
    group: "technical",
    width: "w-16",
    sort: (r) => r.depth,
    render: (r) => (r.depth === null ? dash : <span className="font-mono text-xs">{r.depth}</span>),
  },
  {
    key: "brokenLinks",
    label: "Broken links",
    group: "technical",
    width: "w-24",
    sort: (r) => r.brokenOutlinks.length,
    render: (r) =>
      r.hasContent ? (
        <span className={`font-mono text-xs font-bold ${r.brokenOutlinks.length ? "text-crit" : "text-good"}`}>
          {r.brokenOutlinks.length}
        </span>
      ) : (
        dash
      ),
  },
  {
    key: "aiScore",
    label: "AI search",
    group: "content",
    width: "w-20",
    sort: (r) => r.aiScore,
    render: (r) => <MetricBadge value={r.aiScore} good={70} ok={50} />,
  },
  {
    key: "ease",
    label: "Ease",
    group: "content",
    width: "w-16",
    sort: (r) => r.readability.readingEase,
    render: (r) => <MetricBadge value={r.readability.readingEase} good={60} ok={30} />,
  },
  {
    key: "updated",
    label: "Updated",
    group: "content",
    width: "w-28",
    sort: (r) => r.lastUpdated ?? "",
    render: (r) =>
      r.lastUpdated ? (
        <span className={`font-mono text-xs ${r.isPost && (r.monthsSinceUpdate ?? 0) >= 12 ? "font-bold text-warn" : ""}`}>
          {r.lastUpdated.slice(0, 10)}
        </span>
      ) : (
        dash
      ),
  },
  {
    key: "words",
    label: "Words",
    group: "content",
    width: "w-20",
    sort: (r) => (r.hasContent ? r.wordCount : null),
    render: (r) =>
      r.hasContent ? (
        <MetricBadge value={r.wordCount} good={900} ok={300} />
      ) : (
        dash
      ),
  },
  {
    key: "readTime",
    label: "Read",
    group: "content",
    width: "w-16",
    sort: (r) => (r.hasContent ? r.wordCount : null),
    render: (r) => (r.hasContent ? <span className="font-mono text-xs">{readingMinutes(r.wordCount)}m</span> : dash),
  },
  { key: "h2", label: "H2s", group: "content", width: "min-w-48 max-w-64", render: (r) => list(r.h2) },
  {
    key: "internal",
    label: "Int. links",
    group: "content",
    width: "w-20",
    sort: (r) => r.internalLinks,
    render: (r) => num(r.internalLinks, r.hasContent),
  },
  {
    key: "external",
    label: "Ext. links",
    group: "content",
    width: "w-20",
    sort: (r) => r.externalLinks,
    render: (r) => num(r.externalLinks, r.hasContent),
  },
  {
    key: "images",
    label: "Images",
    group: "content",
    width: "w-20",
    sort: (r) => r.imageCount,
    render: (r) => num(r.imageCount, r.hasContent),
  },
  {
    key: "missingAlt",
    label: "No alt",
    group: "content",
    width: "w-20",
    sort: (r) => r.imagesMissingAlt,
    render: (r) =>
      r.hasContent ? (
        <span className={`font-mono text-xs font-bold ${r.imagesMissingAlt ? "text-warn" : "text-good"}`}>
          {r.imagesMissingAlt}
        </span>
      ) : (
        dash
      ),
  },
  {
    key: "schema",
    label: "Schema",
    group: "content",
    width: "min-w-36 max-w-48",
    sort: (r) => r.schemaTypes.join(","),
    render: (r) => list(r.schemaTypes),
  },
  {
    key: "published",
    label: "Published",
    group: "content",
    width: "w-28",
    sort: (r) => r.datePublished,
    render: (r) => text(r.datePublished.slice(0, 10), true),
  },
  { key: "author", label: "Author", group: "content", width: "min-w-28 max-w-40", sort: (r) => r.author, render: (r) => text(r.author) },
  { key: "ogTitle", label: "OG title", group: "social", width: "min-w-48 max-w-64", sort: (r) => r.ogTitle, render: (r) => text(r.ogTitle) },
  {
    key: "ogDescription",
    label: "OG description",
    group: "social",
    width: "min-w-56 max-w-72",
    render: (r) => text(r.ogDescription),
  },
  {
    key: "ogImage",
    label: "OG image",
    group: "social",
    width: "w-24",
    sort: (r) => (r.ogImage ? 1 : 0),
    render: (r) => (r.ogImage ? <span className="text-xs font-semibold text-good">Yes</span> : dash),
  },
  {
    key: "twitter",
    label: "Twitter card",
    group: "social",
    width: "w-32",
    sort: (r) => r.twitterCard,
    render: (r) => text(r.twitterCard, true),
  },
  {
    key: "psPerf",
    label: "Perf",
    group: "pagespeed",
    width: "w-16",
    sort: (r) => r.pagespeed?.performance ?? null,
    render: (r) => <MetricBadge value={r.pagespeed?.performance} good={90} ok={50} />,
  },
  {
    key: "psSeo",
    label: "PS SEO",
    group: "pagespeed",
    width: "w-16",
    sort: (r) => r.pagespeed?.seo ?? null,
    render: (r) => <MetricBadge value={r.pagespeed?.seo} good={90} ok={50} />,
  },
  {
    key: "psA11y",
    label: "A11y",
    group: "pagespeed",
    width: "w-16",
    sort: (r) => r.pagespeed?.accessibility ?? null,
    render: (r) => <MetricBadge value={r.pagespeed?.accessibility} good={90} ok={50} />,
  },
  {
    key: "psBp",
    label: "Best pr.",
    group: "pagespeed",
    width: "w-16",
    sort: (r) => r.pagespeed?.bestPractices ?? null,
    render: (r) => <MetricBadge value={r.pagespeed?.bestPractices} good={90} ok={50} />,
  },
  {
    key: "psLcp",
    label: "LCP",
    group: "pagespeed",
    width: "w-16",
    sort: (r) => r.pagespeed?.lcpSeconds ?? null,
    render: (r) => <MetricBadge value={r.pagespeed?.lcpSeconds} good={2.5} ok={4} suffix="s" higherIsBetter={false} />,
  },
  {
    key: "psCls",
    label: "CLS",
    group: "pagespeed",
    width: "w-16",
    sort: (r) => r.pagespeed?.cls ?? null,
    render: (r) => <MetricBadge value={r.pagespeed?.cls} good={0.1} ok={0.25} higherIsBetter={false} />,
  },
  {
    key: "psTbt",
    label: "TBT",
    group: "pagespeed",
    width: "w-16",
    sort: (r) => r.pagespeed?.tbtMs ?? null,
    render: (r) => <MetricBadge value={r.pagespeed?.tbtMs} good={200} ok={600} suffix="ms" higherIsBetter={false} />,
  },
];
