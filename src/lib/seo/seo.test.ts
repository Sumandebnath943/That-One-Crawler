import { describe, expect, it } from "vitest";
import { findIssues, scorePage } from "./issues";
import { buildRows, summarize } from "./report";
import { isAllowedByRobots, parseRobots } from "./robots";
import { emptyPage, toCrawledPage, type CrawledPage } from "./types";
import { inScope, isCrawlableUrl, normalizeInputUrl, scopeFor, urlKey } from "./url";

function page(overrides: Partial<CrawledPage> = {}): CrawledPage {
  return { ...toCrawledPage(emptyPage("https://example.com/post"), []), status: 200, isHtml: true, ...overrides };
}

describe("urls", () => {
  it("treats www, protocol, trailing slashes, hashes and tracking params as the same page", () => {
    const a = urlKey("https://www.Example.com/blog/post/?utm_source=x#comments");
    const b = urlKey("http://example.com/blog/post");
    expect(a).toBe(b);
  });

  it("keeps meaningful query params", () => {
    expect(urlKey("https://example.com/?page=2")).not.toBe(urlKey("https://example.com/"));
  });

  it("normalizes what people type", () => {
    expect(normalizeInputUrl("myblog.com")).toBe("https://myblog.com/");
    expect(normalizeInputUrl("  http://myblog.com/blog#top ")).toBe("http://myblog.com/blog");
    expect(normalizeInputUrl("not a url")).toBeNull();
    expect(normalizeInputUrl("ftp://myblog.com")).toBeNull();
  });

  it("scopes a scan to the path the user typed", () => {
    expect(scopeFor("https://example.com/", "https://www.example.com/en/")).toBe("");
    expect(scopeFor("https://example.com/blog", "https://example.com/blog/")).toBe("/blog");
    expect(scopeFor("https://example.com/blog/index.html", "https://example.com/blog/index.html")).toBe("/blog");
    expect(inScope("https://example.com/blog/post", "/blog")).toBe(true);
    expect(inScope("https://example.com/blog", "/blog")).toBe(true);
    expect(inScope("https://example.com/blogroll", "/blog")).toBe(false);
    expect(inScope("https://example.com/about", "")).toBe(true);
  });

  it("skips files and WordPress plumbing", () => {
    expect(isCrawlableUrl("https://example.com/hello-world/")).toBe(true);
    expect(isCrawlableUrl("https://example.com/image.JPG")).toBe(false);
    expect(isCrawlableUrl("https://example.com/feed/")).toBe(false);
    expect(isCrawlableUrl("https://example.com/wp-admin/edit.php")).toBe(false);
  });
});

describe("robots.txt", () => {
  const robots = parseRobots(`
    User-agent: Googlebot
    Disallow: /

    User-agent: *
    Disallow: /private/
    Disallow: /*.pdf$
    Allow: /private/ok
    Sitemap: https://example.com/sitemap_index.xml
  `);

  it("collects sitemaps and the * group", () => {
    expect(robots.sitemaps).toEqual(["https://example.com/sitemap_index.xml"]);
    expect(robots.rules.disallow).toEqual(["/private/", "/*.pdf$"]);
  });

  it("uses longest-match with Allow winning", () => {
    expect(isAllowedByRobots(robots.rules, "/blog/post")).toBe(true);
    expect(isAllowedByRobots(robots.rules, "/private/secret")).toBe(false);
    expect(isAllowedByRobots(robots.rules, "/private/ok-page")).toBe(true);
    expect(isAllowedByRobots(robots.rules, "/files/guide.pdf")).toBe(false);
    expect(isAllowedByRobots(robots.rules, "/files/guide.pdf?x=1")).toBe(true);
  });
});

describe("scoring", () => {
  const perfect = page({
    title: "A perfectly reasonable blog post title here",
    metaDescription: "x".repeat(140),
    h1: ["Hello"],
    h1Count: 1,
    wordCount: 1200,
    canonicalUrl: "https://example.com/post/",
    ogTitle: "Hello",
    schemaTypes: ["BlogPosting"],
  });

  it("gives 100 to a page that ticks every box, with no issues", () => {
    expect(scorePage(perfect)).toBe(100);
    expect(findIssues(perfect)).toEqual([]);
  });

  it("flags long titles as long (Crawl Daddy called them short)", () => {
    const issues = findIssues({ ...perfect, title: "t".repeat(75) });
    expect(issues.map((i) => i.code)).toEqual(["title-long"]);
  });

  it("keeps broken pages instead of dropping them", () => {
    const broken = page({ status: 404, isHtml: false });
    expect(scorePage(broken)).toBeNull();
    expect(findIssues(broken)).toEqual([{ code: "broken", detail: "(404)" }]);
  });

  it("spots noindex and robots-blocked pages", () => {
    const codes = findIssues(
      { ...perfect, finalUrl: "https://example.com/private/x", robotsMeta: "noindex, follow" },
      { allow: [], disallow: ["/private/"] },
    ).map((i) => i.code);
    expect(codes).toContain("robots-blocked");
    expect(codes).toContain("noindex");
  });

  it("finds duplicate titles across pages and averages scores over real pages only", () => {
    const rows = buildRows([
      { ...perfect, finalUrl: "https://example.com/a" },
      { ...perfect, finalUrl: "https://example.com/b", canonicalUrl: "https://example.com/b" },
      page({ finalUrl: "https://example.com/gone", status: 404, isHtml: false }),
    ]);
    expect(rows[0].issues.map((i) => i.code)).toContain("duplicate-title");
    const summary = summarize(rows);
    expect(summary.issueCounts.broken).toBe(1);
    expect(summary.avgScore).toBe(100);
  });
});
