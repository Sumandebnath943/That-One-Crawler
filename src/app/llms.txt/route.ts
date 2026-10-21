import { llmsTxt } from "@/lib/content/llms";

/** Plain-markdown site map for AI assistants (https://llmstxt.org). */
export function GET() {
  return new Response(llmsTxt(), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
