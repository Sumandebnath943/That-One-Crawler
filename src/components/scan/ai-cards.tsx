"use client";

import { useState, type ReactNode } from "react";
import { QuotaError, runAi } from "@/lib/client/ai";
import { issueText, META_MAX, META_MIN, TITLE_MAX, TITLE_MIN, type PageRow } from "@/lib/seo/issues";
import type { AiFaq, AiHeadings, AiIntro, AiMeta, AiResult, AiSection, BrandRules } from "@/lib/seo/types";
import { CopyButton, DiffView, GuardNotes } from "./ai-ui";
import { SerpPreview } from "./Previews";

// The AI tool cards, shared by the page drawer and the single-page tools.

export function useAiRunner() {
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

export type AiRunner = ReturnType<typeof useAiRunner>;

/** What every page task sends: the page, its main keyword, its issues and any brand rules. */
export function aiRequestBase(row: PageRow, brand: BrandRules | null = null): Record<string, unknown> {
  return {
    url: row.finalUrl,
    keyword: row.primaryKeyword?.phrase,
    issues: row.issues.map(issueText),
    brand: brand ? { brandName: brand.brandName, bannedPhrases: brand.bannedPhrases } : undefined,
  };
}

export function AiRunnerError({ runner }: { runner: AiRunner }) {
  if (!runner.error) return null;
  return <p className="rounded-lg bg-crit/10 p-2 text-sm font-semibold text-crit">{runner.error}</p>;
}

function AiCard({
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
    <div className="rounded-xl border-2 border-ink bg-paper p-3 sm:p-4">
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

/** "Title (52 chars)", turning amber with the target range when an AI suggestion misses it. */
export function LengthLabel({ label, length, min, max }: { label: string; length: number; min: number; max: number }) {
  const off = length < min || length > max;
  return (
    <span className={`text-xs font-bold uppercase ${off ? "text-warn" : "text-ink-3"}`}>
      {label} ({length} chars{off ? `, aim for ${min}–${max}` : ""})
    </span>
  );
}

interface CardProps<T extends object> {
  row: PageRow;
  base: Record<string, unknown>;
  runner: AiRunner;
  result?: AiResult<T>;
  onResult: (result: AiResult<T>) => void;
}

export function MetaAiCard({ row, base, runner, result, onResult, preview = true }: CardProps<AiMeta> & { preview?: boolean }) {
  return (
    <AiCard
      title="Title & meta description"
      description="A sharper title and description, plus the three fixes that matter most."
      action={result ? "Try again" : "Rewrite"}
      running={runner.running === "meta"}
      onRun={async () => {
        const next = await runner.run<AiMeta>("meta", { ...base, task: "meta" });
        if (next) onResult(next);
      }}
    >
      {result && (
        <>
          <p className="rounded-lg bg-sunk p-2 text-sm italic">{result.assessment}</p>
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <LengthLabel label="Title" length={result.title.length} min={TITLE_MIN} max={TITLE_MAX} />
              <CopyButton text={result.title} />
            </div>
            <DiffView before={row.title} after={result.title} />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <LengthLabel label="Meta description" length={result.metaDescription.length} min={META_MIN} max={META_MAX} />
              <CopyButton text={result.metaDescription} />
            </div>
            <DiffView before={row.metaDescription} after={result.metaDescription} />
          </div>
          {preview && <SerpPreview row={row} altTitle={result.title} altDescription={result.metaDescription} />}
          {result.fixes.length > 0 && (
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              {result.fixes.map((fix) => (
                <li key={fix}>{fix}</li>
              ))}
            </ol>
          )}
          <ResultFooter result={result} />
        </>
      )}
    </AiCard>
  );
}

export function IntroAiCard({ base, runner, result, onResult }: CardProps<AiIntro>) {
  return (
    <AiCard
      title="Quick-answer intro"
      description="A 40–60 word opening that answers the question outright: what AI Overviews love to quote."
      action={result ? "Try again" : "Write it"}
      running={runner.running === "intro"}
      onRun={async () => {
        const next = await runner.run<AiIntro>("intro", { ...base, task: "intro" });
        if (next) onResult(next);
      }}
    >
      {result && (
        <>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-ink-3 uppercase">Suggested intro</span>
            <CopyButton text={result.intro} />
          </div>
          {result.original ? <DiffView before={result.original} after={result.intro} /> : <p className="text-sm">{result.intro}</p>}
          <ResultFooter result={result} />
        </>
      )}
    </AiCard>
  );
}

export function HeadingsAiCard({ row, base, runner, result, onResult }: CardProps<AiHeadings>) {
  return (
    <AiCard
      title="Better headings"
      description="Question-style, keyword-aware H2s and H3s that match how people search."
      action={result ? "Try again" : "Suggest"}
      running={runner.running === "headings"}
      disabled={row.headings.length < 2}
      onRun={async () => {
        const next = await runner.run<AiHeadings>("headings", { ...base, task: "headings" });
        if (next) onResult(next);
      }}
    >
      {result && (
        <>
          {result.items.length ? (
            <ul className="space-y-2">
              {result.items.map((item) => (
                <li key={item.before} className="rounded-lg bg-sunk p-2">
                  <DiffView before={item.before} after={item.after} />
                  <p className="mt-1 text-xs text-ink-3">{item.why}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-good">Your headings are already in good shape.</p>
          )}
          <ResultFooter result={result} />
        </>
      )}
    </AiCard>
  );
}

export function SectionAiCard({
  row,
  base,
  runner,
  results,
  onResult,
}: {
  row: PageRow;
  base: Record<string, unknown>;
  runner: AiRunner;
  results?: Record<string, AiResult<AiSection>>;
  onResult: (heading: string, result: AiResult<AiSection>) => void;
}) {
  const h2s = row.headings.filter((h) => h.level === 2).map((h) => h.text);
  const [heading, setHeading] = useState(h2s[0] ?? "");
  const section = heading ? results?.[heading] : undefined;
  return (
    <AiCard
      title="Rewrite a section"
      description="Pick one H2 section. We rewrite just that part: clearer, scannable, same facts."
      action={section ? "Try again" : "Rewrite"}
      running={runner.running === "section"}
      disabled={!heading}
      onRun={async () => {
        const next = await runner.run<AiSection>("section", { ...base, task: "section", heading });
        if (next) onResult(heading, next);
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
    </AiCard>
  );
}

export function FaqAiCard({ base, runner, result, onResult }: CardProps<AiFaq>) {
  return (
    <AiCard
      title="FAQ generator"
      description="4–6 questions people search, answered only from your page, plus ready-to-paste FAQ markup."
      action={result ? "Try again" : "Generate"}
      running={runner.running === "faq"}
      onRun={async () => {
        const next = await runner.run<AiFaq>("faq", { ...base, task: "faq" });
        if (next) onResult(next);
      }}
    >
      {result && (
        <>
          <dl className="space-y-2">
            {result.items.map((item) => (
              <div key={item.question}>
                <dt className="text-sm font-bold">{item.question}</dt>
                <dd className="text-sm text-ink-2">{item.answer}</dd>
              </div>
            ))}
          </dl>
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-ink-3 uppercase">FAQPage JSON-LD</span>
              <CopyButton text={`<script type="application/ld+json">\n${result.jsonLd}\n</script>`} label="Copy markup" />
            </div>
            <pre className="max-h-48 overflow-auto rounded-lg border-2 border-ink bg-sunk p-2 font-mono text-[11px] text-ink">{result.jsonLd}</pre>
          </div>
          <ResultFooter result={result} />
        </>
      )}
    </AiCard>
  );
}
