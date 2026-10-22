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

export function gradeFor(score: number | null): string {
  if (score === null) return "Not scored";
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Good";
  if (score >= 60) return "Fair";
  if (score >= 40) return "Weak";
  return "Poor";
}

const GRADE_CHIP = {
  good: "bg-good/15 text-good",
  ok: "bg-warn/15 text-warn",
  bad: "bg-crit/12 text-crit",
  none: "bg-sunk text-ink-3",
};

export type ScoreKind = "seo" | "ai" | "agent" | "speed";

const KIND_COLOR: Record<ScoreKind, string> = { seo: "var(--lime)", ai: "var(--ai)", agent: "var(--agent)", speed: "var(--note)" };

/**
 * A score out of 100 as an outlined ring. Each score has its own color (SEO wears lime, AI search
 * violet, AI agents teal, speed blue) so they never blur together; the grade chip carries good/bad.
 */
export function ScoreRing({
  score,
  label,
  kind = "seo",
  size = "md",
  grade,
}: {
  score: number | null;
  label: string;
  kind?: ScoreKind;
  size?: "sm" | "md" | "lg";
  /** Overrides the default Excellent/Good/Fair wording. */
  grade?: string;
}) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const value = Math.max(0, Math.min(100, score ?? 0));
  const offset = circumference * (1 - value / 100);
  const color = KIND_COLOR[kind];
  const box = size === "lg" ? "size-36" : size === "sm" ? "size-20" : "size-28";
  const number = size === "lg" ? "text-4xl" : size === "sm" ? "text-xl" : "text-3xl";
  return (
    <figure className="flex flex-col items-center gap-2">
      <div className={`relative ${box}`}>
        <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
          <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--line)" strokeWidth="11" />
          {score !== null && value > 0 && (
            <>
              {/* An ink arc under a slimmer colored arc gives the outlined, sticker-like stroke. */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke="var(--ink)"
                strokeWidth="13"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className="transition-[stroke-dashoffset] duration-700"
              />
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className="transition-[stroke-dashoffset] duration-700"
              />
            </>
          )}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div className="leading-none">
            <span className={`font-display font-extrabold tabular-nums ${number}`}>{score ?? "—"}</span>
            {score !== null && size !== "sm" && <span className="block text-[10px] font-bold text-ink-3">/ 100</span>}
          </div>
        </div>
      </div>
      <figcaption className="flex flex-col items-center gap-1 text-center">
        <span className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-ink-2 uppercase">
          <span aria-hidden className="size-2.5 rounded-full border border-ink" style={{ background: color }} />
          {label}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${GRADE_CHIP[scoreTone(score)]}`}>{grade ?? gradeFor(score)}</span>
      </figcaption>
    </figure>
  );
}

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
