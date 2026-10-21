import { describe, expect, it } from "vitest";
import { extractEntries, extractLocs, orderChildSitemaps, sitemapPriority } from "./discover";
import { extractContent } from "./extract";
import { assertPublicUrl, BlockedUrlError, decodeBody } from "./safe-fetch";

const HTML = `<!doctype html>
<html lang="en">
<head>
  <title> My   Post Title </title>
  <meta name="Description" content="A description.">
  <meta property="og:title" content="OG title">
  <meta property="og:image" content="/img/cover.png">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="/my-post/">
  <link rel="alternate" hreflang="de" href="https://example.com/de/my-post/">
  <script type="application/ld+json">
    {"@context":"https://schema.org","@graph":[{"@type":"BlogPosting","datePublished":"2024-01-02","author":{"@type":"Person","name":"Sam"}},{"@type":"WebSite"}]}
  </script>
</head>
<body>
  <header><nav><a href="/">Home</a><a href="https://www.example.com/about">About</a></nav></header>
  <h1>Hello<br>World</h1>
  <h2>First</h2><h2>Second</h2>
  <p>One two three.</p><p>Four five</p>
  <img src="a.png" alt="A"><img src="b.png"><img src="c.png" alt="">
  <a href="/my-post/#comments">Comments</a>
  <a href="/feed/">RSS</a>
  <a href="https://twitter.com/x">Twitter</a>
  <a href="mailto:me@example.com">Mail</a>
  <footer>Footer words should not count</footer>
</body>
</html>`;

describe("extractContent", () => {
  const data = extractContent(HTML, "https://example.com/my-post/", "example.com");

  it("reads metadata", () => {
    expect(data.title).toBe("My Post Title");
    expect(data.metaDescription).toBe("A description.");
    expect(data.ogTitle).toBe("OG title");
    expect(data.ogImage).toBe("https://example.com/img/cover.png");
    expect(data.canonicalUrl).toBe("https://example.com/my-post/");
    expect(data.hreflang).toEqual(["de"]);
    expect(data.lang).toBe("en");
  });

  it("reads headings with spaces between elements", () => {
    expect(data.h1).toEqual(["Hello World"]);
    expect(data.h1Count).toBe(1);
    expect(data.h2).toEqual(["First", "Second"]);
  });

  it("reads JSON-LD inside @graph", () => {
    expect(data.schemaTypes).toEqual(["BlogPosting", "WebSite"]);
    expect(data.datePublished).toBe("2024-01-02");
    expect(data.author).toBe("Sam");
  });

  it("counts only body words outside nav and footer", () => {
    // Hello World First Second One two three Four five Comments RSS Twitter Mail
    expect(data.wordCount).toBe(13);
  });

  it("only counts images with no alt attribute as missing alt", () => {
    expect(data.imageCount).toBe(3);
    expect(data.imagesMissingAlt).toBe(1);
  });

  it("collects crawlable same-site links, www included", () => {
    expect(data.links).toEqual(["https://example.com/", "https://www.example.com/about", "https://example.com/my-post/"]);
    expect(data.internalLinks).toBe(4);
    expect(data.externalLinks).toBe(1);
  });
});

describe("sitemaps", () => {
  it("extracts <loc> values, including CDATA and entities", () => {
    const xml = `<urlset><url><loc>https://a.com/x?a=1&amp;b=2</loc></url><url><loc><![CDATA[ https://a.com/y ]]></loc></url><image:loc>https://a.com/i.png</image:loc></urlset>`;
    expect(extractLocs(xml)).toEqual(["https://a.com/x?a=1&b=2", "https://a.com/y"]);
  });

  it("prefers post sitemaps over taxonomy ones", () => {
    const sorted = ["/category-sitemap.xml", "/page-sitemap.xml", "/post-sitemap.xml"].sort(
      (a, b) => sitemapPriority(a) - sitemapPriority(b),
    );
    expect(sorted).toEqual(["/post-sitemap.xml", "/page-sitemap.xml", "/category-sitemap.xml"]);
  });

  it("reads lastmod and orders child sitemaps newest first", () => {
    const index = `<sitemapindex>
      <sitemap><loc>https://a.com/wp-sitemap-posts-post-1.xml</loc></sitemap>
      <sitemap><loc>https://a.com/wp-sitemap-posts-post-2.xml</loc></sitemap>
      <sitemap><loc>https://a.com/wp-sitemap-taxonomies-category-1.xml</loc></sitemap>
    </sitemapindex>`;
    const ordered = orderChildSitemaps(extractEntries(index, "sitemap")).map((e) => e.loc.split("/").pop());
    expect(ordered).toEqual([
      "wp-sitemap-posts-post-2.xml",
      "wp-sitemap-posts-post-1.xml",
      "wp-sitemap-taxonomies-category-1.xml",
    ]);

    const urlset = `<urlset><url><loc>https://a.com/old</loc><lastmod>2019-01-01</lastmod></url><url><loc>https://a.com/new</loc><lastmod>2026-02-03T10:00:00+00:00</lastmod></url></urlset>`;
    expect(extractEntries(urlset, "url")).toEqual([
      { loc: "https://a.com/old", lastmod: "2019-01-01" },
      { loc: "https://a.com/new", lastmod: "2026-02-03T10:00:00+00:00" },
    ]);
  });
});

describe("safe fetching", () => {
  it("refuses private and local addresses", async () => {
    for (const url of ["http://localhost:3000", "http://127.0.0.1/", "http://10.0.0.5/", "http://[::1]/", "http://192.168.1.1/"]) {
      await expect(assertPublicUrl(new URL(url))).rejects.toBeInstanceOf(BlockedUrlError);
    }
    await expect(assertPublicUrl(new URL("file:///etc/passwd"))).rejects.toBeInstanceOf(BlockedUrlError);
  });

  it("decodes declared charsets", () => {
    const latin1 = new Uint8Array([0x63, 0x61, 0x66, 0xe9]);
    expect(decodeBody(latin1, "text/html; charset=iso-8859-1")).toBe("café");
  });
});
