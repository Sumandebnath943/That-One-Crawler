import { describe, expect, it } from "vitest";
import { diffWords } from "./diff";

describe("diffWords", () => {
  it("marks added and removed words", () => {
    expect(diffWords("fix broken links", "fix all broken links fast")).toEqual([
      { type: "same", text: "fix " },
      { type: "add", text: "all " },
      { type: "same", text: "broken links" },
      { type: "add", text: " fast" },
    ]);
  });

  it("ignores quote and dash style, showing the new spelling", () => {
    expect(diffWords("WordPress 7.1 “Mary Lou” – News", 'WordPress 7.1 "Mary Lou" - News')).toEqual([
      { type: "same", text: 'WordPress 7.1 "Mary Lou" - News' },
    ]);
  });
});
