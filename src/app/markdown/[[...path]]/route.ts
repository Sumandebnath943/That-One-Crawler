import { markdownFor } from "@/lib/content/markdown";
import { CONTENT_PATHS } from "@/lib/content/routes";
import { GA_ID, SITE_URL } from "@/lib/site";

// Markdown twins of every content page. Never linked directly: the proxy rewrites /page.md,
// /index.md and `Accept: text/markdown` requests here (and 404s anyone who finds this path).

export function generateStaticParams() {
  return CONTENT_PATHS.map((path) => ({ path: path === "/" ? [] : path.slice(1).split("/") }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path } = await params;
  const page = path?.length ? `/${path.join("/")}` : "/";
  const markdown = markdownFor(page, { analytics: Boolean(GA_ID) });
  const headers = {
    "Content-Type": "text/markdown; charset=utf-8",
    // The same URL can answer HTML or Markdown, so caches must keep them apart.
    Vary: "Accept",
    "X-Content-Type-Options": "nosniff",
  };
  if (!markdown) {
    return new Response(`# Not found\n\nThis page has no Markdown version. Every page that has one is listed at ${SITE_URL}/llms.txt\n`, {
      status: 404,
      headers,
    });
  }
  // The HTML page is the canonical one; this is a lighter copy of it for agents.
  const canonical = `${SITE_URL}${page === "/" ? "" : page}`;
  return new Response(markdown, { headers: { ...headers, Link: `<${canonical}>; rel="canonical"` } });
}
