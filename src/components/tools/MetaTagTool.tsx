"use client";

import { useRef, useState } from "react";
import { analyzePage, unreadableReason } from "@/lib/client/tools";
import { canonicalMatches, ISSUES, isNoindex, META_MAX, META_MIN, TITLE_MAX, TITLE_MIN, type PageRow } from "@/lib/seo/issues";
import type { AiMeta, AiResult } from "@/lib/seo/types";
import { aiRequestBase, AiRunnerError, MetaAiCard, useAiRunner } from "../scan/ai-cards";
import { AiQuotaBar } from "../scan/ai-ui";
import { IssueChip, ScoreBadge } from "../scan/bits";
import { SerpPreview, SocialPreview } from "../scan/Previews";
import { CheckedPage, FullAuditLinks, ResultBlock, ToolError, ToolForm } from "./kit";

type TagStatus = "good" | "warn" | "bad" | "info";

interface TagLine {
  name: string;
  value: string;
  status: TagStatus;
  note: string;
}

const STATUS_STYLE: Record<TagStatus, { icon: string; className: string }> = {
  good: { icon: "✓", className: "bg-good/15 text-good" },
  warn: { icon: "!", className: "bg-warn/15 text-warn" },
  bad: { icon: "✗", className: "bg-crit/12 text-crit" },
  info: { icon: "i", className: "bg-sunk text-ink-3" },
};

function lengthLine(name: string, value: string, min: number, max: number): TagLine {
  if (!value) return { name, value, status: "bad", note: "Missing" };
  const n = value.length;
  if (n < min) return { name, value, status: "warn", note: `${n} chars, a bit short (aim for ${min}–${max})` };
  if (n > max) return { name, value, status: "warn", note: `${n} chars, likely cut off (aim for ${min}–${max})` };
  return { name, value, status: "good", note: `${n} chars` };
}

function tagLines(row: PageRow): TagLine[] {
  const canonical = canonicalMatches(row);
  const robots = [row.robotsMeta, row.xRobotsTag && `X-Robots-Tag: ${row.xRobotsTag}`].filter(Boolean).join(" · ");
  return [
    lengthLine("Title tag", row.title, TITLE_MIN, TITLE_MAX),
    lengthLine("Meta description", row.metaDescription, META_MIN, META_MAX),
    {
      name: "H1",
      value: row.h1[0] ?? "",
      status: row.h1Count === 0 ? "bad" : row.h1Count > 1 ? "warn" : "good",
      note: row.h1Count === 0 ? "Missing" : row.h1Count > 1 ? `${row.h1Count} H1s (use one)` : "One H1",
    },
    {
      name: "Canonical",
      value: row.canonicalUrl,
      status: canonical === null ? "warn" : canonical ? "good" : "warn",
      note: canonical === null ? "Missing" : canonical ? "Points to this page" : "Points to a different URL",
    },
    {
      name: "Robots",
      value: robots,
      status: isNoindex(row) ? "bad" : "good",
      note: isNoindex(row) ? "Hidden from search (noindex)" : robots ? "Indexable" : "None set, so indexable by default",
    },
    { name: "Language", value: row.lang, status: row.lang ? "good" : "warn", note: row.lang ? "Set" : "Missing lang attribute" },
    { name: "og:title", value: row.ogTitle, status: row.ogTitle ? "good" : "warn", note: row.ogTitle ? "Set" : "Missing (shares fall back to the title)" },
    {
      name: "og:description",
      value: row.ogDescription,
      status: row.ogDescription ? "good" : "warn",
      note: row.ogDescription ? "Set" : "Missing",
    },
    { name: "og:image", value: row.ogImage, status: row.ogImage ? "good" : "warn", note: row.ogImage ? "Set" : "Missing (shares show no picture)" },
    {
      name: "twitter:card",
      value: row.twitterCard,
      status: row.twitterCard ? "good" : "info",
      note: row.twitterCard ? "Set" : "Optional (X falls back to Open Graph)",
    },
    {
      name: "Structured data",
      value: row.schemaTypes.join(", "),
      status: row.schemaErrors ? "bad" : row.schemaTypes.length ? "good" : "warn",
      note: row.schemaErrors ? `${row.schemaErrors} broken JSON-LD block(s)` : row.schemaTypes.length ? "Found" : "None found",
    },
    {
      name: "hreflang",
      value: row.hreflang.join(", "),
      status: "info",
      note: row.hreflang.length ? `${row.hreflang.length} language versions` : "None (fine for single-language sites)",
    },
  ];
}

function TagTable({ row }: { row: PageRow }) {
  const lines = tagLines(row);
  return (
    <ul className="divide-y-2 divide-line overflow-hidden rounded-xl border-2 border-ink bg-paper">
      {lines.map((line) => {
        const style = STATUS_STYLE[line.status];
        return (
          <li key={line.name} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3 px-3 py-2.5">
            <span aria-label={line.status} className={`mt-0.5 grid size-6 place-items-center rounded-full text-xs font-extrabold ${style.className}`}>
              {style.icon}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="font-mono text-sm font-bold">{line.name}</span>
                <span className="text-xs text-ink-3">{line.note}</span>
              </div>
              <p className={`mt-0.5 text-sm break-words ${line.value ? "text-ink-2" : "text-ink-3 italic"}`}>{line.value || "—"}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function MetaTagTool({ action, placeholder }: { action: string; placeholder: string }) {
  const [row, setRow] = useState<PageRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ai, setAi] = useState<AiResult<AiMeta> | undefined>();
  const runner = useAiRunner();
  const request = useRef<AbortController | null>(null);

  const check = async (url: string) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError(null);
    setRow(null);
    setAi(undefined);
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

  const tagIssues = row?.issues.filter((i) => ["Search appearance", "Indexing", "Structured data"].includes(ISSUES[i.code].category)) ?? [];

  return (
    <div className="space-y-6">
      <ToolForm action={action} placeholder={placeholder} busy={busy} onSubmit={check} />
      {busy && <p className="animate-pulse text-sm text-ink-2">Reading the page&apos;s tags…</p>}
      {error && <ToolError>{error}</ToolError>}
      {row && (
        <div className="rise space-y-6">
          <CheckedPage row={row} aside={<ScoreBadge score={row.score} />} />
          {tagIssues.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tagIssues.map((issue) => (
                <IssueChip key={issue.code} issue={issue} withDetail />
              ))}
            </div>
          )}
          <div className="grid gap-6 lg:grid-cols-2">
            <ResultBlock title="Tag inspector" note="Every tag search engines and social apps read, checked.">
              <TagTable row={row} />
            </ResultBlock>
            <div className="space-y-6">
              <ResultBlock title="In Google" note="Measured in pixels, the way Google cuts titles off.">
                <SerpPreview row={row} altTitle={ai?.title} altDescription={ai?.metaDescription} />
              </ResultBlock>
              <ResultBlock title="When shared">
                <SocialPreview row={row} />
              </ResultBlock>
            </div>
          </div>
          <ResultBlock title="✦ Improve it with AI" note="Uses only what's on your page. Costs one free AI action.">
            <AiQuotaBar />
            <AiRunnerError runner={runner} />
            <MetaAiCard row={row} base={aiRequestBase(row)} runner={runner} result={ai} onResult={setAi} preview={false} />
          </ResultBlock>
          <FullAuditLinks url={row.finalUrl} />
        </div>
      )}
    </div>
  );
}
