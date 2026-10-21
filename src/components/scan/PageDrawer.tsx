"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { postJson } from "@/lib/client/api";
import { QuotaError, runAi } from "@/lib/client/ai";
import { fetchPagespeed } from "@/lib/client/crawl";
import {
  aiReadinessChecks,
  canonicalMatches,
  ISSUES,
  isNoindex,
  issueText,
  META_MAX,
  META_MIN,
  readingMinutes,
  TITLE_MAX,
  TITLE_MIN,
  type PageRow,
} from "@/lib/seo/issues";
import type {
  AiFaq,
  AiHeadings,
  AiIntro,
  AiMeta,
  AiResult,
  AiSection,
  BrandRules,
  CrawledPage,
  CruxMetric,
  CruxResult,
  FeatureFlags,
} from "@/lib/seo/types";
import { displayPath } from "@/lib/seo/url";
import { AiQuotaBar, CopyButton, DiffView, GuardNotes } from "./ai-ui";
import { MetricBadge, ScoreBadge, SEVERITY_STYLES, StatusBadge } from "./bits";
import { SerpPreview, SocialPreview } from "./Previews";

type Tab = "overview" | "content" | "tech" | "ai";
const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "content", label: "Content" },
  { id: "tech", label: "Links & tech" },
  { id: "ai", label: "✦ AI tools" },
];

function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="border-t-2 border-dashed border-line pt-4 first:border-t-0 first:pt-0">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold tracking-wider text-ink-3 uppercase">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr] gap-3 py-1.5 text-sm">
      <dt className="text-ink-3">{label}</dt>
      <dd className="min-w-0 break-words">
        {children}
        {hint && <span className="ml-2 text-xs text-ink-3">{hint}</span>}
      </dd>
    </div>
  );
}

function Value({ value, mono = false }: { value: string; mono?: boolean }) {
  return value ? <span className={mono ? "font-mono text-xs" : ""}>{value}</span> : <span className="text-ink-3">—</span>;
}

const Tick = ({ ok }: { ok: boolean }) => <span className={ok ? "text-good" : "text-crit"}>{ok ? "✓" : "✗"}</span>;

function lengthHint(length: number, min: number, max: number) {
  const tone = length === 0 ? "text-crit" : length < min || length > max ? "text-warn" : "text-good";
  return (
    <span className={`font-mono font-bold ${tone}`}>
      {length} chars (aim for {min}–{max})
    </span>
  );
}

/** "Title (52 chars)", turning amber with the target range when an AI suggestion misses it. */
function LengthLabel({ label, length, min, max }: { label: string; length: number; min: number; max: number }) {
  const off = length < min || length > max;
  return (
    <span className={`text-xs font-bold uppercase ${off ? "text-warn" : "text-ink-3"}`}>
      {label} ({length} chars{off ? `, aim for ${min}–${max}` : ""})
    </span>
  );
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString().slice(0, 10) : value;
}

// ---------------------------------------------------------------- Overview

function OverviewTab({ row }: { row: PageRow }) {
  return (
    <div className="space-y-5">
      {row.hasContent && (
        <Section title="In Google">
          <SerpPreview row={row} altTitle={row.ai?.meta?.title} altDescription={row.ai?.meta?.metaDescription} />
        </Section>
      )}
      <Section title={row.issues.length ? `${row.issues.length} things to fix` : "Issues"}>
        {row.issues.length ? (
          <ul className="space-y-2">
            {row.issues.map((issue) => {
              const info = ISSUES[issue.code];
              const style = SEVERITY_STYLES[info.severity];
              return (
                <li key={issue.code} className={`rounded-xl border-l-4 p-3 ${style.bg} ${style.border}`}>
                  <p className={`text-sm font-bold ${style.text}`}>
                    {info.label} {issue.detail && <span className="font-mono text-xs font-semibold">{issue.detail}</span>}
                  </p>
                  <p className="mt-1 text-sm text-ink-2">{info.why}</p>
                  <p className="mt-1 text-sm">
                    <b>Fix:</b> {info.fix}
                  </p>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-good">Nothing to fix. We checked twice. It&apos;s a little suspicious.</p>
        )}
      </Section>
      {row.hasContent && (
        <Section title="When shared">
          <SocialPreview row={row} />
        </Section>
      )}
      {!row.hasContent && row.offsiteRedirect && (
        <Section title="Redirect">
          <p className="font-mono text-xs break-all">→ {row.offsiteRedirect}</p>
        </Section>
      )}
      {!row.hasContent && row.error && (
        <Section title="What happened">
          <p className="text-sm">{row.error}</p>
        </Section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Content

function ContentTab({ row }: { row: PageRow }) {
  const r = row.readability;
  const checks = aiReadinessChecks(row);
  const keyword = row.primaryKeyword;
  return (
    <div className="space-y-5">
      <Section title="Search appearance">
        <dl>
          <Field label="Title" hint={lengthHint(row.title.length, TITLE_MIN, TITLE_MAX)}>
            <Value value={row.title} />
          </Field>
          <Field label="Meta description" hint={lengthHint(row.metaDescription.length, META_MIN, META_MAX)}>
            <Value value={row.metaDescription} />
          </Field>
        </dl>
      </Section>

      <Section title="Main keyword">
        {keyword ? (
          <div className="space-y-3 text-sm">
            <p>
              <span className="rounded-md bg-lime px-2 py-0.5 font-mono font-bold text-lime-ink">{keyword.phrase}</span>{" "}
              <span className="text-ink-3">
                used {keyword.count}× · {row.keywordDensity ?? 0}% of the text
              </span>
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span>
                <Tick ok={keyword.title} /> Title
              </span>
              <span>
                <Tick ok={keyword.h1} /> H1
              </span>
              <span>
                <Tick ok={keyword.meta} /> Description
              </span>
              <span>
                <Tick ok={keyword.url} /> URL
              </span>
              <span>
                <Tick ok={keyword.intro} /> First 100 words
              </span>
            </div>
            {row.keywords.length > 1 && (
              <p className="text-xs text-ink-3">
                Also about:{" "}
                {row.keywords
                  .filter((k) => k.phrase !== keyword.phrase)
                  .slice(0, 6)
                  .map((k) => `${k.phrase} (${k.count})`)
                  .join(" · ")}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-ink-3">No clear main keyword (or it&apos;s the site name on every page).</p>
        )}
      </Section>

      <Section title={`AI-search readiness · ${row.aiScore ?? "—"}/100`}>
        <p className="mb-3 text-xs text-ink-2">
          What Google AI Overviews, ChatGPT and Perplexity look for when choosing pages to quote (GEO / AEO).
        </p>
        <ul className="space-y-2">
          {checks.map((check) => (
            <li key={check.label} className="text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">{check.label}</span>
                <span className="font-mono text-xs">
                  {check.earned}/{check.points}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sunk">
                <div
                  className={`h-full rounded-full ${check.earned === check.points ? "bg-good" : check.earned ? "bg-warn" : "bg-crit"}`}
                  style={{ width: `${(check.earned / check.points) * 100}%` }}
                />
              </div>
              {check.earned < check.points && <p className="mt-1 text-xs text-ink-3">{check.tip}</p>}
            </li>
          ))}
        </ul>
      </Section>

      <Section title={`Heading outline · ${row.headings.length}`}>
        {row.headings.length ? (
          <ol className="space-y-1 text-sm">
            {row.headings.map((h, i) => {
              const skipped = i > 0 && h.level > row.headings[i - 1].level + 1;
              return (
                <li key={`${i}-${h.text}`} className="flex gap-2" style={{ paddingLeft: `${(h.level - 1) * 14}px` }}>
                  <span
                    className={`shrink-0 rounded px-1 font-mono text-[10px] font-bold ${skipped ? "bg-crit/15 text-crit" : "bg-sunk text-ink-2"}`}
                    title={skipped ? "Skipped a heading level" : undefined}
                  >
                    H{h.level}
                  </span>
                  <span className={h.level === 1 ? "font-bold" : ""}>{h.text}</span>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="text-sm text-ink-3">No content headings found.</p>
        )}
      </Section>

      <Section title="Readability">
        <dl>
          <Field label="Words">
            {row.wordCount.toLocaleString()} <span className="text-ink-3">· {readingMinutes(row.wordCount)} min read</span>
          </Field>
          <Field label="Reading ease" hint={r.readingEase === null ? "English pages only" : r.readingEase >= 60 ? "plain English" : r.readingEase >= 30 ? "fairly hard" : "hard going"}>
            {r.readingEase ?? "—"}
          </Field>
          <Field label="Sentences">
            {r.sentences} · avg {r.avgSentenceWords} words · {r.longSentences} over 35 words
          </Field>
          <Field label="Paragraphs">
            {r.paragraphs} · {r.longParagraphs} walls of text
          </Field>
        </dl>
      </Section>

      <Section title="Freshness">
        <dl>
          <Field label="Published">
            <Value value={formatDate(row.datePublished)} mono />
          </Field>
          <Field label="Modified">
            <Value value={formatDate(row.dateModified)} mono />
          </Field>
          <Field label="Sitemap lastmod">
            <Value value={formatDate(row.sitemapLastmod)} mono />
          </Field>
          <Field label="Last updated" hint={row.monthsSinceUpdate !== null ? `${row.monthsSinceUpdate} months ago` : undefined}>
            <Value value={formatDate(row.lastUpdated)} mono />
          </Field>
          <Field label="Author">
            <Value value={row.author} />
          </Field>
        </dl>
      </Section>

      {row.brand && (row.brand.bannedFound.length > 0 || row.brand.requiredMissing.length > 0) && (
        <Section title="Brand rules">
          <dl>
            <Field label="Banned phrases used">
              <Value value={row.brand.bannedFound.join(", ")} />
            </Field>
            <Field label="Required, missing">
              <Value value={row.brand.requiredMissing.join(", ")} />
            </Field>
          </dl>
        </Section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Links & tech

const CRUX_LABELS: [keyof Omit<CruxResult, "scope" | "collectionPeriod">, string, (v: number) => string][] = [
  ["lcp", "LCP", (v) => `${(v / 1000).toFixed(1)}s`],
  ["inp", "INP", (v) => `${Math.round(v)}ms`],
  ["cls", "CLS", (v) => v.toFixed(2)],
  ["fcp", "FCP", (v) => `${(v / 1000).toFixed(1)}s`],
  ["ttfb", "TTFB", (v) => `${(v / 1000).toFixed(1)}s`],
];

function CruxTile({ label, metric, format }: { label: string; metric: CruxMetric; format: (v: number) => string }) {
  const tone = metric.rating === "good" ? "text-good" : metric.rating === "ok" ? "text-warn" : metric.rating === "poor" ? "text-crit" : "text-ink-3";
  return (
    <div className="rounded-lg border-2 border-line p-2 text-center">
      <div className={`font-mono text-sm font-bold ${tone}`}>{metric.p75 === null ? "—" : format(metric.p75)}</div>
      <div className="text-[10px] font-bold text-ink-3 uppercase">{label}</div>
    </div>
  );
}

function SpeedSection({ row, features, onUpdate }: { row: PageRow; features: FeatureFlags | null; onUpdate: (patch: Partial<CrawledPage>) => void }) {
  const [busy, setBusy] = useState<"ps" | "crux" | null>(null);
  const [cruxError, setCruxError] = useState<string | null>(null);
  const ps = row.pagespeed;

  const runPs = async () => {
    setBusy("ps");
    try {
      onUpdate({ pagespeed: await fetchPagespeed(row.finalUrl) });
    } catch (err) {
      onUpdate({
        pagespeed: {
          performance: null,
          seo: null,
          accessibility: null,
          bestPractices: null,
          lcpSeconds: null,
          cls: null,
          tbtMs: null,
          error: err instanceof Error ? err.message : "PageSpeed failed",
        },
      });
    } finally {
      setBusy(null);
    }
  };

  const runCrux = async () => {
    setBusy("crux");
    setCruxError(null);
    try {
      onUpdate({ crux: await postJson<CruxResult>("/api/crux", { url: row.finalUrl }) });
    } catch (err) {
      setCruxError(err instanceof Error ? err.message : "Real-user data failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Section title="Speed">
      <dl>
        <Field label="Server response">{row.loadTimeMs} ms</Field>
        <Field label="HTML size">{Math.round(row.sizeBytes / 1024)} KB</Field>
      </dl>
      {features?.pagespeed && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-bold text-ink-3 uppercase">Lab test (PageSpeed Insights, mobile)</p>
          {ps && !ps.error && (
            <div className="grid grid-cols-4 gap-2 text-center sm:grid-cols-7">
              {(
                [
                  ["Perf", ps.performance, 90, 50, "", true],
                  ["SEO", ps.seo, 90, 50, "", true],
                  ["A11y", ps.accessibility, 90, 50, "", true],
                  ["Best pr.", ps.bestPractices, 90, 50, "", true],
                  ["LCP", ps.lcpSeconds, 2.5, 4, "s", false],
                  ["CLS", ps.cls, 0.1, 0.25, "", false],
                  ["TBT", ps.tbtMs, 200, 600, "ms", false],
                ] as const
              ).map(([label, value, good, ok, suffix, higher]) => (
                <div key={label} className="rounded-lg border-2 border-line p-2">
                  <MetricBadge value={value} good={good} ok={ok} suffix={suffix} higherIsBetter={higher} />
                  <div className="mt-0.5 text-[10px] font-bold text-ink-3 uppercase">{label}</div>
                </div>
              ))}
            </div>
          )}
          {ps?.error && <p className="text-sm font-semibold text-crit">PageSpeed failed: {ps.error}</p>}
          <button
            type="button"
            onClick={runPs}
            disabled={busy !== null}
            className="rounded-lg border-2 border-ink px-3 py-1.5 text-sm font-bold transition hover:bg-lime hover:text-lime-ink disabled:opacity-60"
          >
            {busy === "ps" ? "Asking Google… (10–30s)" : ps ? "Run PageSpeed again" : "Run PageSpeed"}
          </button>
        </div>
      )}
      {features?.crux && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-bold text-ink-3 uppercase">Real visitors (Chrome UX Report, last 28 days)</p>
          {row.crux && (
            <>
              <div className="grid grid-cols-5 gap-2">
                {CRUX_LABELS.map(([key, label, format]) => (
                  <CruxTile key={key} label={label} metric={row.crux![key]} format={format} />
                ))}
              </div>
              <p className="text-xs text-ink-3">
                {row.crux.scope === "url" ? "For this page." : "For the whole site (this page has too few visitors on its own)."}{" "}
                {row.crux.collectionPeriod}
              </p>
            </>
          )}
          {cruxError && <p className="text-sm text-warn">{cruxError}</p>}
          <button
            type="button"
            onClick={runCrux}
            disabled={busy !== null}
            className="rounded-lg border-2 border-ink px-3 py-1.5 text-sm font-bold transition hover:bg-lime hover:text-lime-ink disabled:opacity-60"
          >
            {busy === "crux" ? "Asking Chrome…" : row.crux ? "Refresh real-user data" : "Get real-user speed"}
          </button>
        </div>
      )}
    </Section>
  );
}

function TechTab({ row, features, onUpdate }: { row: PageRow; features: FeatureFlags | null; onUpdate: (patch: Partial<CrawledPage>) => void }) {
  const matches = canonicalMatches(row);
  return (
    <div className="space-y-5">
      <Section title="Internal links">
        <dl>
          <Field label="Linked from" hint="other scanned pages">
            <b>{row.inbound}</b>
          </Field>
          <Field label="Clicks from start">{row.depth ?? "—"}</Field>
          <Field label="Links out">
            {row.internalLinks} internal · {row.externalLinks} external
          </Field>
        </dl>
        {row.linkedFrom.length > 0 && (
          <ul className="mt-2 space-y-0.5 font-mono text-xs text-ink-2">
            {row.linkedFrom.slice(0, 10).map((u) => (
              <li key={u} className="truncate">
                ← {displayPath(u)}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {row.brokenOutlinks.length > 0 && (
        <Section title={`Broken links on this page · ${row.brokenOutlinks.length}`}>
          <ul className="space-y-1 font-mono text-xs">
            {row.brokenOutlinks.map((link) => (
              <li key={link.url} className="flex gap-2">
                <StatusBadge status={link.status} />
                <span className="min-w-0 break-all">{link.url}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Indexing">
        <dl>
          <Field label="Canonical" hint={matches === null ? undefined : matches ? "self ✓" : "points elsewhere"}>
            <Value value={row.canonicalUrl} mono />
          </Field>
          <Field label="Indexable">{isNoindex(row) ? <b className="text-crit">No (noindex)</b> : "Yes"}</Field>
          <Field label="Robots meta">
            <Value value={row.robotsMeta} mono />
          </Field>
          <Field label="X-Robots-Tag">
            <Value value={row.xRobotsTag} mono />
          </Field>
          <Field label="Language">
            <Value value={[row.lang, ...row.hreflang.map((h) => `alt: ${h}`)].filter(Boolean).join(", ")} mono />
          </Field>
          {row.redirectedFrom.length > 0 && (
            <Field label="Redirected from">
              {row.redirectedFrom.map((u) => (
                <div key={u} className="font-mono text-xs">
                  {u}
                </div>
              ))}
            </Field>
          )}
        </dl>
      </Section>

      <Section title="Structured data">
        <dl>
          <Field label="Types">
            <Value value={row.schemaTypes.join(", ")} />
          </Field>
          {row.schemaErrors > 0 && (
            <Field label="Broken blocks">
              <b className="text-crit">{row.schemaErrors}</b>
            </Field>
          )}
          {row.articleSchema && (
            <Field label="Article fields">
              <span className="flex flex-wrap gap-x-3">
                {Object.entries(row.articleSchema).map(([field, ok]) => (
                  <span key={field}>
                    <Tick ok={ok} /> {field}
                  </span>
                ))}
              </span>
            </Field>
          )}
          <Field label="FAQ markup">{row.hasFaqSchema ? "Yes" : row.geo.hasFaqSection ? "No (but the page has an FAQ)" : "No"}</Field>
        </dl>
      </Section>

      <Section title="Images">
        <dl>
          <Field label="Images">{row.imageCount}</Field>
          <Field label="Missing alt">{row.imagesMissingAlt}</Field>
          <Field label="No width/height">{row.imageStats.missingSize}</Field>
          <Field label="Not lazy-loaded">{row.imageStats.notLazy}</Field>
          <Field label="JPEG/PNG/GIF only">{row.imageStats.legacyFormat}</Field>
        </dl>
        {row.heavyImages.length > 0 && (
          <ul className="mt-2 space-y-0.5 font-mono text-xs">
            {row.heavyImages.map((img) => (
              <li key={img.url} className="break-all">
                <b className="text-warn">{Math.round(img.sizeBytes / 1024)} KB</b> {img.url}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <SpeedSection row={row} features={features} onUpdate={onUpdate} />
    </div>
  );
}

// ---------------------------------------------------------------- AI tools

function useAiRunner() {
  const [state, setState] = useState<{ running: string | null; error: string | null }>({ running: null, error: null });
  const run = async <T extends object>(name: string, body: Record<string, unknown>): Promise<AiResult<T> | null> => {
    setState({ running: name, error: null });
    try {
      const result = await runAi<T>(body);
      setState({ running: null, error: null });
      return result;
    } catch (err) {
      const message = err instanceof QuotaError || err instanceof Error ? err.message : "The AI wandered off. Try again.";
      setState({ running: null, error: message });
      return null;
    }
  };
  return { ...state, run };
}

function ToolCard({
  title,
  description,
  action,
  running,
  disabled,
  onRun,
  children,
}: {
  title: string;
  description: string;
  action: string;
  running: boolean;
  disabled?: boolean;
  onRun: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-xl border-2 border-ink bg-paper p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="font-display text-base font-extrabold">{title}</h4>
          <p className="text-xs text-ink-2">{description}</p>
        </div>
        <button
          type="button"
          onClick={onRun}
          disabled={running || disabled}
          className="shrink-0 rounded-lg border-2 border-ink bg-lime px-3 py-1 text-xs font-bold text-lime-ink transition hover:-translate-y-0.5 disabled:opacity-60"
        >
          {running ? "Thinking…" : action}
        </button>
      </div>
      {children && <div className="mt-3 space-y-3">{children}</div>}
    </div>
  );
}

function ResultFooter({ result }: { result: AiResult<object> }) {
  return (
    <div className="space-y-2">
      <GuardNotes guard={result.guard} />
      <p className="text-[11px] text-ink-3">
        via {result.provider} · {result.model}
      </p>
    </div>
  );
}

function AiTab({ row, brand, onUpdate }: { row: PageRow; brand: BrandRules | null; onUpdate: (patch: Partial<CrawledPage>) => void }) {
  const runner = useAiRunner();
  const h2s = row.headings.filter((h) => h.level === 2).map((h) => h.text);
  const [heading, setHeading] = useState(h2s[0] ?? "");
  const ai = row.ai ?? {};
  const base = {
    url: row.finalUrl,
    keyword: row.primaryKeyword?.phrase,
    issues: row.issues.map(issueText),
    brand: brand ? { brandName: brand.brandName, bannedPhrases: brand.bannedPhrases } : undefined,
  };
  const save = (patch: Partial<NonNullable<CrawledPage["ai"]>>) => onUpdate({ ai: { ...ai, ...patch } });
  const section = heading ? ai.sections?.[heading] : undefined;

  return (
    <div className="space-y-3">
      <AiQuotaBar />
      {runner.error && <p className="rounded-lg bg-crit/10 p-2 text-sm font-semibold text-crit">{runner.error}</p>}

      <ToolCard
        title="Title & meta description"
        description="A sharper title and description, plus the three fixes that matter most."
        action={ai.meta ? "Try again" : "Rewrite"}
        running={runner.running === "meta"}
        onRun={async () => {
          const result = await runner.run<AiMeta>("meta", { ...base, task: "meta" });
          if (result) save({ meta: result });
        }}
      >
        {ai.meta && (
          <>
            <p className="rounded-lg bg-sunk p-2 text-sm italic">{ai.meta.assessment}</p>
            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <LengthLabel label="Title" length={ai.meta.title.length} min={TITLE_MIN} max={TITLE_MAX} />
                <CopyButton text={ai.meta.title} />
              </div>
              <DiffView before={row.title} after={ai.meta.title} />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <LengthLabel label="Meta description" length={ai.meta.metaDescription.length} min={META_MIN} max={META_MAX} />
                <CopyButton text={ai.meta.metaDescription} />
              </div>
              <DiffView before={row.metaDescription} after={ai.meta.metaDescription} />
            </div>
            <SerpPreview row={row} altTitle={ai.meta.title} altDescription={ai.meta.metaDescription} />
            {ai.meta.fixes.length > 0 && (
              <ol className="list-decimal space-y-1 pl-5 text-sm">
                {ai.meta.fixes.map((fix) => (
                  <li key={fix}>{fix}</li>
                ))}
              </ol>
            )}
            <ResultFooter result={ai.meta} />
          </>
        )}
      </ToolCard>

      <ToolCard
        title="Quick-answer intro"
        description="A 40–60 word opening that answers the question outright: what AI Overviews love to quote."
        action={ai.intro ? "Try again" : "Write it"}
        running={runner.running === "intro"}
        onRun={async () => {
          const result = await runner.run<AiIntro>("intro", { ...base, task: "intro" });
          if (result) save({ intro: result });
        }}
      >
        {ai.intro && (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-ink-3 uppercase">Suggested intro</span>
              <CopyButton text={ai.intro.intro} />
            </div>
            {ai.intro.original ? <DiffView before={ai.intro.original} after={ai.intro.intro} /> : <p className="text-sm">{ai.intro.intro}</p>}
            <ResultFooter result={ai.intro} />
          </>
        )}
      </ToolCard>

      <ToolCard
        title="Better headings"
        description="Question-style, keyword-aware H2s and H3s that match how people search."
        action={ai.headings ? "Try again" : "Suggest"}
        running={runner.running === "headings"}
        disabled={row.headings.length < 2}
        onRun={async () => {
          const result = await runner.run<AiHeadings>("headings", { ...base, task: "headings" });
          if (result) save({ headings: result });
        }}
      >
        {ai.headings && (
          <>
            {ai.headings.items.length ? (
              <ul className="space-y-2">
                {ai.headings.items.map((item) => (
                  <li key={item.before} className="rounded-lg bg-sunk p-2">
                    <DiffView before={item.before} after={item.after} />
                    <p className="mt-1 text-xs text-ink-3">{item.why}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-good">Your headings are already in good shape.</p>
            )}
            <ResultFooter result={ai.headings} />
          </>
        )}
      </ToolCard>

      <ToolCard
        title="Rewrite a section"
        description="Pick one H2 section. We rewrite just that part: clearer, scannable, same facts."
        action={section ? "Try again" : "Rewrite"}
        running={runner.running === "section"}
        disabled={!heading}
        onRun={async () => {
          const result = await runner.run<AiSection>("section", { ...base, task: "section", heading });
          if (result) save({ sections: { ...ai.sections, [heading]: result } });
        }}
      >
        {h2s.length ? (
          <select
            value={heading}
            onChange={(e) => setHeading(e.target.value)}
            aria-label="Section to rewrite"
            className="w-full rounded-lg border-2 border-ink bg-card px-2 py-1 text-sm"
          >
            {h2s.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-sm text-ink-3">This page has no H2 sections to rewrite.</p>
        )}
        {section && (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-ink-3 uppercase">Changes</span>
              <CopyButton text={section.rewrite} label="Copy rewrite" />
            </div>
            <div className="max-h-80 overflow-y-auto rounded-lg border-2 border-line p-2">
              <DiffView before={section.original} after={section.rewrite} />
            </div>
            <ResultFooter result={section} />
          </>
        )}
      </ToolCard>

      <ToolCard
        title="FAQ generator"
        description="4–6 questions people search, answered only from your page, plus ready-to-paste FAQ markup."
        action={ai.faq ? "Try again" : "Generate"}
        running={runner.running === "faq"}
        onRun={async () => {
          const result = await runner.run<AiFaq>("faq", { ...base, task: "faq" });
          if (result) save({ faq: result });
        }}
      >
        {ai.faq && (
          <>
            <dl className="space-y-2">
              {ai.faq.items.map((item) => (
                <div key={item.question}>
                  <dt className="text-sm font-bold">{item.question}</dt>
                  <dd className="text-sm text-ink-2">{item.answer}</dd>
                </div>
              ))}
            </dl>
            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-ink-3 uppercase">FAQPage JSON-LD</span>
                <CopyButton text={`<script type="application/ld+json">\n${ai.faq.jsonLd}\n</script>`} label="Copy markup" />
              </div>
              <pre className="max-h-48 overflow-auto rounded-lg bg-ink p-2 font-mono text-[11px] text-paper">{ai.faq.jsonLd}</pre>
            </div>
            <ResultFooter result={ai.faq} />
          </>
        )}
      </ToolCard>
    </div>
  );
}

// ---------------------------------------------------------------- Drawer

export function PageDrawer({
  row,
  features,
  brand,
  onClose,
  onUpdate,
}: {
  row: PageRow;
  features: FeatureFlags | null;
  brand: BrandRules | null;
  onClose: () => void;
  onUpdate: (patch: Partial<CrawledPage>) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const tabs = TABS.filter((t) => row.hasContent || t.id === "overview").filter((t) => t.id !== "ai" || features?.ai !== undefined);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
      <button type="button" aria-label="Close details" onClick={onClose} className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" />
      <aside className="rise relative flex h-full w-full max-w-2xl flex-col border-l-2 border-ink bg-card shadow-brutal-lg">
        <header className="border-b-2 border-ink p-4 pb-0">
          <div className="flex items-start gap-3">
            <ScoreBadge score={row.score} />
            <div className="min-w-0 flex-1">
              <h2 id="drawer-title" className="truncate font-mono text-sm font-bold" title={row.finalUrl}>
                {displayPath(row.finalUrl)}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                <StatusBadge status={row.offsiteRedirect ? 301 : row.status} error={row.error} />
                <a href={row.finalUrl} target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-2">
                  Open page ↗
                </a>
                {row.aiScore !== null && <span className="text-ink-3">AI readiness {row.aiScore}/100</span>}
              </div>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-ink font-bold hover:bg-sunk"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <nav className="-mb-0.5 mt-3 flex gap-1 overflow-x-auto" role="tablist" aria-label="Page details">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`shrink-0 rounded-t-lg border-2 border-b-0 px-3 py-1.5 text-sm font-bold ${tab === t.id ? "border-ink bg-paper" : "border-transparent text-ink-2 hover:text-ink"}`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </header>

        <div className="flex-1 overflow-y-auto bg-paper/40 p-4">
          {tab === "overview" && <OverviewTab row={row} />}
          {tab === "content" && <ContentTab row={row} />}
          {tab === "tech" && <TechTab row={row} features={features} onUpdate={onUpdate} />}
          {tab === "ai" && <AiTab row={row} brand={brand} onUpdate={onUpdate} />}
        </div>
      </aside>
    </div>
  );
}
