import { llmsFullTxt } from "@/lib/content/llms";

/** Every guide's full text, for AI assistants to ground answers in. */
export function GET() {
  return new Response(llmsFullTxt(), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
