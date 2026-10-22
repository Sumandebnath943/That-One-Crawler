import { AGENT_CHECKS, agentGaps, agentScore, withCrawlEvidence } from "@/lib/seo/agents";
import { hasContent, ISSUES, issueText, SEVERITY_ORDER, type IssueCode, type PageRow } from "@/lib/seo/issues";
import { brokenLinkReport, cannibalizationReport, verdictFor, type ReportSummary } from "@/lib/seo/report";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import type { ScanState } from "./crawl";

// A self-contained HTML report people can email or attach: the "shareable report" that needs no database.

const esc = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const SEVERITY_COLOR = { critical: "#cf3a1d", warning: "#9a5b00", notice: "#2c5bc9" } as const;

export function buildHtmlReport(scan: ScanState, rows: PageRow[], summary: ReportSummary): string {
  const site = `${scan.domain}${scan.scope ?? ""}`;
  const date = new Date(scan.startedAt).toISOString().slice(0, 10);
  const verdict = verdictFor(summary.avgScore);
  const issues = (Object.entries(summary.issueCounts) as [IssueCode, number][]).sort(
    (a, b) => SEVERITY_ORDER[ISSUES[a[0]].severity] - SEVERITY_ORDER[ISSUES[b[0]].severity] || b[1] - a[1],
  );
  const worst = [...rows]
    .filter((r) => r.issues.length)
    .sort((a, b) => (a.score ?? -1) - (b.score ?? -1))
    .slice(0, 60);
  const broken = brokenLinkReport(rows).slice(0, 50);
  const cannibal = cannibalizationReport(rows);

  const issueRows = issues
    .map(
      ([code, count]) =>
        `<tr><td><span class="dot" style="background:${SEVERITY_COLOR[ISSUES[code].severity]}"></span>${esc(ISSUES[code].label)}</td><td>${count}</td><td>${esc(ISSUES[code].fix)}</td></tr>`,
    )
    .join("");
  const pageRows = worst
    .map(
      (r) =>
        `<tr><td class="url"><a href="${esc(r.finalUrl)}">${esc(r.finalUrl)}</a></td><td>${r.score ?? "—"}</td><td>${r.aiScore ?? "—"}</td><td>${esc(r.issues.map(issueText).join("; "))}</td></tr>`,
    )
    .join("");
  const brokenRows = broken
    .map(
      (b) => `<tr><td>${b.status || "error"}</td><td class="url">${esc(b.url)}</td><td class="url">${b.linkedFrom.slice(0, 3).map(esc).join("<br>")}</td></tr>`,
    )
    .join("");
  const cannibalRows = cannibal
    .map((g) => `<li><b>${esc(g.keyword)}</b>: ${g.pages.map((p) => esc(p.finalUrl)).join(", ")}</li>`)
    .join("");
  const plan = scan.plan
    ? `<h2>Action plan</h2><p><i>${esc(scan.plan.summary)}</i></p><ol>${scan.plan.steps
        .map((s) => `<li><b>${esc(s.title)}</b><br>${esc(s.why)} ${esc(s.how)}</li>`)
        .join("")}</ol>`
    : "";
  const agents = scan.agents ? withCrawlEvidence(scan.agents, rows.filter(hasContent)) : null;
  const agentValue = agents ? agentScore(agents).score : null;
  const agentRows = agents
    ? agentGaps(agents)
        .map((c) => `<tr><td>${esc(AGENT_CHECKS[c.id].label)}</td><td>${c.result === "fail" ? "Failed" : "Partial"}</td><td>${esc(c.evidence)}<br><b>Fix:</b> ${esc(AGENT_CHECKS[c.id].fix)}</td></tr>`)
        .join("")
    : "";
  const speed = rows.filter((r) => r.pagespeed && !r.pagespeed.error);
  const speedAvg = (pick: (r: PageRow) => number | null | undefined) => {
    const values = speed.map(pick).filter((v): v is number => typeof v === "number");
    return values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : "—";
  };

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>SEO audit: ${esc(site)} (${date})</title>
<style>
body{font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;color:#1a1712;background:#f6f1e6;margin:0;padding:32px 16px}
main{max-width:1000px;margin:0 auto;background:#fffcf5;border:2px solid #1a1712;border-radius:16px;padding:28px;box-shadow:4px 4px 0 #1a1712}
h1{font-size:28px;margin:0}h2{font-size:20px;margin:28px 0 8px}
.meta{color:#6f6758;margin:4px 0 20px}.scores{display:flex;gap:16px;flex-wrap:wrap;margin:16px 0}
.score{border:2px solid #1a1712;border-radius:12px;padding:12px 16px;min-width:120px}.score b{display:block;font-size:30px}
table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #ddd3bf;vertical-align:top}
th{background:#ece5d6}.url{word-break:break-all;font-family:ui-monospace,monospace;font-size:12px}a{color:#2c5bc9}
.dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px}footer{margin-top:28px;color:#6f6758;font-size:12px}
</style></head><body><main>
<h1>SEO audit: ${esc(site)}</h1>
<p class="meta">Scanned ${date} · ${summary.total} pages · ${esc(verdict.headline)}</p>
<div class="scores">
<div class="score"><b>${summary.avgScore ?? "—"}</b>Average SEO score</div>
<div class="score"><b>${summary.avgAiScore ?? "—"}</b>AI-search readiness</div>
${agentValue !== null ? `<div class="score"><b>${agentValue}</b>AI agent readiness</div>` : ""}
${speed.length ? `<div class="score"><b>${speedAvg((r) => r.pagespeed?.performance)}</b>PageSpeed performance (${speed.length} pages)</div>` : ""}
<div class="score"><b style="color:#cf3a1d">${summary.severityCounts.critical}</b>Critical issues</div>
<div class="score"><b style="color:#9a5b00">${summary.severityCounts.warning}</b>Warnings</div>
</div>
${plan}
<h2>Issues across the site</h2>
<table><thead><tr><th>Issue</th><th>Pages</th><th>How to fix</th></tr></thead><tbody>${issueRows}</tbody></table>
<h2>Pages that need the most work</h2>
<table><thead><tr><th>Page</th><th>SEO</th><th>AI</th><th>Issues</th></tr></thead><tbody>${pageRows}</tbody></table>
${broken.length ? `<h2>Broken links</h2><table><thead><tr><th>Status</th><th>URL</th><th>Linked from</th></tr></thead><tbody>${brokenRows}</tbody></table>` : ""}
${cannibal.length ? `<h2>Keyword cannibalization</h2><ul>${cannibalRows}</ul>` : ""}
${agents ? `<h2>AI agent readiness: ${agentValue}/100</h2>${agentRows ? `<table><thead><tr><th>Check</th><th>Result</th><th>What we found</th></tr></thead><tbody>${agentRows}</tbody></table>` : "<p>Every agent check passed.</p>"}` : ""}
${speed.length ? `<h2>PageSpeed Insights (mobile, average of ${speed.length} pages)</h2><p>Performance ${speedAvg((r) => r.pagespeed?.performance)} · Accessibility ${speedAvg((r) => r.pagespeed?.accessibility)} · Best practices ${speedAvg((r) => r.pagespeed?.bestPractices)} · SEO ${speedAvg((r) => r.pagespeed?.seo)}</p>` : ""}
<footer>Generated by <a href="${SITE_URL}">${SITE_NAME}</a>, the free SEO audit tool for blogs.</footer>
</main></body></html>`;
}

export function downloadHtmlReport(scan: ScanState, rows: PageRow[], summary: ReportSummary): void {
  const blob = new Blob([buildHtmlReport(scan, rows, summary)], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `seo-report-${scan.domain || "site"}-${new Date(scan.startedAt).toISOString().slice(0, 10)}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
