import { describe, expect, it } from "vitest";
import { markdownFor } from "@/lib/content/markdown";
import { markdownTarget, markdownUrl, prefersMarkdown } from "@/lib/content/negotiate";
import { ABOUT, CONTACT, privacyCopy } from "@/lib/content/pages";
import { CONTENT_PATHS, isKnownPath } from "@/lib/content/routes";
import { describeClient, judge, trafficSource } from "./bot";
import { formatCrawler } from "./crawler-alert";
import { identifyCrawler, isAiAgent } from "./crawlers";
import { formatArrival, formatEnd } from "./format";
import type { Geo } from "./geo";
import { classifyPath, isReportablePath } from "./paths";
import { parseBeacon } from "./payload";
import { decodeSettings, encodeSettings, isPaused, parseDuration } from "./settings";

const CHROME = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

const geo: Geo = { ip: "203.0.113.7", city: "Pune", country: "India", countryCode: "IN", flag: "🇮🇳", datacenter: false, mobile: false, precision: "city", source: "vercel" };

function payload(extra: Record<string, unknown> = {}) {
  return parseBeacon({
    v: 1,
    sid: "abc123def",
    kind: "arrival",
    path: "/",
    signals: { languages: 2, plugins: 5, hardwareConcurrency: 8, deviceMemory: 8, timezone: "Asia/Kolkata", cookiesEnabled: true },
    device: { screenW: 1920, screenH: 1080, viewportW: 1500, viewportH: 800 },
    ...extra,
  })!;
}

describe("parseBeacon", () => {
  it("rejects anything that isn't a beacon", () => {
    expect(parseBeacon(null)).toBeNull();
    expect(parseBeacon({ v: 1, sid: "abc123", kind: "nope", path: "/" })).toBeNull();
    expect(parseBeacon({ v: 1, sid: "<script>", kind: "arrival", path: "/" })).toBeNull();
    expect(parseBeacon({ v: 1, sid: "abc123", kind: "arrival", path: "https://evil.example" })).toBeNull();
    expect(parseBeacon({ v: 1, sid: "abc123", kind: "event", path: "/" })).toBeNull();
  });

  it("bounds every field", () => {
    const p = parseBeacon({
      v: 1,
      sid: "abc123",
      kind: "end",
      path: "/scan",
      title: "x".repeat(5000),
      sessionMs: -5,
      pages: Array.from({ length: 100 }, (_, i) => ({ path: `/p${i}`, t: i })),
      activity: [{ kind: "scan", label: "example.com", t: 1 }, { kind: "hack", label: "x" }],
      scroll: { maxPct: 400, milestones: [25, 33, 50] },
      signals: { clicks: 1e12, timezone: "Asia/\u0000Kolkata" },
    })!;
    expect(p.title).toHaveLength(160);
    expect(p.sessionMs).toBe(0);
    expect(p.pages).toHaveLength(40);
    expect(p.activity).toEqual([{ kind: "scan", label: "example.com", t: 1 }]);
    expect(p.scroll.maxPct).toBe(100);
    expect(p.scroll.milestones).toEqual([25, 50]);
    expect(p.signals.clicks).toBe(10_000);
    expect(p.signals.timezone).toBe("Asia/ Kolkata");
  });
});

describe("judge", () => {
  it("trusts a real browser on arrival without waiting for behavior", () => {
    expect(judge(payload(), geo, CHROME, "en-IN").score).toBeGreaterThanOrEqual(62);
  });

  it("flags automation", () => {
    const v = judge(payload({ signals: { webdriver: true } }), { ...geo, datacenter: true }, "HeadlessChrome/141", null);
    expect(v.score).toBeLessThan(40);
    expect(v.reasons).toContain("navigator.webdriver");
  });

  it("names declared crawlers", () => {
    expect(judge(payload(), geo, "Mozilla/5.0 (compatible; Googlebot/2.1)", "en").crawler).toBe("Googlebot");
  });

  it("describes clients", () => {
    expect(describeClient(CHROME)).toBe("Chrome 141 · Windows");
    expect(describeClient("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1")).toBe("Safari 18 · iOS");
  });
});

describe("trafficSource", () => {
  it("spots visitors sent by AI answers", () => {
    expect(trafficSource(undefined, "/?utm_source=chatgpt.com")).toEqual({ kind: "ai", name: "ChatGPT" });
    expect(trafficSource("https://www.perplexity.ai/search/abc", "/")).toEqual({ kind: "ai", name: "Perplexity" });
  });
  it("sorts search, social and direct", () => {
    expect(trafficSource("https://www.google.co.in/", "/").kind).toBe("search");
    expect(trafficSource("https://t.co/abc", "/").name).toBe("X");
    expect(trafficSource(undefined, "/").kind).toBe("direct");
  });
});

describe("identifyCrawler", () => {
  it("keeps specific agents above their vendor's broad pattern", () => {
    expect(identifyCrawler("Mozilla/5.0 AppleWebKit/537.36; compatible; ChatGPT-User/1.0; +https://openai.com/bot")?.kind).toBe("live");
    expect(identifyCrawler("Mozilla/5.0 (compatible; Claude-SearchBot/1.0)")?.name).toBe("Claude-SearchBot");
    expect(identifyCrawler("Mozilla/5.0 (compatible; Applebot-Extended/0.1)")?.name).toBe("Applebot-Extended");
    expect(identifyCrawler("Mozilla/5.0 (compatible; ThatOneCrawler/1.0)")?.kind).toBe("tool");
  });
  it("lets browsers through and catches the rest", () => {
    expect(identifyCrawler(CHROME)).toBeNull();
    expect(identifyCrawler(null)?.kind).toBe("unknown");
    expect(identifyCrawler("curl/8.4.0")?.name).toBe("Script");
    expect(identifyCrawler("Mozilla/5.0 (compatible; Googlebot/2.1)")?.verifyDomains).toContain("googlebot.com");
  });
  it("knows which are AI agents", () => {
    expect(isAiAgent(identifyCrawler("GPTBot/1.2")!)).toBe(true);
    expect(isAiAgent(identifyCrawler("bingbot/2.0")!)).toBe(false);
  });
});

describe("paths", () => {
  it("knows real routes, twins and probes", () => {
    expect(classifyPath("/checks/title-tag-length")).toEqual({ known: true, probe: null });
    expect(classifyPath("/checks/title-tag-length.md").known).toBe(true);
    expect(classifyPath("/privacy").known).toBe(true);
    expect(classifyPath("/.env").probe).toMatch(/env/);
    expect(classifyPath("/wp-login.php").probe).toBe("WordPress");
    expect(classifyPath("/.well-known/security.txt").probe).toBeNull();
    expect(classifyPath("/nope")).toEqual({ known: false, probe: null });
  });
  it("only reports pages and agent files", () => {
    expect(isReportablePath("/")).toBe(true);
    expect(isReportablePath("/llms.txt")).toBe(true);
    expect(isReportablePath("/index.md")).toBe(true);
    expect(isReportablePath("/robots.txt")).toBe(false);
    expect(isReportablePath("/opengraph-image")).toBe(false);
    expect(isReportablePath("/logo.png")).toBe(false);
  });
});

describe("settings", () => {
  it("round-trips through the bot's short description", () => {
    const until = Date.parse("2030-01-02T03:04:00Z");
    const text = encodeSettings({ bots: "ai", pausedUntil: until }, Date.parse("2030-01-01T00:00:00Z"));
    expect(text.length).toBeLessThanOrEqual(120);
    expect(decodeSettings(text)).toEqual({ bots: "ai", pausedUntil: until });
    expect(decodeSettings("Some other description", { bots: "all", pausedUntil: null })).toEqual({ bots: "all", pausedUntil: null });
  });
  it("expires pauses", () => {
    expect(isPaused({ bots: "all", pausedUntil: Date.now() - 1 })).toBe(false);
    expect(isPaused({ bots: "all", pausedUntil: Date.now() + 60_000 })).toBe(true);
  });
  it("parses pause durations", () => {
    expect(parseDuration(undefined)).toBe(3_600_000);
    expect(parseDuration("30m")).toBe(1_800_000);
    expect(parseDuration("2h")).toBe(7_200_000);
    expect(parseDuration("30d")).toBe(7 * 86_400_000);
    expect(parseDuration("soon")).toBeNull();
  });
});

describe("alert formatting", () => {
  it("escapes visitor-controlled text", () => {
    const text = formatArrival(payload({ title: "<b>pwned</b>", referrer: "https://chatgpt.com/" }), geo, judge(payload(), geo, CHROME, "en"), CHROME);
    expect(text).toContain("&lt;b&gt;pwned&lt;/b&gt;");
    expect(text).toContain("Came from ChatGPT");
  });
  it("lists what a visitor did", () => {
    const p = payload({ kind: "end", activity: [{ kind: "scan_done", label: "example.com · 120 pages · SEO 82", t: 9000 }] });
    expect(formatEnd(p, geo, judge(p, geo, CHROME, "en"), CHROME)).toContain("Scan finished: example.com · 120 pages · SEO 82");
  });
  it("calls out impostor crawlers", () => {
    const text = formatCrawler({
      crawler: identifyCrawler("Googlebot/2.1")!,
      pathname: "/",
      verdict: { known: true, probe: null },
      headers: new Headers({ "user-agent": "Googlebot/2.1" }),
      ip: "198.51.100.1",
      skipped: 3,
      verification: { state: "spoofed", host: "evil.example" },
    });
    expect(text).toContain("Fake Googlebot");
    expect(text).toContain("3 more requests");
  });
});

describe("Markdown for agents", () => {
  it("negotiates on Accept", () => {
    expect(prefersMarkdown("text/markdown, text/plain;q=0.9, */*;q=0.1")).toBe(true);
    expect(prefersMarkdown("text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")).toBe(false);
    expect(prefersMarkdown("text/html, text/markdown;q=0.5")).toBe(false);
    expect(prefersMarkdown(null)).toBe(false);
  });
  it("maps twins and negotiated requests to the Markdown route", () => {
    expect(markdownTarget("/index.md", null)).toBe("/markdown");
    expect(markdownTarget("/broken-link-checker.md", null)).toBe("/markdown/broken-link-checker");
    expect(markdownTarget("/checks/title-tag-length", "text/markdown")).toBe("/markdown/checks/title-tag-length");
    expect(markdownTarget("/", "text/markdown")).toBe("/markdown");
    expect(markdownTarget("/scan", "text/markdown")).toBeNull();
    expect(markdownTarget("/nope.md", null)).toBeNull();
    expect(markdownTarget("/about", "text/html")).toBeNull();
    expect(markdownUrl("/")).toBe("/index.md");
  });
  it("has a twin for every content page, starting with a heading", () => {
    for (const path of CONTENT_PATHS) {
      const md = markdownFor(path);
      expect(md, path).toMatch(/^# \S/);
      expect(md!.length, path).toBeLessThan(60_000);
      // Relative links would be meaningless once the Markdown leaves the site.
      expect(md, path).not.toMatch(/\]\(\//);
      expect(isKnownPath(path === "/" ? "/index.md" : `${path}.md`), path).toBe(true);
    }
  });
});

describe("trust pages", () => {
  it("keep titles and descriptions within search limits", () => {
    for (const page of [ABOUT, CONTACT, privacyCopy(false), privacyCopy(true)]) {
      expect(page.title.length, page.path).toBeGreaterThanOrEqual(30);
      expect(page.title.length, page.path).toBeLessThanOrEqual(60);
      expect(page.description.length, page.path).toBeGreaterThanOrEqual(120);
      expect(page.description.length, page.path).toBeLessThanOrEqual(160);
      const words = page.answer.split(/\s+/).length;
      expect(words, page.path).toBeGreaterThanOrEqual(40);
      expect(words, page.path).toBeLessThanOrEqual(70);
    }
  });
});
