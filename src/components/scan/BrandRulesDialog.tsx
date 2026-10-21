"use client";

import { useEffect, useRef, useState } from "react";
import { EMPTY_RULES, parsePhraseList, saveBrandRules } from "@/lib/client/brand-rules";
import { toast } from "@/lib/client/quirks";
import type { BrandRules } from "@/lib/seo/types";

/** Edit the brand rules for one site. Saved in this browser only. */
export function BrandRulesDialog({
  site,
  initial,
  onClose,
  onSaved,
}: {
  site: string;
  initial: BrandRules | null;
  onClose: () => void;
  onSaved: (rules: BrandRules | null) => void;
}) {
  const start = initial ?? EMPTY_RULES;
  const [brandName, setBrandName] = useState(start.brandName);
  const [banned, setBanned] = useState(start.bannedPhrases.join("\n"));
  const [required, setRequired] = useState(start.requiredPhrases.join("\n"));
  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstField.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const save = () => {
    const rules: BrandRules = {
      brandName: brandName.trim().slice(0, 80),
      bannedPhrases: parsePhraseList(banned),
      requiredPhrases: parsePhraseList(required),
    };
    saveBrandRules(site, rules);
    const empty = !rules.brandName && !rules.bannedPhrases.length && !rules.requiredPhrases.length;
    onSaved(empty ? null : rules);
    toast(empty ? "Brand rules cleared." : "Brand rules saved. Rescan to check every page against them.");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="rules-title">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" />
      <div className="rise relative w-full max-w-lg rounded-2xl border-2 border-ink bg-card p-5 shadow-brutal-lg">
        <h2 id="rules-title" className="font-display text-2xl font-extrabold">
          Brand rules for {site}
        </h2>
        <p className="mt-1 text-sm text-ink-2">
          Your house style, checked on every page and respected by the AI tools. Saved in this browser only.
        </p>
        <div className="mt-4 space-y-4 text-sm">
          <label className="block">
            <span className="font-semibold">Brand name</span>
            <span className="block text-xs text-ink-3">We flag titles that leave it out.</span>
            <input
              ref={firstField}
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="e.g. The Hungry Coder"
              className="mt-1 h-10 w-full rounded-lg border-2 border-ink bg-paper px-3"
            />
          </label>
          <label className="block">
            <span className="font-semibold">Banned phrases</span>
            <span className="block text-xs text-ink-3">One per line. Words you never want on the site (or in AI suggestions).</span>
            <textarea
              value={banned}
              onChange={(e) => setBanned(e.target.value)}
              rows={3}
              placeholder={"game-changer\nunlock the power\ncheap"}
              className="mt-1 w-full rounded-lg border-2 border-ink bg-paper p-2"
            />
          </label>
          <label className="block">
            <span className="font-semibold">Required phrases</span>
            <span className="block text-xs text-ink-3">One per line. Things every page must include, like a disclosure.</span>
            <textarea
              value={required}
              onChange={(e) => setRequired(e.target.value)}
              rows={2}
              placeholder="affiliate links"
              className="mt-1 w-full rounded-lg border-2 border-ink bg-paper p-2"
            />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 font-bold underline underline-offset-4">
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            className="rounded-xl border-2 border-ink bg-lime px-4 py-2 font-display font-extrabold text-lime-ink transition hover:-translate-y-0.5"
          >
            Save rules
          </button>
        </div>
      </div>
    </div>
  );
}
