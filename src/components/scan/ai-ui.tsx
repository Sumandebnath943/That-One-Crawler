"use client";

import { useMemo, useState } from "react";
import { isValidKey, setUserKey, useHasUserKey, useQuota } from "@/lib/client/ai";
import { diffWords } from "@/lib/client/diff";
import type { GuardReport } from "@/lib/seo/types";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard blocked; nothing else to do.
        }
      }}
      className="shrink-0 rounded-md border-2 border-ink px-2 py-0.5 text-xs font-bold hover:bg-lime hover:text-lime-ink"
    >
      {copied ? "Copied!" : label}
    </button>
  );
}

/** Before/after with insertions highlighted and deletions struck through. */
export function DiffView({ before, after }: { before: string; after: string }) {
  const parts = useMemo(() => diffWords(before, after), [before, after]);
  if (!parts) {
    return <p className="text-sm whitespace-pre-wrap">{after}</p>;
  }
  return (
    <p className="text-sm leading-relaxed whitespace-pre-wrap">
      {parts.map((part, i) =>
        part.type === "same" ? (
          <span key={i}>{part.text}</span>
        ) : part.type === "add" ? (
          <ins key={i} className="rounded-sm bg-good/20 text-ink no-underline">
            {part.text}
          </ins>
        ) : (
          <del key={i} className="rounded-sm bg-crit/15 text-ink-3">
            {part.text}
          </del>
        ),
      )}
    </p>
  );
}

/** What the fabrication guard and prompt-injection screen caught. `source` names what the AI was given. */
export function GuardNotes({ guard, source = "your page" }: { guard: GuardReport; source?: string }) {
  const notes: string[] = [];
  if (guard.unsupportedFigures.length) {
    notes.push(`Numbers not found in ${source}: ${guard.unsupportedFigures.join(", ")}. Check them before acting on them.`);
  }
  if (guard.unsupportedLinks.length) {
    notes.push(`Links or emails not found in ${source}: ${guard.unsupportedLinks.join(", ")}.`);
  }
  if (guard.bannedUsed?.length) notes.push(`Uses banned phrases from your brand rules: ${guard.bannedUsed.join(", ")}.`);
  if (guard.injection.length) {
    notes.push("Your page contains text that looks like instructions to AI. We fenced it off and ignored it.");
  }
  if (!notes.length) {
    return <p className="text-xs font-semibold text-good">✓ Fact check passed: no invented numbers or links.</p>;
  }
  return (
    <ul className="space-y-1 rounded-lg border-2 border-warn/60 bg-warn/10 p-2 text-xs text-ink">
      {notes.map((note) => (
        <li key={note}>⚠ {note}</li>
      ))}
    </ul>
  );
}

/** Free actions left today, and the "bring your own Gemini key" form. */
export function AiQuotaBar() {
  const quota = useQuota();
  const hasKey = useHasUserKey();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    if (!isValidKey(draft)) {
      setError("That doesn't look like a Gemini API key. It's a long string of letters, numbers, - and _.");
      return;
    }
    setUserKey(draft);
    setDraft("");
    setError(null);
    setOpen(false);
  };

  const exhausted = !hasKey && quota?.remaining === 0;
  return (
    <div className={`rounded-xl border-2 p-3 text-sm ${exhausted ? "border-warn bg-warn/10" : "border-dashed border-line"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold">
          {hasKey
            ? "✦ Using your own Gemini key: no daily limit."
            : quota
              ? `✦ ${quota.remaining} of ${quota.limit} free AI actions left today`
              : "✦ Checking your free AI actions…"}
        </span>
        <button type="button" onClick={() => setOpen((v) => !v)} className="text-xs font-bold underline underline-offset-2">
          {hasKey ? "Manage key" : "Use my own key"}
        </button>
      </div>
      {exhausted && !open && (
        <p className="mt-1 text-xs text-ink-2">
          You&apos;ve used today&apos;s free actions. Paste your own free Gemini key to keep going (it takes about a minute).
        </p>
      )}
      {open && (
        <div className="rise mt-3 space-y-2">
          <p className="text-xs text-ink-2">
            Get a free key at{" "}
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="font-semibold underline">
              aistudio.google.com/apikey
            </a>
            . It&apos;s saved only in this browser and sent with your AI requests. We never store it.
          </p>
          {hasKey ? (
            <button
              type="button"
              onClick={() => setUserKey(null)}
              className="rounded-lg border-2 border-ink px-3 py-1 text-xs font-bold hover:bg-crit/15"
            >
              Remove my key from this browser
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                type="password"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Paste your Gemini API key"
                aria-label="Your Gemini API key"
                autoComplete="off"
                className="h-9 min-w-0 flex-1 rounded-lg border-2 border-ink bg-paper px-2 font-mono text-xs"
              />
              <button type="button" onClick={save} className="rounded-lg border-2 border-ink bg-lime px-3 text-xs font-bold text-lime-ink">
                Save
              </button>
            </div>
          )}
          {error && <p className="text-xs font-semibold text-crit">{error}</p>}
        </div>
      )}
    </div>
  );
}
