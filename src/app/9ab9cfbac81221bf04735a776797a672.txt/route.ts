import { INDEXNOW_KEY } from "@/lib/site";

/** IndexNow key file (https://www.indexnow.org): proves the URLs we submit to Bing and friends are ours. */
export function GET() {
  return new Response(INDEXNOW_KEY, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
