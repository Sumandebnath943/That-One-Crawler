import { aiConfig, sanitizeAiInput, suggestFixes } from "@/lib/server/ai";
import { jsonError, readJson } from "@/lib/server/http";

export const maxDuration = 60;

export async function POST(request: Request) {
  if (!aiConfig()) {
    return jsonError("AI suggestions aren't set up on this deployment (add GROQ_API_KEY or GEMINI_API_KEY).", 404);
  }

  const body = await readJson(request);
  const page = sanitizeAiInput(body?.page);
  if (!page) return jsonError("Send a page with at least a URL.", 400);

  try {
    return Response.json(await suggestFixes(page, request.signal));
  } catch (err) {
    console.error("AI analysis failed", err);
    const message = err instanceof Error && err.name !== "TimeoutError" ? err.message : "The AI took too long to answer.";
    return jsonError(message, 502);
  }
}
