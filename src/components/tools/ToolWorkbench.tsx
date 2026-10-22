"use client";

import { MODE_LABEL, type ToolMode } from "@/lib/content/tools";
import { AgentTool } from "./AgentTool";
import { BrokenLinkTool } from "./BrokenLinkTool";
import { CannibalizationTool } from "./CannibalizationTool";
import { GeoAeoTool } from "./GeoAeoTool";
import { MetaTagTool } from "./MetaTagTool";
import { PageSpeedTool } from "./PageSpeedTool";

const TOOL_COMPONENTS = {
  "broken-link-checker": BrokenLinkTool,
  "keyword-cannibalization-checker": CannibalizationTool,
  "geo-aeo-checker": GeoAeoTool,
  "meta-tag-checker": MetaTagTool,
  "ai-agent-readiness-checker": AgentTool,
  "page-speed-test": PageSpeedTool,
} as const;

export type ToolSlug = keyof typeof TOOL_COMPONENTS;

/** The working tool, in a card that overlaps the bottom of the page intro. */
export function ToolWorkbench({
  slug,
  name,
  mode,
  action,
  placeholder,
}: {
  slug: ToolSlug;
  name: string;
  mode: ToolMode;
  action: string;
  placeholder: string;
}) {
  const Tool = TOOL_COMPONENTS[slug];
  return (
    <section aria-label={name} className="shell relative z-10 -mt-12">
      <div className="space-y-5 rounded-2xl border-2 border-ink bg-card p-4 shadow-brutal-lg sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl font-extrabold">{name}</h2>
          <span className="rounded-full border-2 border-ink bg-paper px-2.5 py-0.5 text-xs font-bold">{MODE_LABEL[mode]}</span>
        </div>
        <Tool action={action} placeholder={placeholder} />
      </div>
    </section>
  );
}
