import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { crawlerAlert } from "@/lib/beacon/crawler-alert";
import { GUIDES } from "@/lib/content/guides";
import { MARKDOWN_ROUTE, markdownTarget } from "@/lib/content/negotiate";

const SLUGS = new Set(GUIDES.map((g) => g.slug));

/**
 * Runs before every page and agent file (not assets or the API):
 *  1. Crawler and bot alerts to Telegram, sent in the background so they never slow a page.
 *  2. Markdown for agents: /page.md, /index.md and `Accept: text/markdown` get the page as Markdown.
 *     This runs before any cache, so a browser and an agent can share a URL safely.
 *  3. Unknown /checks/<slug> URLs get a real 404 status. (Streamed pages can only send a "soft"
 *     404 with noindex once rendering has started; search engines prefer the real thing.)
 */
export function proxy(request: NextRequest, event: NextFetchEvent) {
  // Telemetry must never cost a page: a throw here is swallowed, not turned into a 500.
  try {
    const alert = crawlerAlert(request);
    if (alert) event.waitUntil(alert);
  } catch {
    // Nothing useful to do, and logging on every request is its own problem.
  }

  const { pathname } = request.nextUrl;
  // The Markdown route is only reachable through the rewrite below.
  if (pathname === MARKDOWN_ROUTE || pathname.startsWith(`${MARKDOWN_ROUTE}/`)) return notFound(request);

  const markdown = markdownTarget(pathname, request.headers.get("accept"));
  if (markdown) return NextResponse.rewrite(new URL(markdown, request.url));

  if (pathname.startsWith("/checks/")) {
    const slug = pathname.split("/")[2] ?? "";
    if (!SLUGS.has(slug) || pathname.split("/").length > 3) return notFound(request);
  }
  return NextResponse.next();
}

function notFound(request: NextRequest) {
  return NextResponse.rewrite(new URL("/__not-found", request.url), { status: 404 });
}

export const config = {
  // Everything except Next's own files, the API, and icons/images (which no alert cares about).
  matcher: ["/((?!_next/|api/|favicon\\.ico|icon\\.svg|apple-icon|opengraph-image|twitter-image|manifest\\.webmanifest).*)"],
};
