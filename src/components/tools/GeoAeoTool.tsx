"use client";

import { useRef, useState, type ReactNode } from "react";
import { analyzePage, unreadableReason } from "@/lib/client/tools";
import { aiReadinessChecks, type PageRow } from "@/lib/seo/issues";
import type { AiFaq, AiHeadings, AiIntro, AiResult } from "@/lib/seo/types";
import { aiRequestBase, AiRunnerError, FaqAiCard, HeadingsAiCard, IntroAiCard, useAiRunner } from "../scan/ai-cards";
import { AiQuotaBar } from "../scan/ai-ui";
import { ScoreRing } from "../scan/bits";
import { CheckedPage, FullAuditLinks, ResultBlock, ToolError, ToolForm } from "./kit";

function verdict(score: number | null): { title: string; body: string } {
  if (score === null) return { title: "Nothing to score", body: "We couldn't find readable content on this page." };
  if (score >= 80) return { title: "Ready to be quoted", body: "AI answer engines can lift a clear, trustworthy answer from this page." };
  if (score >= 60) return { title: "Almost quotable", body: "The basics are there. A couple of fixes below would make it much easier to cite." };
  if (score >= 40) return { title: "Hard to quote", body: "AI tools would have to dig for the answer. Start with the missing items below." };
  return { title: "Invisible to AI answers", body: "There's no clear answer for an AI tool to lift yet. The checklist shows where to start." };
}

function Signal({ label, value, ok }: { label: string; value: ReactNode; ok?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-line py-2 last:border-b-0">
      <dt className="text-sm text-ink-2">{label}</dt>
      <dd className={`text-right font-mono text-sm font-bold ${ok === undefined ? "text-ink" : ok ? "text-good" : "text-warn"}`}>{value}</dd>
    </div>
  );
}

const formatDate = (value: string) => {
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString().slice(0, 10) : value;
};

export function GeoAeoTool({ action, placeholder }: { action: string; placeholder: string }) {
  const [row, setRow] = useState<PageRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intro, setIntro] = useState<AiResult<AiIntro> | undefined>();
  const [faq, setFaq] = useState<AiResult<AiFaq> | undefined>();
  const [headings, setHeadings] = useState<AiResult<AiHeadings> | undefined>();
  const runner = useAiRunner();
  const request = useRef<AbortController | null>(null);

  const check = async (url: string) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError(null);
    setRow(null);
    setIntro(undefined);
    setFaq(undefined);
    setHeadings(undefined);
    try {
      const result = await analyzePage(url, controller.signal);
      const reason = unreadableReason(result);
      if (reason) setError(reason);
      else setRow(result);
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Something went wrong reading that page.");
    } finally {
      if (request.current === controller) setBusy(false);
    }
  };

  const checks = row ? aiReadinessChecks(row) : [];
  const passed = checks.filter((c) => c.earned === c.points).length;
  const summary = verdict(row?.aiScore ?? null);
  const geo = row?.geo;

  return (
    <div className="space-y-6">
      <ToolForm action={action} placeholder={placeholder} busy={busy} onSubmit={check} />
      {busy && <p className="animate-pulse text-sm text-ink-2">Reading the page like an answer engine would…</p>}
      {error && <ToolError>{error}</ToolError>}
      {row && geo && (
        <div className="rise space-y-6">
          <CheckedPage row={row} />

          <div className="grid items-center gap-6 rounded-2xl border-2 border-ink bg-paper p-5 sm:grid-cols-[auto_minmax(0,1fr)]">
            <ScoreRing score={row.aiScore} label="AI readiness" kind="ai" size="lg" />
            <div>
              <p className="text-xs font-bold tracking-wider text-ink-3 uppercase">The verdict</p>
              <h3 className="font-display text-3xl font-extrabold tracking-tight">{summary.title}</h3>
              <p className="mt-1 text-ink-2">{summary.body}</p>
              <p className="mt-3 text-sm text-ink-3">
                Passes <b className="text-ink">{passed}</b> of {checks.length} checks · classic SEO score{" "}
                <b className="text-ink">{row.score ?? "—"}</b>/100
              </p>
            </div>
          </div>

          {row.injectionSignals.length > 0 && (
            <ToolError>
              This page contains text that looks like instructions aimed at AI assistants (“{row.injectionSignals[0]}”). AI tools may
              treat the page as manipulative. Remove it.
            </ToolError>
          )}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <ResultBlock title="Readiness checklist" note="What Google AI Overviews, ChatGPT and Perplexity look for.">
              <ol className="space-y-2">
                {checks.map((check) => {
                  const full = check.earned === check.points;
                  const tone = full ? "bg-good" : check.earned ? "bg-warn" : "bg-crit";
                  return (
                    <li key={check.label} className="rounded-xl border-2 border-line bg-paper p-3">
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden
                          className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-extrabold ${full ? "bg-good/15 text-good" : check.earned ? "bg-warn/15 text-warn" : "bg-crit/12 text-crit"}`}
                        >
                          {full ? "✓" : check.earned ? "~" : "✗"}
                        </span>
                        <span className="flex-1 text-sm font-semibold">{check.label}</span>
                        <span className="font-mono text-xs text-ink-3">
                          {check.earned}/{check.points}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sunk">
                        <div className={`h-full rounded-full ${tone}`} style={{ width: `${(check.earned / check.points) * 100}%` }} />
                      </div>
                      {!full && <p className="mt-2 text-xs text-ink-2">{check.tip}</p>}
                    </li>
                  );
                })}
              </ol>
            </ResultBlock>

            <ResultBlock title="What we found">
              <dl className="rounded-xl border-2 border-line bg-paper px-3">
                <Signal label="Opening answer" value={geo.introWords ? `${geo.introWords} words` : "none"} ok={geo.introWords >= 20 && geo.introWords <= 80} />
                <Signal label="Question headings" value={`${geo.questionHeadings} of ${geo.subheadings}`} ok={geo.questionHeadings > 0} />
                <Signal label="Answers under headings" value={geo.answerCapsules} ok={geo.answerCapsules >= 2} />
                <Signal label="Specific facts & figures" value={geo.figures} ok={geo.figures >= 3} />
                <Signal label="Lists / tables" value={`${geo.lists} / ${geo.tables}`} ok={geo.lists + geo.tables > 0} />
                <Signal label="FAQ section" value={geo.hasFaqSection ? "yes" : "no"} ok={geo.hasFaqSection} />
                <Signal label="FAQ markup" value={row.hasFaqSchema ? "yes" : "no"} ok={row.hasFaqSchema} />
                <Signal label="Structured data" value={row.schemaTypes.slice(0, 3).join(", ") || "none"} ok={row.schemaTypes.length > 0} />
                <Signal label="Author" value={row.author || "none"} ok={Boolean(row.author)} />
                <Signal
                  label="Date"
                  value={row.dateModified || row.datePublished ? formatDate(row.dateModified || row.datePublished) : "none"}
                  ok={Boolean(row.dateModified || row.datePublished)}
                />
                <Signal label="Reading ease" value={row.readability.readingEase ?? "—"} />
                <Signal label="Words" value={row.wordCount.toLocaleString()} />
              </dl>
            </ResultBlock>
          </div>

          <ResultBlock title="✦ Fix it with AI" note="Drafts use only facts already on your page. Each one costs one free AI action.">
            <AiQuotaBar />
            <AiRunnerError runner={runner} />
            <div className="grid gap-3 lg:grid-cols-2">
              <IntroAiCard row={row} base={aiRequestBase(row)} runner={runner} result={intro} onResult={setIntro} />
              <HeadingsAiCard row={row} base={aiRequestBase(row)} runner={runner} result={headings} onResult={setHeadings} />
            </div>
            <FaqAiCard row={row} base={aiRequestBase(row)} runner={runner} result={faq} onResult={setFaq} />
          </ResultBlock>

          <FullAuditLinks url={row.finalUrl} />
        </div>
      )}
    </div>
  );
}
