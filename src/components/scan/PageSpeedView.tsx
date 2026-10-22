"use client";

import { useState } from "react";
import type { FieldData, FieldMetric, PageSpeedAudit, PageSpeedCategory, PageSpeedCategoryId, PageSpeedResult } from "@/lib/seo/types";
import { ScoreRing } from "./bits";

// PageSpeed Insights, laid out the way Google's own page is: real-user data first, then the four
// Lighthouse categories, the lab metrics, and every audit that didn't pass.

const CATEGORY_LABEL: Record<PageSpeedCategoryId, string> = {
  performance: "Performance",
  accessibility: "Accessibility",
  "best-practices": "Best practices",
  seo: "SEO",
};

/** Lighthouse's mobile thresholds: [good up to, poor above]. */
const LAB = [
  { key: "fcpSeconds", label: "First Contentful Paint", short: "FCP", good: 1.8, poor: 3, unit: "s" },
  { key: "lcpSeconds", label: "Largest Contentful Paint", short: "LCP", good: 2.5, poor: 4, unit: "s" },
  { key: "tbtMs", label: "Total Blocking Time", short: "TBT", good: 200, poor: 600, unit: "ms" },
  { key: "cls", label: "Cumulative Layout Shift", short: "CLS", good: 0.1, poor: 0.25, unit: "" },
  { key: "speedIndexSeconds", label: "Speed Index", short: "SI", good: 3.4, poor: 5.8, unit: "s" },
] as const;

const RATING_TEXT = { good: "text-good", ok: "text-warn", poor: "text-crit" } as const;
const RATING_LABEL = { good: "Good", ok: "Needs improvement", poor: "Poor" } as const;

function tone(value: number, good: number, poor: number): keyof typeof RATING_TEXT {
  return value <= good ? "good" : value > poor ? "poor" : "ok";
}

const FIELD = [
  { key: "lcp", label: "Largest Contentful Paint", format: (v: number) => `${(v / 1000).toFixed(1)} s`, core: true },
  { key: "inp", label: "Interaction to Next Paint", format: (v: number) => `${Math.round(v)} ms`, core: true },
  { key: "cls", label: "Cumulative Layout Shift", format: (v: number) => v.toFixed(2), core: true },
  { key: "fcp", label: "First Contentful Paint", format: (v: number) => `${(v / 1000).toFixed(1)} s`, core: false },
  { key: "ttfb", label: "Time to First Byte", format: (v: number) => `${(v / 1000).toFixed(1)} s`, core: false },
] as const;

function Distribution({ metric }: { metric: FieldMetric }) {
  if (!metric.distribution) return null;
  const [good, ok, poor] = metric.distribution;
  return (
    <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-sunk" title={`${good}% good · ${ok}% needs improvement · ${poor}% poor`}>
      <span className="bg-good" style={{ width: `${good}%` }} />
      <span className="bg-warn" style={{ width: `${ok}%` }} />
      <span className="bg-crit" style={{ width: `${poor}%` }} />
    </div>
  );
}

export function FieldPanel({ field }: { field: FieldData }) {
  return (
    <div className="rounded-2xl border-2 border-ink bg-paper p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold tracking-wider text-ink-3 uppercase">
          Real users · {field.scope === "url" ? "this page" : "whole site (this page has too few visits)"} · last 28 days
        </p>
        {field.passed !== null && (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold ${field.passed ? "bg-good/15 text-good" : "bg-crit/12 text-crit"}`}>
            Core Web Vitals: {field.passed ? "Passed" : "Failed"}
          </span>
        )}
      </div>
      <dl className="mt-3 grid gap-3 sm:grid-cols-3">
        {FIELD.map(({ key, label, format, core }) => {
          const metric = field[key];
          return (
            <div key={key} className={core ? "" : "opacity-80"}>
              <dt className="text-xs text-ink-3">
                {label}
                {core ? "" : " (diagnostic)"}
              </dt>
              <dd className={`font-mono text-lg font-bold ${metric.rating ? RATING_TEXT[metric.rating] : "text-ink-3"}`}>
                {metric.p75 === null ? "—" : format(metric.p75)}
              </dd>
              <Distribution metric={metric} />
            </div>
          );
        })}
      </dl>
    </div>
  );
}

function AuditItem({ audit, performance }: { audit: PageSpeedAudit; performance: boolean }) {
  const [open, setOpen] = useState(false);
  const severity = audit.score === null ? "text-ink-3" : audit.score < 0.5 ? "text-crit" : "text-warn";
  return (
    <li className="rounded-xl border-2 border-line bg-paper">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-start gap-3 px-3 py-2 text-left">
        <span aria-hidden className={`mt-0.5 font-bold ${severity}`}>
          {audit.score === null ? "i" : "▲"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-sm font-semibold">{audit.title}</span>
          {audit.displayValue && <span className={`ml-2 text-xs font-bold ${severity}`}>{audit.displayValue}</span>}
        </span>
        {performance && audit.savingsMs ? (
          <span className="shrink-0 rounded-full bg-warn/15 px-2 py-0.5 font-mono text-[11px] font-bold text-warn">−{(audit.savingsMs / 1000).toFixed(2)}s</span>
        ) : null}
      </button>
      {open && (
        <div className="space-y-1.5 border-t-2 border-dashed border-line px-3 py-2 pl-9 text-sm text-ink-2">
          {audit.description && <p>{audit.description}</p>}
          {audit.items && (
            <ul className="space-y-0.5 font-mono text-xs break-all">
              {audit.items.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          )}
          {audit.learnMore && (
            <a href={audit.learnMore} target="_blank" rel="noreferrer" className="inline-block text-xs font-bold underline underline-offset-2">
              Learn more on web.dev ↗
            </a>
          )}
        </div>
      )}
    </li>
  );
}

function CategoryAudits({ category }: { category: PageSpeedCategory }) {
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const performance = category.id === "performance";
  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="font-display text-lg font-extrabold">
          {CATEGORY_LABEL[category.id]} <span className="font-mono text-sm text-ink-3">{category.score ?? "—"}</span>
        </h4>
        <span className="text-xs text-ink-3">
          {category.failed.length} to fix · {category.passed} passed{category.manual ? ` · ${category.manual} to check by hand` : ""}
        </span>
      </div>
      {category.failed.length ? (
        <ul className="space-y-1.5">
          {category.failed.map((audit) => (
            <AuditItem key={audit.id} audit={audit} performance={performance} />
          ))}
        </ul>
      ) : (
        <p className="rounded-xl bg-good/10 px-3 py-2 text-sm font-semibold text-good">Every scored audit passed.</p>
      )}
      {category.diagnostics.length > 0 && (
        <>
          <button type="button" onClick={() => setShowDiagnostics((v) => !v)} className="text-xs font-bold underline underline-offset-4">
            {showDiagnostics ? "Hide" : "Show"} {category.diagnostics.length} diagnostics (don&apos;t affect the score)
          </button>
          {showDiagnostics && (
            <ul className="space-y-1.5">
              {category.diagnostics.map((audit) => (
                <AuditItem key={audit.id} audit={audit} performance={false} />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

/** A full PageSpeed Insights result. Results saved by older versions only show the headline numbers. */
export function PageSpeedView({ result, compact = false }: { result: PageSpeedResult; compact?: boolean }) {
  const scores: [PageSpeedCategoryId, number | null][] = [
    ["performance", result.performance],
    ["accessibility", result.accessibility],
    ["best-practices", result.bestPractices],
    ["seo", result.seo],
  ];
  return (
    <div className="space-y-5">
      {result.field ? (
        <FieldPanel field={result.field} />
      ) : (
        result.categories && (
          <p className="rounded-xl border-2 border-dashed border-line px-3 py-2 text-sm text-ink-3">
            No real-user data: Google hasn&apos;t seen enough Chrome visits to this page or site yet. The lab test below still applies.
          </p>
        )
      )}
      <div className="grid items-start gap-5 rounded-2xl border-2 border-ink bg-paper p-4 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="space-y-4">
          <div className="grid grid-cols-2 justify-items-center gap-4 sm:grid-cols-4">
            {scores.map(([id, score]) => (
              <ScoreRing key={id} score={score} label={CATEGORY_LABEL[id]} kind="speed" size="sm" />
            ))}
          </div>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {LAB.map(({ key, label, short, good, poor, unit }) => {
              const value = result[key];
              const t = typeof value === "number" ? tone(value, good, poor) : null;
              return (
                <div key={key} className="rounded-lg border-2 border-line p-2" title={label}>
                  <dt className="text-[10px] font-bold tracking-wide text-ink-3 uppercase">{compact ? short : label}</dt>
                  <dd className={`font-mono text-sm font-bold ${t ? RATING_TEXT[t] : "text-ink-3"}`}>
                    {typeof value === "number" ? `${value}${unit && ` ${unit}`}` : "—"}
                  </dd>
                  {t && !compact && <span className="text-[10px] text-ink-3">{RATING_LABEL[t]}</span>}
                </div>
              );
            })}
          </dl>
          <p className="text-xs text-ink-3">
            Lab test ({result.strategy ?? "mobile"}
            {result.lighthouseVersion ? `, Lighthouse ${result.lighthouseVersion}` : ""}
            {result.fetchedAt ? `, ${new Date(result.fetchedAt).toLocaleString()}` : ""}). Lab scores vary a few points between runs; real-user data is what Google ranks on.
          </p>
        </div>
        {result.screenshot && (
          // eslint-disable-next-line @next/next/no-img-element -- a data: URI from PageSpeed
          <img src={result.screenshot} alt="How the page looked at the end of the test" className="mx-auto w-32 rounded-lg border-2 border-line" />
        )}
      </div>
      {result.warnings?.length ? (
        <ul className="space-y-1 rounded-xl border-2 border-warn bg-warn/10 p-3 text-sm text-ink-2">
          {result.warnings.map((w) => (
            <li key={w}>⚠ {w}</li>
          ))}
        </ul>
      ) : null}
      {result.categories?.map((category) => (
        <CategoryAudits key={category.id} category={category} />
      ))}
    </div>
  );
}
