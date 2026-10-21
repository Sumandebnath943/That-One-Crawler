import { ISSUES, type Issue } from "@/lib/seo/issues";
import type { Severity } from "@/lib/seo/types";

export const SEVERITY_STYLES: Record<
  Severity,
  { text: string; bg: string; dot: string; border: string; label: string }
> = {
  critical: { text: "text-crit", bg: "bg-crit/12", dot: "bg-crit", border: "border-crit", label: "Critical" },
  warning: { text: "text-warn", bg: "bg-warn/14", dot: "bg-warn", border: "border-warn", label: "Warning" },
  notice: { text: "text-note", bg: "bg-note/12", dot: "bg-note", border: "border-note", label: "Notice" },
};

export function scoreTone(score: number | null): "good" | "ok" | "bad" | "none" {
  if (score === null) return "none";
  if (score >= 80) return "good";
  if (score >= 50) return "ok";
  return "bad";
}

const TONE_CLASSES = {
  good: "bg-good/15 text-good border-good/40",
  ok: "bg-warn/15 text-warn border-warn/40",
  bad: "bg-crit/12 text-crit border-crit/40",
  none: "bg-sunk text-ink-3 border-line",
};

export function ScoreBadge({ score, size = "md" }: { score: number | null; size?: "sm" | "md" }) {
  return (
    <span
      className={`inline-grid shrink-0 place-items-center rounded-lg border-2 font-mono font-bold tabular-nums ${TONE_CLASSES[scoreTone(score)]} ${size === "sm" ? "h-7 min-w-9 px-1 text-xs" : "h-9 min-w-11 px-1.5 text-sm"}`}
      title={score === null ? "Not scored" : `SEO score ${score}/100`}
    >
      {score ?? "—"}
    </span>
  );
}

export function IssueChip({ issue, withDetail = false }: { issue: Issue; withDetail?: boolean }) {
  const info = ISSUES[issue.code];
  const style = SEVERITY_STYLES[info.severity];
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${style.bg} ${style.text}`}
      title={`${style.label}: ${info.why}`}
    >
      <span className={`size-1.5 shrink-0 rounded-full ${style.dot}`} aria-hidden />
      <span className="truncate">
        {info.label}
        {withDetail && issue.detail ? ` ${issue.detail}` : ""}
      </span>
    </span>
  );
}

export function StatusBadge({ status, error }: { status: number; error?: string }) {
  const tone =
    status === 0 || status >= 400
      ? "text-crit bg-crit/12"
      : status >= 300
        ? "text-warn bg-warn/14"
        : "text-good bg-good/15";
  return (
    <span className={`rounded-md px-1.5 py-0.5 font-mono text-xs font-bold ${tone}`} title={error}>
      {status || "ERR"}
    </span>
  );
}

export function MetricBadge({ value, good, ok, suffix = "", higherIsBetter = true }: {
  value: number | null | undefined;
  good: number;
  ok: number;
  suffix?: string;
  higherIsBetter?: boolean;
}) {
  if (value === null || value === undefined) return <span className="text-ink-3">—</span>;
  const isGood = higherIsBetter ? value >= good : value <= good;
  const isOk = higherIsBetter ? value >= ok : value <= ok;
  const tone = isGood ? "text-good" : isOk ? "text-warn" : "text-crit";
  return (
    <span className={`font-mono text-xs font-bold ${tone}`}>
      {value}
      {suffix}
    </span>
  );
}
