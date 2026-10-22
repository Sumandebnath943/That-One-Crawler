import * as cheerio from "cheerio";
import { describe, expect, it } from "vitest";
import { controlNames, headingSkip, isMarkdown, looksWalled, pickSamples, readIdentity } from "./agents";
import { parsePagespeed, type PsiResponse } from "./pagespeed";
import type { FetchResult } from "./safe-fetch";

function response(status: number, body: string, headers: Record<string, string> = {}): FetchResult {
  const bytes = new TextEncoder().encode(body);
  return {
    requestedUrl: "https://x.com/",
    finalUrl: "https://x.com/",
    status,
    redirects: [],
    headers: new Headers(headers),
    body: bytes,
    sizeBytes: bytes.byteLength,
    truncated: false,
    timeMs: 10,
    ttfbMs: 5,
  };
}

describe("agent audit helpers", () => {
  it("recognizes Markdown answers, not HTML ones", () => {
    expect(isMarkdown(response(200, "# Title\n\nText", { "content-type": "text/markdown; charset=utf-8" }))).toBe(true);
    expect(isMarkdown(response(200, "# Title\n\nText", { "content-type": "text/plain" }))).toBe(true);
    expect(isMarkdown(response(200, "<!doctype html><h1>Hi</h1>", { "content-type": "text/html" }))).toBe(false);
    expect(isMarkdown(response(404, "# Not found", { "content-type": "text/markdown" }))).toBe(false);
  });

  it("spots firewalls and bot challenges", () => {
    expect(looksWalled(response(200, "<html><h1>Welcome</h1></html>"))).toBeNull();
    expect(looksWalled(response(403, "<title>Just a moment...</title>"))).toMatch(/challenge/);
    expect(looksWalled(response(403, "Forbidden", { "cf-mitigated": "challenge" }))).toMatch(/Cloudflare/);
    expect(looksWalled(response(200, "<html><title>Just a moment...</title><div id=cf-chl></div></html>"))).toMatch(/challenge/);
    expect(looksWalled(null)).toBe("refused");
  });

  it("samples content pages spread across the sitemap", () => {
    const urls = Array.from({ length: 9 }, (_, i) => `https://x.com/post-${i}`);
    expect(pickSamples(["https://x.com/", ...urls, "https://other.com/a", "https://x.com/file.pdf"], "https://x.com/", "x.com")).toEqual([
      "https://x.com/post-0",
      "https://x.com/post-4",
      "https://x.com/post-8",
    ]);
  });

  it("reads structured identity, control names and heading jumps", () => {
    const $ = cheerio.load(`<html><body>
      <script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebSite","name":"X"},
        {"@type":"Person","name":"Sam","url":"https://x.com","sameAs":["https://github.com/sam","https://linkedin.com/in/sam"]}]}</script>
      <a href="/a">About</a><a href="/b" aria-label="Contact us"><svg></svg></a><button></button>
      <label for="q">Search</label><input id="q"><input type="hidden" name="t">
      <h1>One</h1><h2>Two</h2><h4>Four</h4>
    </body></html>`);
    expect(readIdentity($)).toMatchObject({ type: "Person", name: true, url: true, sameAs: 2 });
    expect(controlNames($)).toEqual({ total: 4, named: 3, divButtons: 0 });
    expect(headingSkip($)).toBe(1);
  });
});

describe("PageSpeed parsing", () => {
  const psi: PsiResponse = {
    loadingExperience: {
      metrics: {
        LARGEST_CONTENTFUL_PAINT_MS: { percentile: 2100, category: "FAST", distributions: [{ proportion: 0.8 }, { proportion: 0.15 }, { proportion: 0.05 }] },
        INTERACTION_TO_NEXT_PAINT: { percentile: 150, category: "FAST" },
        CUMULATIVE_LAYOUT_SHIFT_SCORE: { percentile: 2, category: "FAST" },
      },
    },
    lighthouseResult: {
      lighthouseVersion: "13.5.0",
      categories: {
        performance: {
          score: 0.78,
          auditRefs: [
            { id: "largest-contentful-paint", group: "metrics" },
            { id: "render-blocking-insight", group: "insights" },
            { id: "unused-javascript", group: "diagnostics" },
            { id: "uses-long-cache-ttl", group: "diagnostics" },
            { id: "mainthread-work-breakdown", group: "diagnostics" },
          ],
        },
        accessibility: { score: 1, auditRefs: [{ id: "color-contrast" }, { id: "logical-tab-order" }] },
        "best-practices": { score: 1, auditRefs: [] },
        seo: { score: 0.92, auditRefs: [{ id: "link-text" }] },
      },
      audits: {
        "largest-contentful-paint": { id: "largest-contentful-paint", numericValue: 3530, score: 0.6, scoreDisplayMode: "numeric" },
        "render-blocking-insight": {
          id: "render-blocking-insight",
          title: "Render-blocking requests",
          description: "Requests block the page's initial render. [Learn more](https://developer.chrome.com/docs/x).",
          score: 0,
          scoreDisplayMode: "metricSavings",
          displayValue: "Est savings of 840 ms",
          metricSavings: { LCP: 0, FCP: 840 },
          details: { items: [{ url: "https://x.com/a.css" }] },
        },
        "unused-javascript": {
          id: "unused-javascript",
          title: "Reduce unused JavaScript",
          score: 0.5,
          scoreDisplayMode: "metricSavings",
          details: { overallSavingsMs: 300, overallSavingsBytes: 183_000, items: [{ url: "https://gtm.example/js" }] },
        },
        "uses-long-cache-ttl": { id: "uses-long-cache-ttl", title: "Cache", score: 1, scoreDisplayMode: "numeric" },
        "mainthread-work-breakdown": { id: "mainthread-work-breakdown", title: "Main thread", score: null, scoreDisplayMode: "informative", displayValue: "2.1 s" },
        "color-contrast": { id: "color-contrast", title: "Contrast", score: 1, scoreDisplayMode: "binary" },
        "logical-tab-order": { id: "logical-tab-order", title: "Tab order", score: null, scoreDisplayMode: "manual" },
        "link-text": { id: "link-text", title: "Links do not have descriptive text", score: 0, scoreDisplayMode: "binary" },
      },
    },
  };

  it("keeps categories, failed audits with savings, diagnostics and real-user data", () => {
    const result = parsePagespeed(psi, "mobile");
    expect(result).toMatchObject({ performance: 78, accessibility: 100, seo: 92, lcpSeconds: 3.53, strategy: "mobile" });
    const perf = result.categories!.find((c) => c.id === "performance")!;
    expect(perf.failed.map((a) => [a.id, a.savingsMs])).toEqual([
      ["render-blocking-insight", 840],
      ["unused-javascript", 300],
    ]);
    expect(perf.failed[0]).toMatchObject({ description: "Requests block the page's initial render.", learnMore: "https://developer.chrome.com/docs/x", items: ["https://x.com/a.css"] });
    expect(perf.passed).toBe(1);
    expect(perf.diagnostics.map((a) => a.id)).toEqual(["mainthread-work-breakdown"]);
    expect(result.categories!.find((c) => c.id === "accessibility")).toMatchObject({ passed: 1, manual: 1, failed: [] });
    expect(result.field).toMatchObject({ scope: "url", passed: true, cls: { p75: 0.02, rating: "good" }, lcp: { distribution: [80, 15, 5] } });
  });

  it("falls back to whole-site field data when the page has none", () => {
    const result = parsePagespeed(
      { ...psi, loadingExperience: { ...psi.loadingExperience, origin_fallback: true }, originLoadingExperience: psi.loadingExperience },
      "desktop",
    );
    expect(result.field?.scope).toBe("origin");
  });
});
