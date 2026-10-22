"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "@/lib/client/quirks";
import { downloadText } from "@/lib/client/tools";
import { buildPrompt, GROUP_LABEL, sortPromptItems, type PromptContext, type PromptGroup, type PromptItem } from "@/lib/seo/prompt";

const DOT: Record<PromptGroup, string> = {
  critical: "bg-crit",
  warning: "bg-warn",
  notice: "bg-note",
  agents: "bg-agent",
  speed: "bg-note",
};

/**
 * "Prompt to improve": pick what to fix, then copy one prompt for an AI coding agent. Recommended
 * items (critical issues, warnings, failed agent checks, big speed wins) are ticked to start with.
 */
export function PromptDialog({ context, items, onClose }: { context: PromptContext; items: PromptItem[]; onClose: () => void }) {
  const sorted = useMemo(() => sortPromptItems(items), [items]);
  const recommended = useMemo(() => new Set(sorted.filter((i) => i.recommended).map((i) => i.id)), [sorted]);
  const [chosen, setChosen] = useState<Set<string>>(() => (recommended.size ? new Set(recommended) : new Set(sorted.map((i) => i.id))));
  const [preview, setPreview] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const picked = sorted.filter((i) => chosen.has(i.id));
  const prompt = useMemo(() => buildPrompt(context, picked), [context, picked]);
  const groups = (Object.keys(GROUP_LABEL) as PromptGroup[])
    .map((group) => ({ group, items: sorted.filter((i) => i.group === group) }))
    .filter((g) => g.items.length);

  const toggle = (id: string) =>
    setChosen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      toast(`Prompt copied (${picked.length} ${picked.length === 1 ? "fix" : "fixes"}). Paste it into your coding agent.`);
    } catch {
      setPreview(true);
      toast("Your browser blocked copying. Select the prompt below and copy it by hand.");
    }
  };

  const presets: { label: string; ids: string[] }[] = [
    { label: `Recommended (${recommended.size})`, ids: [...recommended] },
    { label: `All (${sorted.length})`, ids: sorted.map((i) => i.id) },
    { label: "None", ids: [] },
  ];

  return (
    // Flex, not grid: a grid track would grow to the widest one-line evidence snippet and overflow phones.
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="prompt-title">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" />
      <div className="rise relative flex max-h-[min(92vh,52rem)] w-full max-w-2xl flex-col rounded-2xl border-2 border-ink bg-card shadow-brutal-lg">
        <div className="flex items-start gap-3 border-b-2 border-ink p-4 sm:p-5">
          <div className="min-w-0 flex-1">
            <h2 id="prompt-title" className="font-display text-2xl font-extrabold">
              Prompt to improve
            </h2>
            <p className="mt-1 text-sm text-ink-2">
              Pick what to fix, then paste the prompt into Claude Code, Cursor, Codex or any AI coding agent working on your site&apos;s code.
              Every line of evidence comes from this scan.
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-ink font-bold hover:bg-sunk"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b-2 border-dashed border-line px-4 py-2.5 text-sm sm:px-5">
          <span className="font-semibold text-ink-3">
            {sorted.length} {sorted.length === 1 ? "finding" : "findings"} · {picked.length} selected
          </span>
          <span className="ml-auto flex flex-wrap gap-1.5">
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setChosen(new Set(preset.ids))}
                className="rounded-full border-2 border-line px-2.5 py-0.5 text-xs font-bold hover:border-ink"
              >
                {preset.label}
              </button>
            ))}
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
          {preview ? (
            <textarea
              readOnly
              value={prompt}
              aria-label="The prompt"
              onFocus={(e) => e.currentTarget.select()}
              className="h-[50vh] w-full resize-none rounded-xl border-2 border-ink bg-paper p-3 font-mono text-xs leading-relaxed"
            />
          ) : sorted.length ? (
            <div className="space-y-4">
              {groups.map(({ group, items: list }) => (
                <fieldset key={group} className="min-w-0">
                  <legend className="mb-1.5 flex items-center gap-2 text-xs font-bold tracking-wider text-ink-3 uppercase">
                    <span aria-hidden className={`size-2.5 rounded-full border border-ink ${DOT[group]}`} />
                    {GROUP_LABEL[group]} ({list.length})
                  </legend>
                  <ul className="space-y-1">
                    {list.map((item) => (
                      <li key={item.id}>
                        <label className="flex cursor-pointer items-start gap-3 rounded-xl px-2 py-1.5 hover:bg-sunk">
                          <input
                            type="checkbox"
                            checked={chosen.has(item.id)}
                            onChange={() => toggle(item.id)}
                            className="mt-1 size-4 shrink-0 accent-[var(--ink)]"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold">{item.title}</span>
                            <span className="block truncate text-xs text-ink-3" title={item.evidence[0]}>
                              {item.status} · {item.evidence[0]}
                            </span>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </fieldset>
              ))}
            </div>
          ) : (
            <p className="rounded-xl bg-good/10 p-3 text-sm font-semibold text-good">Nothing to fix. The prompt would be very short.</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t-2 border-ink p-3 sm:px-5">
          <button
            type="button"
            onClick={() => setPreview((v) => !v)}
            className="rounded-lg px-3 py-2 text-sm font-semibold underline underline-offset-4"
          >
            {preview ? "Back to the list" : "Preview prompt"}
          </button>
          <button
            type="button"
            onClick={() => downloadText(`fix-prompt-${context.site.replace(/^https?:\/\//, "").replace(/[^\w.-]+/g, "-")}.md`, prompt, "text/markdown;charset=utf-8")}
            disabled={!picked.length}
            className="rounded-lg border-2 border-ink bg-card px-3 py-2 text-sm font-bold transition hover:-translate-y-0.5 hover:shadow-brutal-sm disabled:opacity-50"
          >
            Download .md
          </button>
          <button
            type="button"
            onClick={copy}
            disabled={!picked.length}
            className="ml-auto rounded-xl border-2 border-ink bg-lime px-4 py-2 font-display font-extrabold text-lime-ink transition hover:-translate-y-0.5 hover:shadow-brutal-sm disabled:opacity-50"
          >
            Copy prompt ({picked.length})
          </button>
        </div>
      </div>
    </div>
  );
}

/** The button that opens the prompt dialog. */
export function PromptButton({ context, items, className = "" }: { context: PromptContext; items: PromptItem[]; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`rounded-xl border-2 border-ink bg-lime px-3 py-2 text-sm font-bold text-lime-ink shadow-brutal-sm transition hover:-translate-y-0.5 ${className}`}
      >
        ✦ Prompt to improve{items.length ? ` (${items.length})` : ""}
      </button>
      {/* On <body>: an animated (transformed) parent would otherwise trap the fixed overlay inside itself. */}
      {open && createPortal(<PromptDialog context={context} items={items} onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}
