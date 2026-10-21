"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { postJson } from "@/lib/client/api";
import { fetchPagespeed } from "@/lib/client/crawl";
import {
  canonicalMatches,
  ISSUES,
  isNoindex,
  META_MAX,
  META_MIN,
  readingMinutes,
  TITLE_MAX,
  TITLE_MIN,
  issueText,
  type PageRow,
} from "@/lib/seo/issues";
import type { AiSuggestion, CrawledPage, FeatureFlags } from "@/lib/seo/types";
import { displayPath } from "@/lib/seo/url";
import { MetricBadge, ScoreBadge, SEVERITY_STYLES, StatusBadge } from "./bits";

const AI_QUIPS = ["Consulting the oracle…", "Rewriting your title with love…", "Thinking very hard about meta descriptions…"];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t-2 border-dashed border-line pt-4">
      <h3 className="mb-3 text-xs font-bold tracking-wider text-ink-3 uppercase">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-3 py-1.5 text-sm">
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

function lengthHint(length: number, min: number, max: number) {
  const tone = length === 0 ? "text-crit" : length < min || length > max ? "text-warn" : "text-good";
  return (
    <span className={`font-mono font-bold ${tone}`}>
      {length} chars (aim for {min}–{max})
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard blocked; nothing else to do.
        }
      }}
      className="shrink-0 rounded-md border-2 border-ink px-2 py-0.5 text-xs font-bold hover:bg-lime hover:text-lime-ink"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function AiPanel({ row, onUpdate }: { row: PageRow; onUpdate: (patch: Partial<CrawledPage>) => void }) {
  const [state, setState] = useState<{ loading: boolean; error: string | null }>({ loading: false, error: null });
  const ai = row.ai;

  const run = async () => {
    setState({ loading: true, error: null });
    try {
      const result = await postJson<AiSuggestion>("/api/ai", {
        page: {
          url: row.finalUrl,
          title: row.title,
          metaDescription: row.metaDescription,
          h1: row.h1,
          h2: row.h2,
          wordCount: row.wordCount,
          score: row.score,
          issues: row.issues.map(issueText),
          schemaTypes: row.schemaTypes,
          pagespeed: row.pagespeed,
        },
      });
      onUpdate({ ai: result });
      setState({ loading: false, error: null });
    } catch (err) {
      setState({ loading: false, error: err instanceof Error ? err.message : "The AI wandered off. Try again." });
    }
  };

  if (!ai) {
    return (
      <div>
        <button
          type="button"
          onClick={run}
          disabled={state.loading}
          className="rounded-xl border-2 border-ink bg-lime px-4 py-2 font-display font-extrabold text-lime-ink transition hover:-translate-y-0.5 hover:shadow-brutal-sm disabled:opacity-70"
        >
          {state.loading ? AI_QUIPS[row.finalUrl.length % AI_QUIPS.length] : "✦ Get AI fixes"}
        </button>
        <p className="mt-2 text-xs text-ink-3">A rewritten title, a better meta description and three priority fixes.</p>
        {state.error && <p className="mt-2 text-sm font-semibold text-crit">{state.error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4 text-sm">
      <p className="rounded-xl bg-sunk p-3 italic">{ai.assessment}</p>
      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-ink-3 uppercase">Suggested title ({ai.title.length})</span>
          <CopyButton text={ai.title} />
        </div>
        <p className="font-semibold">{ai.title}</p>
      </div>
      {ai.metaDescription && (
        <div>
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-ink-3 uppercase">Suggested meta description ({ai.metaDescription.length})</span>
            <CopyButton text={ai.metaDescription} />
          </div>
          <p>{ai.metaDescription}</p>
        </div>
      )}
      {ai.fixes.length > 0 && (
        <ol className="list-decimal space-y-1.5 pl-5">
          {ai.fixes.map((fix) => (
            <li key={fix}>{fix}</li>
          ))}
        </ol>
      )}
      <div className="flex items-center justify-between text-xs text-ink-3">
        <span>
          via {ai.provider ?? "Groq"} · {ai.model}
        </span>
        <button type="button" onClick={run} disabled={state.loading} className="font-semibold underline underline-offset-2">
          {state.loading ? "Thinking…" : "Try again"}
        </button>
      </div>
      {state.error && <p className="font-semibold text-crit">{state.error}</p>}
    </div>
  );
}

function PagespeedPanel({ row, onUpdate }: { row: PageRow; onUpdate: (patch: Partial<CrawledPage>) => void }) {
  const [loading, setLoading] = useState(false);
  const ps = row.pagespeed;

  const run = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
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
        onClick={run}
        disabled={loading}
        className="rounded-lg border-2 border-ink px-3 py-1.5 text-sm font-bold transition hover:bg-lime hover:text-lime-ink disabled:opacity-60"
      >
        {loading ? "Asking Google… (10–30s)" : ps ? "Run again" : "Run PageSpeed (mobile)"}
      </button>
    </div>
  );
}

export function PageDrawer({
  row,
  features,
  onClose,
  onUpdate,
}: {
  row: PageRow;
  features: FeatureFlags | null;
  onClose: () => void;
  onUpdate: (patch: Partial<CrawledPage>) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

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

  const matches = canonicalMatches(row);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
      <button type="button" aria-label="Close details" onClick={onClose} className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" />
      <aside className="rise relative flex h-full w-full max-w-2xl flex-col border-l-2 border-ink bg-card shadow-brutal-lg">
        <header className="flex items-start gap-3 border-b-2 border-ink p-4">
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
              {row.loadTimeMs > 0 && <span className="text-ink-3">{row.loadTimeMs} ms</span>}
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
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          <section>
            <h3 className="mb-3 text-xs font-bold tracking-wider text-ink-3 uppercase">
              {row.issues.length ? `${row.issues.length} things to fix` : "Issues"}
            </h3>
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
          </section>

          {row.hasContent && (
            <>
              {features?.ai && (
                <Section title="AI second opinion">
                  <AiPanel row={row} onUpdate={onUpdate} />
                </Section>
              )}

              <Section title="Search appearance">
                <dl>
                  <Field label="Title" hint={lengthHint(row.title.length, TITLE_MIN, TITLE_MAX)}>
                    <Value value={row.title} />
                  </Field>
                  <Field label="Meta description" hint={lengthHint(row.metaDescription.length, META_MIN, META_MAX)}>
                    <Value value={row.metaDescription} />
                  </Field>
                  <Field label="Meta keywords">
                    <Value value={row.metaKeywords} />
                  </Field>
                </dl>
              </Section>

              <Section title="Headings">
                <dl>
                  <Field label={`H1 (${row.h1Count})`}>
                    {row.h1.length ? row.h1.map((h) => <div key={h}>{h}</div>) : <Value value="" />}
                  </Field>
                  <Field label="H2 (first 6)">
                    {row.h2.length ? row.h2.map((h) => <div key={h}>{h}</div>) : <Value value="" />}
                  </Field>
                  <Field label="H3 (first 6)">
                    {row.h3.length ? row.h3.map((h) => <div key={h}>{h}</div>) : <Value value="" />}
                  </Field>
                </dl>
              </Section>

              <Section title="Content">
                <dl>
                  <Field label="Words">
                    {row.wordCount.toLocaleString()} <span className="text-ink-3">· {readingMinutes(row.wordCount)} min read</span>
                  </Field>
                  <Field label="Links">
                    {row.internalLinks} internal · {row.externalLinks} external
                  </Field>
                  <Field label="Images">
                    {row.imageCount} total · {row.imagesMissingAlt} missing alt
                  </Field>
                  <Field label="Published">
                    <Value value={row.datePublished} mono />
                  </Field>
                  <Field label="Author">
                    <Value value={row.author} />
                  </Field>
                </dl>
              </Section>

              <Section title="Technical">
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
                  <Field label="Schema">
                    <Value value={row.schemaTypes.join(", ")} />
                  </Field>
                  <Field label="Size">{Math.round(row.sizeBytes / 1024)} KB</Field>
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

              <Section title="Social">
                <dl>
                  <Field label="OG title">
                    <Value value={row.ogTitle} />
                  </Field>
                  <Field label="OG description">
                    <Value value={row.ogDescription} />
                  </Field>
                  <Field label="Twitter card">
                    <Value value={row.twitterCard} mono />
                  </Field>
                  <Field label="OG image">
                    {row.ogImage ? (
                      // eslint-disable-next-line @next/next/no-img-element -- arbitrary third-party image preview
                      <img
                        src={row.ogImage}
                        alt="Open Graph preview"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="max-h-40 rounded-lg border-2 border-line"
                      />
                    ) : (
                      <Value value="" />
                    )}
                  </Field>
                </dl>
              </Section>

              {features?.pagespeed && (
                <Section title="PageSpeed">
                  <PagespeedPanel row={row} onUpdate={onUpdate} />
                </Section>
              )}
            </>
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
      </aside>
    </div>
  );
}
