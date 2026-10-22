"use client";

import { useState } from "react";
import { AGENT_CHECKS, agentGrade, agentScore, BONUS_CAP, TIER_POINTS, type AgentCheck, type AgentReport, type AgentTier } from "@/lib/seo/agents";
import { displayPath } from "@/lib/seo/url";
import { ScoreRing } from "./bits";

const RESULT_STYLE: Record<AgentCheck["result"], { icon: string; className: string; label: string }> = {
  pass: { icon: "✓", className: "bg-good/15 text-good", label: "Passed" },
  partial: { icon: "~", className: "bg-warn/15 text-warn", label: "Partial" },
  fail: { icon: "✗", className: "bg-crit/12 text-crit", label: "Failed" },
  na: { icon: "–", className: "bg-sunk text-ink-3", label: "Not checked" },
};

const TIERS: { tier: AgentTier; title: string; note: string }[] = [
  { tier: "essential", title: "Essentials", note: `Can an agent get in and read the site? ${TIER_POINTS.essential} points.` },
  { tier: "recommended", title: "Recommended", note: `Can it understand and trust what it reads? ${TIER_POINTS.recommended} points.` },
  { tier: "bonus", title: "Bonus signals", note: `Emerging conventions. Up to +${BONUS_CAP}, never a penalty.` },
];

function CheckRow({ check }: { check: AgentCheck }) {
  const info = AGENT_CHECKS[check.id];
  const style = RESULT_STYLE[check.result];
  const needsWork = check.result === "fail" || check.result === "partial";
  const [open, setOpen] = useState(needsWork && info.tier !== "bonus");
  return (
    <li className="rounded-xl border-2 border-line bg-paper">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-start gap-3 px-3 py-2.5 text-left">
        <span aria-hidden className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-xs font-extrabold ${style.className}`}>
          {style.icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="text-sm font-bold">{info.label}</span>
            <span className={`text-xs font-bold ${needsWork ? (check.result === "fail" ? "text-crit" : "text-warn") : "text-ink-3"}`}>
              {style.label}
              {check.result === "partial" ? ` (${Math.round(check.credit * 100)}%)` : ""}
            </span>
          </span>
          <span className="mt-0.5 block text-sm text-ink-2">{check.evidence}</span>
        </span>
      </button>
      {open && (
        <div className="space-y-1.5 border-t-2 border-dashed border-line px-3 py-2.5 pl-12 text-sm">
          <p className="text-ink-2">{info.why}</p>
          {needsWork && (
            <p>
              <b>How to pass:</b> {info.fix}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

/** The whole agent-readiness report: score, what each tier earned, and every check with its evidence. */
export function AgentPanel({ report, compact = false }: { report: AgentReport; compact?: boolean }) {
  const score = agentScore(report);
  const tiers = { essential: score.essential, recommended: score.recommended };
  return (
    <div className="space-y-6">
      <div className="grid items-center gap-6 rounded-2xl border-2 border-ink bg-paper p-5 sm:grid-cols-[auto_minmax(0,1fr)]">
        <ScoreRing score={score.score} label="AI agents" kind="agent" size={compact ? "md" : "lg"} grade={agentGrade(score.score)} />
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-wider text-ink-3 uppercase">Agent readiness</p>
          <h3 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{agentGrade(score.score)}</h3>
          <p className="mt-1 text-sm text-ink-2">
            Whether assistants like ChatGPT, Claude and Perplexity can reach {displayPath(report.url) === "/" ? new URL(report.url).hostname : report.url},
            read it without a browser and find their way around. Checked on the homepage
            {report.sampled.length ? ` and ${report.sampled.length} sampled pages` : ""}.
          </p>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
            {(["essential", "recommended"] as const).map((tier) => (
              <div key={tier} className="rounded-lg border-2 border-line p-2">
                <dt className="text-[10px] font-bold tracking-wide text-ink-3 uppercase">{tier}</dt>
                <dd className="font-mono text-sm font-bold">
                  {tiers[tier].passed}/{tiers[tier].total} · {Math.round(tiers[tier].earned)}/{tiers[tier].available}
                </dd>
              </div>
            ))}
            <div className="rounded-lg border-2 border-line p-2">
              <dt className="text-[10px] font-bold tracking-wide text-ink-3 uppercase">Bonus</dt>
              <dd className="font-mono text-sm font-bold">
                {score.bonus.positive}/{score.bonus.total} · +{score.bonus.points}
              </dd>
            </div>
          </dl>
        </div>
      </div>
      {TIERS.map(({ tier, title, note }) => {
        const checks = report.checks.filter((c) => AGENT_CHECKS[c.id].tier === tier);
        if (!checks.length) return null;
        const order = { fail: 0, partial: 1, pass: 2, na: 3 } as const;
        return (
          <section key={tier} className="space-y-2">
            <div>
              <h4 className="font-display text-lg font-extrabold">{title}</h4>
              <p className="text-sm text-ink-3">{note}</p>
            </div>
            <ul className="space-y-2">
              {[...checks]
                .sort((a, b) => order[a.result] - order[b.result])
                .map((check) => (
                  <CheckRow key={check.id} check={check} />
                ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
