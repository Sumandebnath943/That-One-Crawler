// Thin clients for the two free-tier LLM providers. Both are asked for JSON.

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export type ProviderName = "Groq" | "Gemini";

export interface LlmCall {
  system: string;
  prompt: string;
  maxTokens: number;
}

/** An error from a provider; `retryable` means another provider (or a later try) may succeed. */
export class ProviderError extends Error {
  status: number;
  retryable: boolean;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.retryable = status === 0 || status === 408 || status === 429 || status >= 500;
  }
}

async function readError(res: Response, provider: ProviderName): Promise<ProviderError> {
  const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
  const message = data.error?.message?.split("\n")[0] || `${provider} answered ${res.status}`;
  return new ProviderError(message, res.status);
}

function networkError(err: unknown, provider: ProviderName): ProviderError {
  if (err instanceof ProviderError) return err;
  const timeout = err instanceof Error && err.name === "TimeoutError";
  if (err instanceof Error && err.name === "AbortError") throw err;
  return new ProviderError(timeout ? `${provider} took too long to answer` : `${provider} couldn't be reached`, 0);
}

/** gpt-oss models think before answering, and those tokens count against max_tokens. */
const isReasoningModel = (model: string) => /gpt-oss/i.test(model);

export async function callGroq(key: string, model: string, call: LlmCall, signal: AbortSignal): Promise<string> {
  const reasoning = isReasoningModel(model);
  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      signal,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_tokens: reasoning ? call.maxTokens + 1024 : call.maxTokens,
        ...(reasoning ? { reasoning_effort: "low" } : {}),
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: call.system },
          { role: "user", content: call.prompt },
        ],
      }),
    });
    if (!res.ok) throw await readError(res, "Groq");
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content ?? "";
  } catch (err) {
    throw networkError(err, "Groq");
  }
}

export interface GeminiResponse {
  candidates?: { finishReason?: string; content?: { parts?: { text?: string; thought?: boolean }[] } }[];
}

/** The answer text from a Gemini response, skipping any thought-summary parts. */
export function geminiText(data: GeminiResponse): string {
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  return parts
    .filter((part) => !part.thought)
    .map((part) => part.text ?? "")
    .join("");
}

export async function callGemini(key: string, model: string, call: LlmCall, signal: AbortSignal): Promise<string> {
  try {
    const res = await fetch(`${GEMINI_URL}/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      signal,
      // Key goes in a header, not the URL, so it never shows up in logs.
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: call.system }] },
        contents: [{ role: "user", parts: [{ text: call.prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          // Thinking tokens count against this limit, so leave plenty of room.
          maxOutputTokens: Math.max(2048, call.maxTokens * 3),
        },
      }),
    });
    if (!res.ok) throw await readError(res, "Gemini");
    return geminiText((await res.json()) as GeminiResponse);
  } catch (err) {
    throw networkError(err, "Gemini");
  }
}
