"use client";

import { useRef, useState } from "react";
import { postJson } from "@/lib/client/api";
import { useFeatures } from "@/lib/client/use-features";
import { speedPromptItems } from "@/lib/seo/prompt";
import type { PageSpeedResult } from "@/lib/seo/types";
import { prettyUrl } from "@/lib/seo/url";
import { PageSpeedView } from "../scan/PageSpeedView";
import { PromptButton } from "../scan/PromptDialog";
import { FullAuditLinks, Segmented, ToolError, ToolForm } from "./kit";

type Strategy = "mobile" | "desktop";
type Outcome = { result?: PageSpeedResult; error?: string };

const today = () => new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export function PageSpeedTool({ action, placeholder }: { action: string; placeholder: string }) {
  const features = useFeatures();
  const [url, setUrl] = useState<string | null>(null);
  const [runs, setRuns] = useState<Partial<Record<Strategy, Outcome>>>({});
  const [view, setView] = useState<Strategy>("mobile");
  const request = useRef<AbortController | null>(null);
  const busy = Boolean(url) && (!runs.mobile || !runs.desktop);

  const check = (target: string) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setUrl(target);
    setRuns({});
    setView("mobile");
    for (const strategy of ["mobile", "desktop"] as const) {
      postJson<PageSpeedResult>("/api/pagespeed", { url: target, strategy, full: true }, controller.signal, 1)
        .then((result) => !controller.signal.aborted && setRuns((r) => ({ ...r, [strategy]: { result } })))
        .catch((err) => {
          if (!controller.signal.aborted) setRuns((r) => ({ ...r, [strategy]: { error: err instanceof Error ? err.message : "PageSpeed failed" } }));
        });
    }
  };

  const current = runs[view];
  const result = current?.result;

  if (features && !features.pagespeed) {
    return <ToolError>PageSpeed isn&apos;t set up on this deployment (it needs a Google API key).</ToolError>;
  }

  return (
    <div className="space-y-6">
      <ToolForm action={action} placeholder={placeholder} busy={busy} onSubmit={check} />
      {url && (
        <div className="rise space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Segmented
              label="Device"
              value={view}
              onChange={setView}
              options={[
                { id: "mobile", label: runs.mobile?.result ? `Mobile · ${runs.mobile.result.performance ?? "—"}` : "Mobile" },
                { id: "desktop", label: runs.desktop?.result ? `Desktop · ${runs.desktop.result.performance ?? "—"}` : "Desktop" },
              ]}
            />
            {result && (
              <PromptButton
                items={speedPromptItems([{ url: result.finalUrl ?? url, result }])}
                context={{
                  site: result.finalUrl ?? url,
                  scores: [
                    `PageSpeed ${view}: performance ${result.performance ?? "—"}, accessibility ${result.accessibility ?? "—"}, best practices ${result.bestPractices ?? "—"}, SEO ${result.seo ?? "—"}`,
                  ],
                  scope: `a PageSpeed Insights test on ${today()}`,
                }}
              />
            )}
          </div>
          {!current && (
            <p className="animate-pulse text-sm text-ink-2">
              Google is running Lighthouse on {prettyUrl(url)} ({view}). This takes 20–40 seconds; the stopwatch is very judgmental.
            </p>
          )}
          {current?.error && <ToolError>PageSpeed failed: {current.error}</ToolError>}
          {result && <PageSpeedView result={result} />}
          <FullAuditLinks url={url} />
        </div>
      )}
    </div>
  );
}
