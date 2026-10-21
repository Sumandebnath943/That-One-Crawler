import {
  DEEP_CLICKS,
  GOOD_WORDS,
  HEAVY_IMAGE_BYTES,
  META_MAX,
  META_MIN,
  STALE_MONTHS,
  STUFFING_DENSITY,
  THIN_WORDS,
  TITLE_MAX,
  TITLE_MIN,
} from "@/lib/seo/issues";
import type { AiFaq, AiHeadings, AiIntro, AiMeta, AiPlan, AiResult, AiSection, AiTask, GuardReport } from "@/lib/seo/types";
import { readSource, type PageSource } from "../extract";
import { BlockedUrlError, decodeBody, safeFetch } from "../safe-fetch";
import { cleanLine, DATA_RULE, fence, guardOutput, parseJsonObject } from "./guard";
import { runLlm, type JobSize } from "./router";

// Each AI tool is one short, user-triggered call on a trimmed slice of the page (roughly 1–4k
// tokens in total), so the free tiers of Groq and Gemini can carry it. Compare the reference
// "maker" pipeline at ~48k tokens per page: that's what free tiers can't afford.

const SYSTEM =
  "You are a senior SEO and content editor who helps bloggers. You write clear, specific, human copy " +
  "and never pad. " +
  DATA_RULE +
  " Always answer with a single valid JSON object and nothing else.";

export class TaskError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export interface PlanInput {
  domain: string;
  pages: number;
  avgScore: number | null;
  avgAiScore: number | null;
  issues: { label: string; severity: string; count: number }[];
  worstPages: { url: string; score: number | null; issues: string[] }[];
}

export interface TaskRequest {
  task: AiTask;
  url?: string;
  heading?: string;
  keyword?: string;
  issues?: string[];
  brand?: { brandName?: string; bannedPhrases?: string[] };
  plan?: PlanInput;
}

interface TaskContext {
  userGeminiKey?: string;
  signal?: AbortSignal;
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const strList = (v: unknown, items: number, max: number) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((x) => x.trim().slice(0, max)).filter(Boolean).slice(0, items) : [];

/** Validate and trim whatever the browser sent. */
export function sanitizeTask(raw: unknown): TaskRequest | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const task = r.task;
  if (!["meta", "section", "headings", "faq", "intro", "plan"].includes(task as string)) return null;
  const url = str(r.url, 2000);
  if (task !== "plan" && !/^https?:\/\//i.test(url)) return null;
  if (task === "section" && !str(r.heading, 300)) return null;
  const brandRaw = (r.brand ?? {}) as Record<string, unknown>;
  const planRaw = (r.plan ?? null) as Record<string, unknown> | null;
  if (task === "plan" && !planRaw) return null;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  return {
    task: task as AiTask,
    url,
    heading: str(r.heading, 300),
    keyword: str(r.keyword, 120),
    issues: strList(r.issues, 25, 140),
    brand: { brandName: str(brandRaw.brandName, 80), bannedPhrases: strList(brandRaw.bannedPhrases, 30, 80) },
    plan: planRaw
      ? {
          domain: str(planRaw.domain, 200),
          pages: num(planRaw.pages) ?? 0,
          avgScore: num(planRaw.avgScore),
          avgAiScore: num(planRaw.avgAiScore),
          issues: (Array.isArray(planRaw.issues) ? planRaw.issues : []).slice(0, 15).map((i: Record<string, unknown>) => ({
            label: str(i?.label, 80),
            severity: str(i?.severity, 20),
            count: num(i?.count) ?? 0,
          })),
          worstPages: (Array.isArray(planRaw.worstPages) ? planRaw.worstPages : []).slice(0, 8).map((p: Record<string, unknown>) => ({
            url: str(p?.url, 300),
            score: num(p?.score),
            issues: strList(p?.issues, 6, 80),
          })),
        }
      : undefined,
  };
}

async function loadPage(url: string, signal?: AbortSignal): Promise<PageSource> {
  let res;
  try {
    res = await safeFetch(url, { timeoutMs: 12_000, maxBytes: 3_000_000, signal });
  } catch (err) {
    if (err instanceof BlockedUrlError) throw new TaskError(err.message, 400);
    throw err;
  }
  if (res.error || res.status >= 400) {
    throw new TaskError(`We couldn't re-read that page (${res.error ?? `HTTP ${res.status}`}).`, 502);
  }
  return readSource(decodeBody(res.body, res.headers?.get("content-type") ?? null));
}

function brandLines(req: TaskRequest): string {
  const lines: string[] = [];
  if (req.brand?.brandName) lines.push(`Brand name: ${req.brand.brandName}`);
  if (req.brand?.bannedPhrases?.length) lines.push(`Never use these phrases: ${req.brand.bannedPhrases.map((p) => `"${p}"`).join(", ")}`);
  return lines.join("\n");
}

function outlineText(source: PageSource): string {
  return source.outline.map((h) => `${"#".repeat(h.level)} ${h.text}`).join("\n");
}

async function ask(size: JobSize, prompt: string, maxTokens: number, required: string[], ctx: TaskContext) {
  const answer = await runLlm(
    size,
    { system: SYSTEM, prompt, maxTokens },
    {
      userGeminiKey: ctx.userGeminiKey,
      signal: ctx.signal,
      validate: (text) => {
        const data = parseJsonObject(text);
        return Boolean(data && required.every((key) => key in data));
      },
    },
  );
  return { data: parseJsonObject(answer.text)!, provider: answer.provider, model: answer.model };
}

/**
 * Models often overshoot length limits. One quick follow-up (not counted against the visitor's
 * quota) shortens only the field that's too long; if it fails, the first draft stands.
 */
async function tighten(body: AiMeta, ctx: TaskContext): Promise<AiMeta> {
  const longTitle = body.title.length > TITLE_MAX;
  const longMeta = body.metaDescription.length > META_MAX;
  if (!longTitle && !longMeta) return body;
  const prompt = `Shorten these search snippets without changing their meaning or adding anything new. Keep the main keyword near the start of the title.

${fence("TITLE", body.title, 200)}
${fence("DESCRIPTION", body.metaDescription, 400)}

Reply with JSON: {"title": "the title in ${TITLE_MAX - 10}-${TITLE_MAX} characters", "metaDescription": "the description in ${META_MAX - 20}-${META_MAX} characters"}`;
  try {
    const { data } = await ask("short", prompt, 300, ["title", "metaDescription"], ctx);
    const title = cleanLine(data.title, 120);
    const description = cleanLine(data.metaDescription, 320);
    return {
      ...body,
      title: longTitle && title.length >= TITLE_MIN && title.length < body.title.length ? title : body.title,
      metaDescription:
        longMeta && description.length >= META_MIN && description.length < body.metaDescription.length ? description : body.metaDescription,
    };
  } catch (err) {
    if (ctx.signal?.aborted) throw err;
    return body;
  }
}

function finish<T extends object>(body: T, meta: { provider: string; model: string }, guard: GuardReport): AiResult<T> {
  return { ...body, provider: meta.provider, model: meta.model, at: Date.now(), guard };
}

export async function runTask(req: TaskRequest, ctx: TaskContext): Promise<AiResult<object>> {
  const banned = req.brand?.bannedPhrases ?? [];

  if (req.task === "plan") {
    const plan = req.plan!;
    const weakPages = plan.worstPages.filter((p) => p.issues.length);
    const facts = [
      `Site: ${plan.domain} (${plan.pages} pages scanned)`,
      `Average SEO score: ${plan.avgScore ?? "n/a"}/100. Average AI-search readiness: ${plan.avgAiScore ?? "n/a"}/100.`,
      plan.issues.length
        ? `Most common issues:\n${plan.issues.map((i) => `- ${i.label} (${i.severity}): ${i.count} pages`).join("\n")}`
        : "Most common issues: none. The scan found no problems on any page.",
      weakPages.length
        ? `Weakest pages:\n${weakPages.map((p) => `- ${p.url} (score ${p.score ?? "n/a"}): ${p.issues.join("; ")}`).join("\n")}`
        : "Weakest pages: none have issues.",
      // The targets behind the checks, so advice quotes our numbers instead of inventing its own.
      `For reference, the targets the checks use: titles ${TITLE_MIN}-${TITLE_MAX} characters, meta descriptions ${META_MIN}-${META_MAX} characters, ` +
        `at least ${THIN_WORDS} words (${GOOD_WORDS}+ for full marks), images under ${HEAVY_IMAGE_BYTES / 1000} KB, ` +
        `main keyword under ${STUFFING_DENSITY}% of the text, posts updated within ${STALE_MONTHS} months, every page within ${DEEP_CLICKS} clicks of the homepage.`,
    ].join("\n\n");
    const prompt = `Here is an SEO audit of a blog. Write a prioritized action plan the owner can follow this week.

${fence("AUDIT", facts, 4000)}

Reply with JSON:
{"summary": "one sentence verdict (you may be lightly witty, never mean)",
 "steps": [5 objects {"title": "imperative, max 8 words", "why": "one sentence tied to the numbers above", "how": "one or two concrete sentences"}]}
Order steps by impact: critical issues and issues on many pages first.
Never claim a problem the audit doesn't list: the targets are for reference, not findings. If the audit lists fewer
than five issues, fill the remaining steps with growth ideas (new posts, internal links, refreshing top posts) and
start their "why" with "Optional:".`;
    const { data, ...meta } = await ask("short", prompt, 900, ["summary", "steps"], ctx);
    const steps = (Array.isArray(data.steps) ? data.steps : []).slice(0, 6).map((s: Record<string, unknown>) => ({
      title: cleanLine(s?.title, 120),
      why: cleanLine(s?.why, 400),
      how: cleanLine(s?.how, 500),
    }));
    const body: AiPlan = { summary: cleanLine(data.summary, 400), steps };
    return finish(body, meta, guardOutput(JSON.stringify(body), facts, [], banned));
  }

  const source = await loadPage(req.url!, ctx.signal);
  const keywordLine = req.keyword ? `Main keyword: "${req.keyword}"` : "Main keyword: choose the best one from the page.";
  const extras = [keywordLine, brandLines(req)].filter(Boolean).join("\n");

  if (req.task === "meta") {
    const prompt = `Improve this page's title tag and meta description so they earn the click in Google.

${extras}
Known issues: ${req.issues?.join("; ") || "none listed"}
Current title (${source.title.length} chars): ${source.title || "(missing)"}
Current meta description (${source.metaDescription.length} chars): ${source.metaDescription || "(missing)"}

${fence("OUTLINE", `# ${source.h1}\n${outlineText(source)}`, 1500)}
${fence("INTRO", source.intro || source.text, 2500)}

Reply with JSON:
{"assessment": "two sentences on the page's content quality and SEO effectiveness (lightly witty is fine, never mean)",
 "title": "one improved title tag, 50-60 characters, main keyword near the start",
 "metaDescription": "one improved meta description, 140-160 characters, specific and compelling",
 "fixes": ["exactly three most impactful fixes, most important first, each with a short reason"]}`;
    const { data, ...meta } = await ask("short", prompt, 700, ["assessment", "title"], ctx);
    const body = await tighten(
      {
        assessment: cleanLine(data.assessment),
        title: cleanLine(data.title, 120),
        metaDescription: cleanLine(data.metaDescription, 320),
        fixes: (Array.isArray(data.fixes) ? data.fixes : []).map((f) => cleanLine(f, 300)).filter(Boolean).slice(0, 5),
      },
      ctx,
    );
    const sourceText = `${source.title} ${source.metaDescription} ${source.h1} ${source.text}`;
    return finish(body, meta, guardOutput(`${body.title} ${body.metaDescription} ${body.fixes.join(" ")}`, sourceText, source.injection, banned));
  }

  if (req.task === "section") {
    const wanted = req.heading!.toLowerCase();
    const section = source.sections.find((s) => s.heading.toLowerCase() === wanted) ??
      source.sections.find((s) => s.heading.toLowerCase().includes(wanted) || wanted.includes(s.heading.toLowerCase()));
    if (!section || !section.text.trim()) throw new TaskError("We couldn't find that section's text on the page anymore.", 404);
    const prompt = `Rewrite one section of a blog post so it's clearer, easier to scan, and easy for AI answer engines (Google AI Overviews, ChatGPT, Perplexity) to quote.

Rules:
- Keep every fact and the original meaning. Add no facts, numbers, names or links that aren't in the section.
- Open with a one or two sentence direct answer to what the heading promises.
- Short paragraphs (three sentences at most). Use "- " bullets for lists of three or more items.
- Keep roughly the same length (within 25%). Plain text: no headings, no HTML, no markdown bold.
${extras}
Section heading: "${section.heading}"

${fence("SECTION", section.text, 6000)}

Reply with JSON: {"rewrite": "the rewritten section, paragraphs separated by blank lines"}`;
    const { data, ...meta } = await ask("long", prompt, 1500, ["rewrite"], ctx);
    const body: AiSection = {
      heading: section.heading,
      original: section.text.slice(0, 6000),
      rewrite: String(data.rewrite ?? "").replace(/<[^>]+>/g, "").trim().slice(0, 9000),
    };
    return finish(body, meta, guardOutput(body.rewrite, section.text, source.injection, banned));
  }

  if (req.task === "headings") {
    const prompt = `Suggest better subheadings (H2/H3) for this blog post.

Goals: match how people search (make some question-style, e.g. "How do I…?" or "What is…?"), use the main keyword naturally in one or two, stay accurate to each section, max 70 characters each.
Only include headings worth changing (at most 10). Never change the H1.
${extras}

${fence("OUTLINE", outlineText(source), 3000)}
${fence("INTRO", source.intro, 1200)}

Reply with JSON: {"items": [{"before": "the exact current heading", "after": "the better heading", "why": "one short reason"}]}`;
    const { data, ...meta } = await ask("short", prompt, 900, ["items"], ctx);
    const existing = new Map(source.outline.filter((h) => h.level > 1).map((h) => [h.text.toLowerCase(), h.text]));
    const items = (Array.isArray(data.items) ? data.items : [])
      .map((item: Record<string, unknown>) => ({
        before: existing.get(cleanLine(item?.before, 200).toLowerCase()) ?? "",
        after: cleanLine(item?.after, 120),
        why: cleanLine(item?.why, 240),
      }))
      .filter((item) => item.before && item.after && item.after !== item.before)
      .slice(0, 10);
    const body: AiHeadings = { items };
    return finish(body, meta, guardOutput(items.map((i) => i.after).join(" "), `${outlineText(source)} ${source.text}`, source.injection, banned));
  }

  if (req.task === "faq") {
    const prompt = `Write an FAQ for this page: 4 to 6 questions people would actually search about its topic, each answered ONLY with information found on the page.

Rules: answers are 25-60 words, first sentence answers directly. Skip any question the page can't answer. No invented facts, numbers or links.
${extras}

${fence("CONTENT", `# ${source.h1}\n\n${source.text}`, 9000)}

Reply with JSON: {"items": [{"question": "…?", "answer": "…"}]}`;
    const { data, ...meta } = await ask("long", prompt, 1200, ["items"], ctx);
    const items = (Array.isArray(data.items) ? data.items : [])
      .map((item: Record<string, unknown>) => ({ question: cleanLine(item?.question, 200), answer: cleanLine(item?.answer, 700) }))
      .filter((item) => item.question && item.answer)
      .slice(0, 8);
    const jsonLd = JSON.stringify(
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
      null,
      2,
    );
    const body: AiFaq = { items, jsonLd };
    return finish(body, meta, guardOutput(items.map((i) => `${i.question} ${i.answer}`).join(" "), source.text, source.injection, banned));
  }

  // intro
  const prompt = `Write the opening paragraph for this page: 40 to 60 words that directly answer the main question the page targets, using only facts from the page.
The first sentence must answer the question outright. No fluff ("In this article…"), no invented facts.
${extras}

${fence("CONTENT", `# ${source.h1}\n\n${source.text}`, 8000)}

Reply with JSON: {"intro": "the paragraph"}`;
  const { data, ...meta } = await ask("long", prompt, 300, ["intro"], ctx);
  const body: AiIntro = { original: source.intro.split("\n\n")[0] ?? "", intro: cleanLine(data.intro, 900) };
  return finish(body, meta, guardOutput(body.intro, source.text, source.injection, banned));
}

export const TASK_LABELS: Record<AiTask, string> = {
  meta: "Title & meta description",
  section: "Section rewrite",
  headings: "Better headings",
  faq: "FAQ generator",
  intro: "Quick-answer intro",
  plan: "Action plan",
};
