import { afterEach, describe, expect, it, vi } from "vitest";
import { aiConfig, geminiText, parseSuggestion } from "./ai";

describe("AI provider selection", () => {
  afterEach(() => vi.unstubAllEnvs());

  const keys = (env: Record<string, string>) => {
    for (const name of ["GROQ_API_KEY", "GEMINI_API_KEY", "GEMINI_KEY", "AI_PROVIDER", "GEMINI_MODEL", "GROQ_MODEL"]) {
      vi.stubEnv(name, env[name] ?? "");
    }
  };

  it("is off with no keys", () => {
    keys({});
    expect(aiConfig()).toBeNull();
  });

  it("uses Gemini with only a Gemini key, defaulting to a current model", () => {
    keys({ GEMINI_API_KEY: "g" });
    expect(aiConfig()).toEqual({ provider: "Gemini", key: "g", model: "gemini-3.5-flash-lite" });
  });

  it("accepts Crawl Daddy's old GEMINI_KEY name", () => {
    keys({ GEMINI_KEY: "old" });
    expect(aiConfig()?.provider).toBe("Gemini");
  });

  it("prefers Groq when both are set, unless AI_PROVIDER says gemini", () => {
    keys({ GROQ_API_KEY: "q", GEMINI_API_KEY: "g" });
    expect(aiConfig()?.provider).toBe("Groq");
    keys({ GROQ_API_KEY: "q", GEMINI_API_KEY: "g", AI_PROVIDER: "Gemini", GEMINI_MODEL: "gemini-3.8-flash" });
    expect(aiConfig()).toEqual({ provider: "Gemini", key: "g", model: "gemini-3.8-flash" });
  });
});

describe("AI responses", () => {
  it("reads Gemini answer text and skips thought parts", () => {
    const text = geminiText({
      candidates: [{ content: { parts: [{ text: "pondering…", thought: true }, { text: '{"a":' }, { text: "1}" }] } }],
    });
    expect(text).toBe('{"a":1}');
  });

  it("parses suggestions, even when wrapped in a code fence", () => {
    const parsed = parseSuggestion(
      '```json\n{"assessment":"Solid.","title":"\\"A Better Title\\"","metaDescription":"Desc.","fixes":["One","Two","Three"]}\n```',
    );
    expect(parsed).toEqual({ assessment: "Solid.", title: "A Better Title", metaDescription: "Desc.", fixes: ["One", "Two", "Three"] });
    expect(parseSuggestion("not json")).toBeNull();
  });
});
