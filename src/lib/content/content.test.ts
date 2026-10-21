import { describe, expect, it } from "vitest";
import { ISSUES, META_MAX, META_MIN, TITLE_MAX, TITLE_MIN, type IssueCode } from "@/lib/seo/issues";
import { countWords, injectionSignals } from "@/lib/seo/text";
import { HOME_TITLE, SITE_DESCRIPTION } from "@/lib/site";
import { GUIDES, guideFor } from "./guides";
import { llmsFullTxt, llmsTxt } from "./llms";
import { TOOLS } from "./tools";

// The site has to pass its own audit. These hold our own copy to the limits our crawler enforces.

const pages = [
  { name: "home", title: HOME_TITLE, description: SITE_DESCRIPTION },
  ...GUIDES.map((g) => ({ name: g.slug, title: g.metaTitle, description: g.metaDescription })),
  ...TOOLS.map((t) => ({ name: t.slug, title: t.metaTitle, description: t.metaDescription })),
];

describe("our own titles and descriptions", () => {
  it.each(pages)("$name fits the title and description limits", ({ title, description }) => {
    expect(title.length).toBeGreaterThanOrEqual(TITLE_MIN);
    expect(title.length).toBeLessThanOrEqual(TITLE_MAX);
    expect(description.length).toBeGreaterThanOrEqual(META_MIN);
    expect(description.length).toBeLessThanOrEqual(META_MAX);
  });

  it("never repeats a title or description", () => {
    expect(new Set(pages.map((p) => p.title)).size).toBe(pages.length);
    expect(new Set(pages.map((p) => p.description)).size).toBe(pages.length);
  });
});

describe("guides", () => {
  it("cover every issue the crawler reports, exactly once", () => {
    const covered = GUIDES.flatMap((g) => g.codes);
    expect(new Set(covered).size).toBe(covered.length);
    expect([...covered].sort()).toEqual((Object.keys(ISSUES) as IssueCode[]).sort());
  });

  it.each(GUIDES)("$slug opens with a quotable direct answer and complete sections", (guide) => {
    const words = countWords(guide.answer);
    expect(words).toBeGreaterThanOrEqual(35);
    expect(words).toBeLessThanOrEqual(70);
    expect(guide.steps.length).toBeGreaterThanOrEqual(3);
    expect(guide.faqs.length).toBeGreaterThanOrEqual(2);
    for (const slug of guide.related) expect(guideFor(slug), `${guide.slug} → ${slug}`).toBeDefined();
  });

  it("never trip our own prompt-injection detector", () => {
    for (const g of GUIDES) {
      const text = [g.title, g.answer, g.why, ...g.steps, ...g.faqs.flatMap((f) => [f.q, f.a])].join(" ");
      expect(injectionSignals(text), g.slug).toEqual([]);
    }
  });

  it("have unique slugs", () => {
    expect(new Set(GUIDES.map((g) => g.slug)).size).toBe(GUIDES.length);
  });
});

describe("tool pages", () => {
  it.each(TOOLS)("$slug links only to real guides and answers up front", (tool) => {
    const words = countWords(tool.answer);
    expect(words).toBeGreaterThanOrEqual(35);
    expect(words).toBeLessThanOrEqual(70);
    for (const slug of tool.guides) expect(guideFor(slug), `${tool.slug} → ${slug}`).toBeDefined();
  });
});

describe("llms.txt", () => {
  it("lists every tool and guide", () => {
    const text = llmsTxt();
    expect(text.startsWith("# That One Crawler")).toBe(true);
    for (const g of GUIDES) expect(text).toContain(`/checks/${g.slug}`);
    for (const t of TOOLS) expect(text).toContain(`/${t.slug}`);
    expect(llmsFullTxt()).toContain(GUIDES[0].answer);
  });
});
