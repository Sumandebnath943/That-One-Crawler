import { describe, expect, it } from "vitest";
import { buildRows } from "@/lib/seo/report";
import { emptyPage, toCrawledPage } from "@/lib/seo/types";
import { toCsv } from "./csv";

describe("csv export", () => {
  it("writes a header plus one escaped row per page", () => {
    const page = {
      ...toCrawledPage(emptyPage("https://example.com/a"), []),
      status: 200,
      isHtml: true,
      title: 'Commas, "quotes" and more',
      h1: ["One", "Two"],
      h1Count: 2,
      wordCount: 120,
    };
    const csv = toCsv(buildRows([page]));
    const [header, row] = csv.split("\r\n");
    expect(header.startsWith("url,status_code,seo_score,issues,title")).toBe(true);
    expect(row).toContain('"Commas, ""quotes"" and more"');
    expect(row).toContain("One | Two");
    expect(row.startsWith("https://example.com/a,200,")).toBe(true);
  });
});
