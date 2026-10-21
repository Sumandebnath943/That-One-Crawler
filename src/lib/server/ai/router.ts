import { callGemini, callGroq, ProviderError, type LlmCall, type ProviderName } from "./providers";

const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";
// A second Groq model has its own free-tier rate limit, so it can answer when the first is busy.
const BACKUP_GROQ_MODEL = "openai/gpt-oss-20b";
// Stable, free-tier, minimal thinking by default: quick and cheap for short rewrites.
const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";
// Every attempt has to fit inside the route's maxDuration, after the page has been re-read.
const TOTAL_BUDGET_MS = 70_000;

/** Short jobs (titles, headings, plans) suit Groq's speed; long ones (reading a page) suit Gemini's bigger budget. */
export type JobSize = "short" | "long";

export interface ProviderChoice {
  provider: ProviderName;
  key: string;
  model: string;
}

export function geminiModel(): string {
  return process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
}

function configured(): { groq: ProviderChoice[]; gemini: ProviderChoice[] } {
  const groqKey = process.env.GROQ_API_KEY || "";
  // GEMINI_KEY is what Crawl Daddy called it.
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_KEY || "";
  // A GROQ_MODEL override goes first, but the defaults stay behind it in case that model is retired.
  const groqModels = [...new Set([process.env.GROQ_MODEL?.trim(), DEFAULT_GROQ_MODEL, BACKUP_GROQ_MODEL].filter(Boolean))] as string[];
  return {
    groq: groqKey ? groqModels.map((model) => ({ provider: "Groq" as const, key: groqKey, model })) : [],
    gemini: geminiKey ? [{ provider: "Gemini", key: geminiKey, model: geminiModel() }] : [],
  };
}

export function aiConfigured(): boolean {
  const { groq, gemini } = configured();
  return groq.length + gemini.length > 0;
}

/**
 * Which providers and models to try, in order. A visitor's own Gemini key is used on its own (we
 * never spend our quota on their behalf). AI_PROVIDER=gemini|groq forces a first choice.
 */
export function providersFor(size: JobSize, userGeminiKey?: string): ProviderChoice[] {
  if (userGeminiKey) return [{ provider: "Gemini", key: userGeminiKey, model: geminiModel() }];
  const { groq, gemini } = configured();
  const preferred = process.env.AI_PROVIDER?.trim().toLowerCase();
  const groqFirst = preferred === "groq" || (preferred !== "gemini" && size === "short");
  return groqFirst ? [...groq, ...gemini] : [...gemini, ...groq];
}

export interface LlmAnswer {
  text: string;
  provider: ProviderName;
  model: string;
}

/** Ask the first provider that answers. Rate limits, outages, retired models and timeouts fall through to the next. */
export async function runLlm(
  size: JobSize,
  call: LlmCall,
  opts: { userGeminiKey?: string; signal?: AbortSignal; validate?: (text: string) => boolean } = {},
): Promise<LlmAnswer> {
  const choices = providersFor(size, opts.userGeminiKey);
  if (!choices.length) throw new ProviderError("No AI provider is configured.", 500);
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  // A refused key (401/403) won't work for that provider's other models either.
  const refused = new Set<ProviderName>();
  let lastError: unknown;
  for (const choice of choices) {
    if (refused.has(choice.provider)) continue;
    const left = deadline - Date.now();
    if (left < 3_000) break;
    const timeout = AbortSignal.timeout(Math.min(size === "long" ? 35_000 : 25_000, left));
    const signal = opts.signal ? AbortSignal.any([timeout, opts.signal]) : timeout;
    try {
      const run = choice.provider === "Groq" ? callGroq : callGemini;
      const text = await run(choice.key, choice.model, call, signal);
      if (opts.validate && !opts.validate(text)) {
        lastError = new ProviderError(`${choice.provider} replied with something we couldn't read`, 502);
        continue;
      }
      return { text, provider: choice.provider, model: choice.model };
    } catch (err) {
      if (opts.signal?.aborted) throw err;
      // Never log the key: provider, model and the provider's own message are enough to debug.
      if (err instanceof ProviderError) {
        console.warn(`AI provider failed: ${choice.provider} ${choice.model} ${err.status} ${err.message}`);
        if (err.status === 401 || err.status === 403) refused.add(choice.provider);
      }
      lastError = err;
    }
  }
  if (opts.userGeminiKey && lastError instanceof ProviderError && [400, 401, 403].includes(lastError.status)) {
    throw new ProviderError(`Google rejected your Gemini key: ${lastError.message}`, 400);
  }
  // Our own keys being refused is our problem, not the visitor's: don't show them "your project was denied".
  if (!opts.userGeminiKey && lastError instanceof ProviderError && [401, 403, 404].includes(lastError.status)) {
    throw new ProviderError("The AI provider turned down our server key, so free AI actions are paused. Use your own free Gemini key to keep going", 403);
  }
  throw lastError instanceof Error ? lastError : new ProviderError("The AI didn't answer. Try again.", 502);
}
