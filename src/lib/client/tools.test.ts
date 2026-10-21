import { describe, expect, it } from "vitest";
import { buildRows } from "@/lib/seo/report";
import { emptyPage, toCrawledPage, type CrawledPage } from "@/lib/seo/types";
import { checkedLinks, csvCell, unreadableReason, usedOn } from "./tools";

function page(url: string, overrides: Partial<CrawledPage> = {}): CrawledPage {
  return { ...toCrawledPage(emptyPage(url), []), status: 200, isHtml: true, wordCount: 500, ...overrides };
}

const rows = buildRows(
  [
    page("https://example.com/a", {
      outlinksInternal: ["https://example.com/b"],
      outlinksExternal: ["https://other.org/x"],
      imageSrcs: ["https://example.com/pic.png"],
    }),
    page("https://example.com/c", { outlinksExternal: ["https://other.org/x"] }),
  ],
  { asOf: Date.now(), complete: false },
);

describe("tool helpers", () => {
  it("lists every page that uses a link or image", () => {
    const map = usedOn(rows);
    expect(map.get("https://other.org/x")).toEqual(["https://example.com/a", "https://example.com/c"]);
    expect(map.get("https://example.com/pic.png")).toEqual(["https://example.com/a"]);
  });

  it("labels checked URLs as internal, external or image", () => {
    const kinds = checkedLinks(rows, {
      "https://example.com/b": { url: "https://example.com/b", status: 404, state: "broken" },
      "https://other.org/x": { url: "https://other.org/x", status: 403, state: "blocked" },
      "https://example.com/pic.png": { url: "https://example.com/pic.png", status: 200, state: "ok" },
    }).map((c) => [c.url, c.kind, c.foundOn.length]);
    expect(kinds).toEqual([
      ["https://example.com/b", "internal", 1],
      ["https://other.org/x", "external", 2],
      ["https://example.com/pic.png", "image", 1],
    ]);
  });

  it("explains why a page can't be checked", () => {
    expect(unreadableReason(rows[0])).toBeNull();
    expect(unreadableReason({ ...rows[0], status: 404 })).toMatch(/404/);
    expect(unreadableReason({ ...rows[0], isHtml: false })).toMatch(/isn't an HTML page/);
  });

  it("quotes CSV cells only when needed", () => {
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell('say "hi", ok')).toBe('"say ""hi"", ok"');
  });
});
