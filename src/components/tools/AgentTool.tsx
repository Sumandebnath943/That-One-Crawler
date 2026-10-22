"use client";

import { useRef, useState } from "react";
import { postJson } from "@/lib/client/api";
import { agentScore, type AgentReport } from "@/lib/seo/agents";
import { agentPromptItems } from "@/lib/seo/prompt";
import { prettyUrl } from "@/lib/seo/url";
import { AgentPanel } from "../scan/AgentPanel";
import { PromptButton } from "../scan/PromptDialog";
import { FullAuditLinks, ToolError, ToolForm } from "./kit";

const today = () => new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export function AgentTool({ action, placeholder }: { action: string; placeholder: string }) {
  const [report, setReport] = useState<AgentReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);

  const check = async (url: string) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError(null);
    setReport(null);
    try {
      setReport(await postJson<AgentReport>("/api/agents", { url }, controller.signal, 1));
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Something went wrong checking that site.");
    } finally {
      if (request.current === controller) setBusy(false);
    }
  };

  const items = report ? agentPromptItems(report) : [];

  return (
    <div className="space-y-6">
      <ToolForm action={action} placeholder={placeholder} busy={busy} onSubmit={check} />
      {busy && (
        <p className="animate-pulse text-sm text-ink-2">
          Knocking on the door as ChatGPT, Claude and Perplexity, asking for Markdown and reading llms.txt… (about 15 seconds)
        </p>
      )}
      {error && <ToolError>{error}</ToolError>}
      {report && (
        <div className="rise space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <a href={report.url} target="_blank" rel="noreferrer" className="font-mono text-sm font-semibold hover:underline">
              {prettyUrl(report.url)} ↗
            </a>
            <PromptButton
              items={items}
              context={{ site: report.url, scores: [`AI agents ${agentScore(report).score}/100`], scope: `an agent-readiness check on ${today()}` }}
            />
          </div>
          <AgentPanel report={report} />
          <FullAuditLinks url={report.url} />
        </div>
      )}
    </div>
  );
}
