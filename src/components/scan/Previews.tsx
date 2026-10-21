"use client";

import { useMemo, useState } from "react";
import type { PageRow } from "@/lib/seo/issues";

// Google measures snippet width in pixels, not characters: roughly 600px of 20px Arial for titles
// and ~920px of 14px Arial (two lines) for descriptions on desktop.
const TITLE_FONT = "20px Arial";
const TITLE_WIDTH = 600;
const DESC_FONT = "14px Arial";
const DESC_WIDTH = 920;

let canvas: HTMLCanvasElement | null = null;

function fitToWidth(text: string, font: string, maxWidth: number): { text: string; cut: boolean; width: number } {
  if (typeof document === "undefined") return { text, cut: false, width: 0 };
  canvas ??= document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return { text, cut: false, width: 0 };
  ctx.font = font;
  const full = ctx.measureText(text).width;
  if (full <= maxWidth) return { text, cut: false, width: Math.round(full) };
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (ctx.measureText(`${text.slice(0, mid)}…`).width <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  const trimmed = text.slice(0, lo).replace(/\s+\S*$/, "");
  return { text: `${trimmed} …`, cut: true, width: Math.round(full) };
}

function breadcrumb(url: string): { site: string; path: string } {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean).map((p) => decodeURIComponent(p));
    return { site: u.hostname.replace(/^www\./, ""), path: [u.origin, ...parts].join(" › ") };
  } catch {
    return { site: url, path: url };
  }
}

/** How the page would look as a Google result, with pixel-accurate truncation. */
export function SerpPreview({ row, altTitle, altDescription }: { row: PageRow; altTitle?: string; altDescription?: string }) {
  const [useAlt, setUseAlt] = useState(false);
  const hasAlt = Boolean(altTitle || altDescription);
  const titleText = (useAlt && altTitle) || row.title || row.h1[0] || row.finalUrl;
  const descText = (useAlt && altDescription) || row.metaDescription || "(No meta description: Google will pick a snippet from the page.)";
  const title = useMemo(() => fitToWidth(titleText, TITLE_FONT, TITLE_WIDTH), [titleText]);
  const desc = useMemo(() => fitToWidth(descText, DESC_FONT, DESC_WIDTH), [descText]);
  const crumb = breadcrumb(row.finalUrl);

  return (
    <div>
      {hasAlt && (
        <div className="mb-2 inline-flex rounded-full border-2 border-ink p-0.5 text-xs font-bold">
          {[
            ["Current", false],
            ["With AI suggestion", true],
          ].map(([label, value]) => (
            <button
              key={String(label)}
              type="button"
              onClick={() => setUseAlt(value as boolean)}
              className={`rounded-full px-2.5 py-0.5 ${useAlt === value ? "bg-ink text-paper" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <div className="theme-light rounded-xl border-2 border-line bg-white p-4 font-[Arial,sans-serif] text-[#202124]">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-full bg-[#f1f3f4] text-xs font-bold text-[#5f6368]">
            {crumb.site[0]?.toUpperCase()}
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-sm">{crumb.site}</span>
            <span className="block truncate text-xs text-[#4d5156]">{crumb.path}</span>
          </span>
        </div>
        <p className="mt-1.5 text-[20px] leading-[1.3] text-[#1a0dab]">{title.text}</p>
        <p className="mt-1 text-[14px] leading-[1.58] text-[#4d5156]">{desc.text}</p>
      </div>
      <p className="mt-2 text-xs text-ink-3">
        Title {title.width}px of {TITLE_WIDTH}px{title.cut ? " (cut off)" : ""} · description {desc.width}px of ~{DESC_WIDTH}px
        {desc.cut ? " (cut off)" : ""}
      </p>
    </div>
  );
}

/** How a shared link would look on X, LinkedIn, Slack and friends. */
export function SocialPreview({ row }: { row: PageRow }) {
  const title = row.ogTitle || row.title;
  const description = row.ogDescription || row.metaDescription;
  const site = breadcrumb(row.finalUrl).site;
  const warnings = [
    !row.ogImage && "No og:image, so shares show no picture.",
    !row.ogTitle && "No og:title, so platforms fall back to the page title.",
    !row.ogDescription && "No og:description.",
  ].filter(Boolean) as string[];

  return (
    <div>
      <div className="overflow-hidden rounded-xl border-2 border-line bg-card">
        {row.ogImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary third-party preview image
          <img
            src={row.ogImage}
            alt={`Social share image for ${title || site}`}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="aspect-[1.91/1] w-full bg-sunk object-cover"
          />
        ) : (
          <div className="grid aspect-[1.91/1] w-full place-items-center bg-sunk text-sm text-ink-3">No image</div>
        )}
        <div className="border-t-2 border-line p-3">
          <p className="text-xs text-ink-3 uppercase">{site}</p>
          <p className="mt-0.5 line-clamp-2 font-semibold">{title || "(no title)"}</p>
          {description && <p className="mt-0.5 line-clamp-2 text-sm text-ink-2">{description}</p>}
        </div>
      </div>
      {warnings.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-xs text-warn">
          {warnings.map((w) => (
            <li key={w}>⚠ {w}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
