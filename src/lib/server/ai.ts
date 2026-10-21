import type { AiSuggestion } from "@/lib/seo/types";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

export function aiConfig() {
  return {
    key: process.env.GROQ_API_KEY || "",
    model: process.env.GROQ_MODEL || DEFAULT_MODEL,
  };
}

/** The subset of a page the browser sends us for analysis. */
export interface AiPageInput {
  url: string;
  title: string;
  metaDescription: string;
  h1: string[];
  h2: string[];
  wordCount: number;
  score: number | null;
  issues: string[];
  schemaTypes: string[];
  pagespeed?: { performance: number | null; seo: number | null; lcpSeconds: number | null; cls: number | null };
}

const cut = (value: unknown, max: number) => String(value ?? "").slice(0, max);
const list = (value: unknown, items: number, max: number) =>
  Array.isArray(value) ? value.slice(0, items).map((v) => cut(v, max)) : [];

export function sanitizeAiInput(raw: unknown): AiPageInput | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  if (typeof p.url !== "string" || !/^https?:\/\//i.test(p.url)) return null;
  const ps = p.pagespeed as Record<string, unknown> | undefined;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  return {
    url: cut(p.url, 500),
    title: cut(p.title, 300),
    metaDescription: cut(p.metaDescription, 500),
    h1: list(p.h1, 3, 200),
    h2: list(p.h2, 6, 200),
    wordCount: num(p.wordCount) ?? 0,
    score: num(p.score),
    issues: list(p.issues, 20, 120),
    schemaTypes: list(p.schemaTypes, 10, 60),
    pagespeed: ps
      ? { performance: num(ps.performance), seo: num(ps.seo), lcpSeconds: num(ps.lcpSeconds), cls: num(ps.cls) }
      : undefined,
  };
}

function buildPrompt(page: AiPageInput): string {
  const or = (value: string, fallback = "Missing") => value || fallback;
  const lines = [
    `URL: ${page.url}`,
    `Title (${page.title.length} chars): ${or(page.title)}`,
    `Meta description (${page.metaDescription.length} chars): ${or(page.metaDescription)}`,
    `H1: ${or(page.h1.join(" | "))}`,
    `H2s: ${or(page.h2.join(" | "), "None")}`,
    `Word count: ${page.wordCount}`,
    `SEO score: ${page.score ?? "n/a"}/100`,
    `Issues detected: ${or(page.issues.join("; "), "None")}`,
    `Structured data types: ${or(page.schemaTypes.join(", "), "None")}`,
  ];
  if (page.pagespeed) {
    const ps = page.pagespeed;
    lines.push(
      `PageSpeed (mobile): performance ${ps.performance ?? "n/a"}/100, SEO ${ps.seo ?? "n/a"}/100, LCP ${ps.lcpSeconds ?? "n/a"}s, CLS ${ps.cls ?? "n/a"}`,
    );
  }
  return `Analyze this blog page's SEO data and give concise, actionable feedback.

${lines.join("\n")}

Reply with a JSON object with exactly these keys:
- "assessment": two sentences on the page's content quality and SEO effectiveness. You may be lightly witty, never mean.
- "title": one improved title tag, 50-60 characters, no surrounding quotes.
- "metaDescription": one improved meta description, 150-160 characters, no surrounding quotes.
- "fixes": an array of exactly three strings, the most impactful fixes first, each with a short reason.`;
}

function parseSuggestion(content: string): Omit<AiSuggestion, "model"> | null {
  const candidates = [content, content.match(/\{[\s\S]*\}/)?.[0] ?? ""];
  for (const candidate of candidates) {
    try {
      const data = JSON.parse(candidate) as Record<string, unknown>;
      const fixes = Array.isArray(data.fixes) ? data.fixes.map(String).filter(Boolean).slice(0, 5) : [];
      if (typeof data.assessment === "string" && typeof data.title === "string") {
        return {
          assessment: data.assessment.trim(),
          title: data.title.trim().replace(/^["']|["']$/g, ""),
          metaDescription: String(data.metaDescription ?? "").trim().replace(/^["']|["']$/g, ""),
          fixes,
        };
      }
    } catch {
      // Try the next candidate.
    }
  }
  return null;
}

export async function suggestFixes(page: AiPageInput, signal?: AbortSignal): Promise<AiSuggestion> {
  const { key, model } = aiConfig();
  const timeout = AbortSignal.timeout(45_000);
  const res = await fetch(GROQ_URL, {
    method: "POST",
    signal: signal ? AbortSignal.any([timeout, signal]) : timeout,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_tokens: 900,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are an expert SEO consultant for bloggers. Always answer with a single valid JSON object.",
        },
        { role: "user", content: buildPrompt(page) },
      ],
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
    choices?: { message?: { content?: string } }[];
  };
  if (!res.ok) throw new Error(data.error?.message || `The AI provider answered ${res.status}`);

  const parsed = parseSuggestion(data.choices?.[0]?.message?.content ?? "");
  if (!parsed) throw new Error("The AI replied with something we couldn't read. Try again.");
  return { ...parsed, model };
}
