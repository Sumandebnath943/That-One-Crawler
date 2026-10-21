"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { DEFAULT_PAGE_LIMIT, PAGE_LIMIT_OPTIONS, PAGESPEED_PAGE_LIMIT } from "@/lib/limits";
import { useFeatures } from "@/lib/client/use-features";
import { normalizeInputUrl } from "@/lib/seo/url";

const BAD_URL_QUIPS = [
  "That doesn't look like a URL. Even we can't crawl vibes.",
  "We need a website, not a mood. Try something like myblog.com.",
  "Hmm. That's not a URL. That's a cry for help.",
];

export function buildScanHref(url: string, maxPages: number, pagespeed: boolean): string {
  const params = new URLSearchParams({ url, max: String(maxPages) });
  if (pagespeed) params.set("ps", "1");
  return `/scan?${params}`;
}

export function ScanForm({ compact = false, defaultUrl = "" }: { compact?: boolean; defaultUrl?: string }) {
  const router = useRouter();
  const features = useFeatures();
  const id = useId();
  const [url, setUrl] = useState(defaultUrl);
  const [error, setError] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [maxPages, setMaxPages] = useState<number>(DEFAULT_PAGE_LIMIT);
  const [pagespeed, setPagespeed] = useState(false);
  const [quip, setQuip] = useState(0);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const normalized = normalizeInputUrl(url);
    if (!normalized) {
      setError(BAD_URL_QUIPS[quip % BAD_URL_QUIPS.length]);
      setQuip((q) => q + 1);
      return;
    }
    setError(null);
    router.push(buildScanHref(normalized, maxPages, pagespeed && Boolean(features?.pagespeed)));
  };

  return (
    <form onSubmit={submit} className="w-full" noValidate>
      <div
        className={`flex flex-col gap-2 rounded-2xl border-2 border-ink bg-card p-2 shadow-brutal sm:flex-row ${compact ? "" : "sm:p-2.5"}`}
      >
        <label htmlFor={`${id}-url`} className="sr-only">
          Blog URL
        </label>
        <input
          id={`${id}-url`}
          type="text"
          inputMode="url"
          autoComplete="url"
          spellCheck={false}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="your-blog-that-definitely-has-no-issues.com"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`min-w-0 flex-1 rounded-xl bg-transparent px-3 font-mono text-ink placeholder:text-ink-3 focus:outline-none ${compact ? "h-11 text-sm" : "h-12 text-base sm:text-lg"}`}
        />
        <button
          type="submit"
          className={`shrink-0 rounded-xl border-2 border-ink bg-lime font-display font-extrabold text-lime-ink transition hover:-translate-y-0.5 hover:shadow-brutal-sm active:translate-y-0 active:shadow-none ${compact ? "h-11 px-4" : "h-12 px-6 text-lg"}`}
        >
          Judge my blog →
        </button>
      </div>

      {error && (
        <p id={`${id}-error`} role="alert" className="rise mt-3 text-sm font-semibold text-crit">
          {error}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-2">
        <button
          type="button"
          onClick={() => setShowOptions((v) => !v)}
          aria-expanded={showOptions}
          className="font-semibold underline decoration-dotted underline-offset-4 hover:text-ink"
        >
          {showOptions ? "Hide options" : "Options"}
        </button>
        {!compact && !showOptions && (
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            <span>✓ Free</span>
            <span>✓ No signup</span>
            <span>✓ No feelings spared</span>
          </span>
        )}
      </div>

      {showOptions && (
        <div className="rise mt-3 grid gap-3 rounded-xl border-2 border-dashed border-line bg-card/60 p-3 text-sm sm:grid-cols-2">
          <label className="flex items-center justify-between gap-3">
            <span className="font-semibold">Max pages</span>
            <select
              aria-label="Max pages"
              value={maxPages}
              onChange={(e) => setMaxPages(Number(e.target.value))}
              className="rounded-lg border-2 border-ink bg-card px-2 py-1 font-mono"
            >
              {PAGE_LIMIT_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label
            className={`flex items-start gap-2 ${features?.pagespeed ? "" : "opacity-60"}`}
            title={features?.pagespeed ? "" : "Add a PAGESPEED_KEY to enable"}
          >
            <input
              type="checkbox"
              checked={pagespeed && Boolean(features?.pagespeed)}
              disabled={!features?.pagespeed}
              onChange={(e) => setPagespeed(e.target.checked)}
              className="mt-0.5 size-4 accent-[var(--ink)]"
            />
            <span>
              <span className="font-semibold">Run PageSpeed</span>
              <span className="block text-ink-3">
                {features?.pagespeed
                  ? `Slow but thorough. First ${PAGESPEED_PAGE_LIMIT} pages.`
                  : features
                    ? "Not set up on this deployment."
                    : "Checking…"}
              </span>
            </span>
          </label>
          <p className="text-ink-3 sm:col-span-2">
            Tip: add a path, like <span className="font-mono">myblog.com/blog</span>, to only scan that section.
          </p>
        </div>
      )}
    </form>
  );
}
