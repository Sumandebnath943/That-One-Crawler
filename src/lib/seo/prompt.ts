import { AGENT_CHECKS, agentGaps, type AgentReport } from "./agents";
import { aiReadinessChecks, ISSUES, SEVERITY_ORDER, type IssueCode, type PageRow } from "./issues";
import { brokenLinkReport, cannibalizationReport } from "./report";
import type { PageSpeedAudit, PageSpeedCategoryId, PageSpeedResult } from "./types";

// "Prompt to improve": everything a scan found, written up as one prompt to paste into an AI coding
// agent (Claude Code, Cursor, Codex…). Every line of evidence comes from the scan; nothing is invented.

export type PromptGroup = "critical" | "warning" | "notice" | "agents" | "speed";

export interface PromptItem {
  id: string;
  /** The issue behind it, for items that come from page issues. */
  code?: IssueCode;
  group: PromptGroup;
  title: string;
  /** Short status for the picker: "12 pages", "Failed", "Partial". */
  status: string;
  /** Critical issues, warnings, failed agent essentials and big speed wins. */
  recommended: boolean;
  why: string;
  evidence: string[];
  fix: string;
}

export const GROUP_LABEL: Record<PromptGroup, string> = {
  critical: "Critical",
  warning: "Warnings",
  notice: "Notices",
  agents: "AI agent readiness",
  speed: "Speed (PageSpeed Insights)",
};

const ITEM_KIND: Record<PromptGroup, string> = {
  critical: "Critical",
  warning: "Warning",
  notice: "Notice",
  agents: "AI agents",
  speed: "PageSpeed",
};

const GROUP_ORDER: PromptGroup[] = ["critical", "warning", "agents", "speed", "notice"];
const MAX_EVIDENCE = 20;

const kb = (bytes: number) => `${Math.round(bytes / 1024)} KB`;

function capped(lines: string[], noun = "more"): string[] {
  return lines.length > MAX_EVIDENCE ? [...lines.slice(0, MAX_EVIDENCE), `…and ${lines.length - MAX_EVIDENCE} ${noun}`] : lines;
}

/** Evidence for one issue code, in the most useful shape for that kind of problem. */
function issueEvidence(code: IssueCode, rows: PageRow[], all: PageRow[]): string[] {
  const hit = rows.map((r) => ({ row: r, issue: r.issues.find((i) => i.code === code)! }));
  switch (code) {
    case "broken-links":
      return capped(
        brokenLinkReport(all).map((t) =>
          [
            `${t.url} → ${t.status || "no response"} (${t.kind})`,
            t.note?.replace(/\.$/, ""),
            `Linked from: ${t.linkedFrom.slice(0, 5).join(", ")}${t.linkedFrom.length > 5 ? ` and ${t.linkedFrom.length - 5} more` : ""}`,
          ]
            .filter(Boolean)
            .join(". "),
        ),
        "more broken links",
      );
    case "heavy-images": {
      const images = new Map<string, { size: number; pages: string[] }>();
      for (const { row } of hit) {
        for (const img of row.heavyImages) {
          const entry = images.get(img.url) ?? { size: img.sizeBytes, pages: [] };
          entry.pages.push(row.finalUrl);
          images.set(img.url, entry);
        }
      }
      return capped(
        [...images.entries()]
          .sort((a, b) => b[1].size - a[1].size)
          .map(([url, { size, pages }]) => `${url} (${kb(size)}), on ${pages.slice(0, 3).join(", ")}${pages.length > 3 ? ` and ${pages.length - 3} more` : ""}`),
        "more images",
      );
    }
    case "cannibalization":
      return cannibalizationReport(all).map((group) => {
        const ranked = [...group.pages].sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || b.inbound - a.inbound || b.wordCount - a.wordCount);
        return `"${group.keyword}": keep ${ranked[0].finalUrl}; merge, redirect or re-angle ${ranked.slice(1).map((p) => p.finalUrl).join(", ")}`;
      });
    case "duplicate-title":
    case "duplicate-meta": {
      const field = code === "duplicate-title" ? "title" : "metaDescription";
      const groups = new Map<string, string[]>();
      for (const { row } of hit) {
        const key = row[field].trim();
        groups.set(key, [...(groups.get(key) ?? []), row.finalUrl]);
      }
      return capped([...groups.entries()].map(([text, urls]) => `"${text}" is used on ${urls.join(", ")}`));
    }
    case "mixed-content":
      return capped(hit.map(({ row }) => `${row.finalUrl} loads ${row.insecureResources.slice(0, 4).join(", ")}`));
    case "ai-injection":
      return capped(hit.map(({ row }) => `${row.finalUrl}: “${row.hiddenInstructions[0]}”`));
    case "ai-instructions":
      return capped(hit.map(({ row }) => `${row.finalUrl}: “${row.injectionSignals[0]}”`));
    case "orphan":
      return capped(hit.map(({ row }) => row.finalUrl));
    default:
      return capped(hit.map(({ row, issue }) => (issue.detail ? `${row.finalUrl} ${issue.detail}` : row.finalUrl)), "more pages");
  }
}

/** One item per issue the scan found, worst first. */
export function issuePromptItems(rows: PageRow[]): PromptItem[] {
  const byCode = new Map<IssueCode, PageRow[]>();
  for (const row of rows) for (const issue of row.issues) byCode.set(issue.code, [...(byCode.get(issue.code) ?? []), row]);
  return [...byCode.entries()]
    .sort((a, b) => SEVERITY_ORDER[ISSUES[a[0]].severity] - SEVERITY_ORDER[ISSUES[b[0]].severity] || b[1].length - a[1].length)
    .map(([code, affected]) => {
      const info = ISSUES[code];
      return {
        id: `issue:${code}`,
        code,
        group: info.severity,
        title: info.label,
        status: `${affected.length} ${affected.length === 1 ? "page" : "pages"}`,
        recommended: info.severity !== "notice",
        why: info.why,
        evidence: issueEvidence(code, affected, rows),
        fix: info.fix,
      };
    });
}

/** The AI-readiness checklist items a page misses, for the GEO/AEO checker's prompt. */
export function aiChecklistPromptItems(row: PageRow): PromptItem[] {
  return aiReadinessChecks(row)
    .filter((check) => check.applies && check.earned < check.points)
    .map((check) => ({
      id: `geo:${check.label}`,
      group: "notice" as const,
      title: check.label,
      status: `${check.earned}/${check.points} points`,
      recommended: check.earned === 0,
      why: "AI answer engines (Google AI Overviews, ChatGPT, Perplexity) quote pages that answer clearly and specifically.",
      evidence: [`${row.finalUrl} earns ${check.earned} of ${check.points} points for this.`],
      fix: `${check.tip} Use only facts already on the page; don't invent figures or sources.`,
    }));
}

/** One item per agent-readiness check that failed or only partly passed. */
export function agentPromptItems(report: AgentReport): PromptItem[] {
  return agentGaps(report).map((check) => {
    const info = AGENT_CHECKS[check.id];
    return {
      id: `agent:${check.id}`,
      group: "agents",
      title: info.label,
      status: `${check.result === "fail" ? "Failed" : "Partial"} · ${info.tier}`,
      recommended: info.tier !== "bonus",
      why: info.why,
      evidence: [check.evidence],
      fix: info.fix,
    };
  });
}

const CATEGORY_LABEL: Record<PageSpeedCategoryId, string> = {
  performance: "Performance",
  accessibility: "Accessibility",
  "best-practices": "Best practices",
  seo: "SEO",
};

/** Failed Lighthouse audits across every page PageSpeed tested, biggest savings first. */
export function speedPromptItems(results: { url: string; result: PageSpeedResult }[]): PromptItem[] {
  const byAudit = new Map<string, { audit: PageSpeedAudit; category: PageSpeedCategoryId; pages: { url: string; audit: PageSpeedAudit }[] }>();
  for (const { url, result } of results) {
    for (const category of result.categories ?? []) {
      for (const audit of category.failed) {
        const key = `${category.id}:${audit.id}`;
        const entry = byAudit.get(key) ?? { audit, category: category.id, pages: [] };
        entry.pages.push({ url, audit });
        byAudit.set(key, entry);
      }
    }
  }
  return [...byAudit.values()]
    .map((entry) => ({ ...entry, savings: Math.max(...entry.pages.map((p) => p.audit.savingsMs ?? 0)) }))
    .sort((a, b) => b.savings - a.savings || b.pages.length - a.pages.length)
    .map(({ audit, category, pages, savings }) => ({
      id: `speed:${category}:${audit.id}`,
      group: "speed" as const,
      title: `${audit.title} (${CATEGORY_LABEL[category]})`,
      status: `${pages.length} ${pages.length === 1 ? "page" : "pages"}${savings ? ` · up to ${(savings / 1000).toFixed(1)}s` : ""}`,
      recommended: category !== "performance" || savings >= 300,
      why: audit.description,
      evidence: capped(
        pages.map(({ url, audit: a }) =>
          [url, a.displayValue, a.items?.length ? `(${a.items.slice(0, 3).join("; ")})` : ""].filter(Boolean).join(" "),
        ),
        "more pages",
      ),
      fix: audit.learnMore ? `Follow Lighthouse's guidance for this audit: ${audit.learnMore}` : "Follow Lighthouse's guidance for this audit.",
    }));
}

export function sortPromptItems(items: PromptItem[]): PromptItem[] {
  return [...items].sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group));
}

export interface PromptContext {
  site: string;
  /** "SEO 94/100", "AI agents 100/100"… */
  scores: string[];
  /** "a scan of 76 pages on 22 October 2026". */
  scope: string;
}

export const PROMPT_REQUIREMENTS = [
  "Inspect the existing codebase before changing anything, and find where each page's content, metadata and markup come from.",
  "Fix the cause in shared templates, layouts or components where possible, rather than page by page.",
  "Preserve existing behaviour and visual design unless a fix needs a change.",
  "Never change a URL without a 301 redirect from the old address, and keep internal links pointing at final URLs.",
  "Don't invent facts, statistics, quotes or reviews when adding or rewriting content; use only what the site already says, and flag gaps for a human.",
  "Follow each published standard or file format exactly (robots.txt, sitemaps, llms.txt, JSON-LD, HTTP headers).",
  "Add or update tests for every behaviour you change.",
  "Verify each fix in the HTML the server sends (curl or view-source), not only in a browser, and re-check every public file you touched.",
  "Finish with a short summary of what changed, how you verified it, and anything that needs a human decision (content, design or credentials).",
];

/** The prompt itself, in the order the items are given. */
export function buildPrompt(ctx: PromptContext, items: PromptItem[]): string {
  const lines = [
    `Improve the SEO, AI search readiness and AI agent readiness of ${ctx.site}.`,
    "",
    `Current That One Crawler scores: ${ctx.scores.join(", ")} (${ctx.scope}).`,
    "",
    items.length
      ? `Fix the following ${items.length === 1 ? "issue" : `${items.length} issues`} in priority order. Each one lists the evidence the scan found and the fix we recommend.`
      : "The scan found nothing to fix. Check the site still passes after your next change.",
  ];
  items.forEach((item, i) => {
    lines.push(
      "",
      `${i + 1}. ${item.title} (${ITEM_KIND[item.group]}, ${item.status})`,
      `Why it matters: ${item.why}`,
      "Evidence:",
      ...item.evidence.map((e) => `- ${e}`),
      `Recommended fix: ${item.fix}`,
    );
  });
  lines.push("", "Requirements:", ...PROMPT_REQUIREMENTS.map((r) => `- ${r}`));
  return lines.join("\n");
}
