"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { signalForm } from "@/lib/client/quirks";
import { DEFAULT_PAGE_LIMIT } from "@/lib/limits";
import type { PageRow } from "@/lib/seo/issues";
import { normalizeInputUrl, prettyUrl } from "@/lib/seo/url";
import { buildScanHref } from "../ScanForm";
import { StatusBadge } from "../scan/bits";

const BAD_URL = "That doesn't look like a web address. Try something like myblog.com/my-post.";

/** Page counts offered by the site-wide tools. */
export const TOOL_PAGE_OPTIONS = [25, 50, 100, 250, 500];
const INITIAL_PAGES = Math.min(DEFAULT_PAGE_LIMIT, 100);

/** The URL box every tool starts with. Site tools add a page-count picker. */
export function ToolForm({
  action,
  placeholder,
  busy,
  pages,
  onSubmit,
}: {
  action: string;
  placeholder: string;
  busy: boolean;
  /** Show a page-count picker (site-wide tools). */
  pages?: boolean;
  onSubmit: (url: string, maxPages: number) => void;
}) {
  const id = useId();
  const [url, setUrl] = useState("");
  const [maxPages, setMaxPages] = useState(INITIAL_PAGES);
  const [error, setError] = useState<string | null>(null);
  const submitRef = useRef(onSubmit);
  useEffect(() => {
    submitRef.current = onSubmit;
  });

  // A link like /page-speed-test?url=… runs the tool straight away (the report's page details use it).
  useEffect(() => {
    const given = new URLSearchParams(window.location.search).get("url");
    const normalized = given ? normalizeInputUrl(given) : null;
    if (!given || !normalized) return;
    // A tick later, so it runs once even when React mounts the form twice in development.
    const timer = setTimeout(() => {
      setUrl(given);
      submitRef.current(normalized, INITIAL_PAGES);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const normalized = normalizeInputUrl(url);
    if (!normalized) {
      setError(BAD_URL);
      signalForm("invalid");
      return;
    }
    setError(null);
    signalForm("submit");
    onSubmit(normalized, maxPages);
  };

  return (
    <form onSubmit={submit} noValidate>
      <div className="flex flex-col gap-2 rounded-2xl border-2 border-ink bg-paper p-2 focus-within:ring-3 focus-within:ring-note sm:flex-row sm:items-center">
        <label htmlFor={`${id}-url`} className="sr-only">
          {pages ? "Site address" : "Page address"}
        </label>
        <input
          id={`${id}-url`}
          type="text"
          inputMode="url"
          autoComplete="url"
          spellCheck={false}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onFocus={() => signalForm(url ? "typing" : "focus")}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className="h-12 min-w-0 flex-1 bg-transparent px-3 font-mono text-base text-ink placeholder:text-ink-3 focus:outline-none"
        />
        {pages && (
          <label className="flex h-12 items-center gap-2 rounded-xl border-2 border-line px-3 text-sm sm:border-0 sm:border-l-2 sm:rounded-none">
            <span className="text-ink-3">Pages</span>
            <select
              value={maxPages}
              onChange={(e) => setMaxPages(Number(e.target.value))}
              aria-label="Pages to crawl"
              className="bg-transparent font-mono font-bold focus:outline-none"
            >
              {TOOL_PAGE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          type="submit"
          disabled={busy}
          className="h-12 shrink-0 rounded-xl border-2 border-ink bg-lime px-6 font-display text-lg font-extrabold text-lime-ink transition hover:-translate-y-0.5 hover:shadow-brutal-sm disabled:opacity-60"
        >
          {busy ? "Working…" : `${action} →`}
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="rise mt-2 text-sm font-semibold text-crit">
          {error}
        </p>
      )}
    </form>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{children}</dl>;
}

const TONES = {
  plain: "text-ink",
  good: "text-good",
  warn: "text-warn",
  crit: "text-crit",
  note: "text-note",
};

export function StatTile({ label, value, tone = "plain", hint }: { label: string; value: ReactNode; tone?: keyof typeof TONES; hint?: string }) {
  return (
    <div className="rounded-xl border-2 border-line bg-paper p-3">
      <dt className="text-xs font-bold tracking-wide text-ink-3 uppercase">{label}</dt>
      <dd className={`mt-1 font-display text-3xl leading-none font-extrabold tabular-nums ${TONES[tone]}`}>{value}</dd>
      {hint && <p className="mt-1 text-xs text-ink-3">{hint}</p>}
    </div>
  );
}

/** Which page we checked, where it ended up, and a way to open it. */
export function CheckedPage({ row, aside }: { row: PageRow; aside?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border-2 border-line bg-paper px-3 py-2">
      <StatusBadge status={row.status} />
      <a
        href={row.finalUrl}
        target="_blank"
        rel="noreferrer"
        className="min-w-0 flex-1 truncate font-mono text-sm font-semibold hover:underline"
        title={row.finalUrl}
      >
        {prettyUrl(row.finalUrl)} ↗
      </a>
      {row.redirectedFrom.length > 0 && <span className="text-xs text-ink-3">redirected from {prettyUrl(row.redirectedFrom[0])}</span>}
      {aside}
    </div>
  );
}

/** Heading for a block of results. */
export function ResultBlock({ title, note, aside, children }: { title: string; note?: ReactNode; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="font-display text-xl font-extrabold">{title}</h3>
          {note && <p className="text-sm text-ink-2">{note}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** "Want everything else?" links to the full audit, or straight to the saved report. */
export function FullAuditLinks({ url, savedId }: { url: string; savedId?: string | null }) {
  let origin = url;
  try {
    origin = new URL(url).origin;
  } catch {
    // Keep what we were given.
  }
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border-2 border-dashed border-line p-3 text-sm">
      <span className="text-ink-2">This tool checks one thing well. The full audit checks everything else too.</span>
      <span className="ml-auto flex flex-wrap gap-2">
        {savedId && (
          <Link
            href={`/scan?id=${savedId}`}
            className="rounded-lg border-2 border-ink bg-card px-3 py-1.5 font-bold transition hover:-translate-y-0.5 hover:shadow-brutal-sm"
          >
            Open the full report
          </Link>
        )}
        <Link
          href={buildScanHref(origin, DEFAULT_PAGE_LIMIT, false)}
          className="rounded-lg border-2 border-ink bg-lime px-3 py-1.5 font-bold text-lime-ink transition hover:-translate-y-0.5 hover:shadow-brutal-sm"
        >
          Run the full audit on {prettyUrl(origin)} →
        </Link>
      </span>
    </div>
  );
}

export function ToolError({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border-2 border-crit bg-crit/10 p-3 text-sm font-semibold text-crit">{children}</p>;
}

/** A segmented control for switching result lists. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { id: T; label: string; count?: number }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-xl border-2 border-ink bg-paper p-1">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="tab"
          aria-selected={value === option.id}
          onClick={() => onChange(option.id)}
          className={`rounded-lg px-3 py-1.5 text-sm font-bold transition ${value === option.id ? "bg-ink text-paper" : "text-ink-2 hover:bg-sunk hover:text-ink"}`}
        >
          {option.label}
          {option.count !== undefined && (
            <span className={`ml-1.5 rounded-full px-1.5 text-xs tabular-nums ${value === option.id ? "bg-paper/20" : "bg-sunk"}`}>{option.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
