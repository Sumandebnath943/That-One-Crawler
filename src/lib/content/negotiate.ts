import { isContentPath } from "./routes";

// Markdown for agents. Every content page has a Markdown twin, reachable three ways:
//   /index.md                       the homepage
//   /checks/title-tag-length.md     any page plus .md
//   Accept: text/markdown           the page's own URL, when the client prefers Markdown
// The proxy rewrites all three to one internal route, which renders the twin.

export const MARKDOWN_ROUTE = "/markdown";

/** The page's Markdown twin URL, for <link rel="alternate"> and llms.txt. */
export function markdownUrl(path: string): string {
  return path === "/" ? "/index.md" : `${path.replace(/\/$/, "")}.md`;
}

/** q-value of the best Accept entry matching a type ("text/markdown", "text/*", "*\/*"). */
function quality(accept: string, type: string): number {
  const [major] = type.split("/");
  let best = -1;
  let specificity = -1;
  for (const part of accept.toLowerCase().split(",")) {
    const [range, ...params] = part.trim().split(";");
    const q = Number(params.map((p) => p.trim()).find((p) => p.startsWith("q="))?.slice(2) ?? 1);
    const rank = range === type ? 2 : range === `${major}/*` ? 1 : range === "*/*" ? 0 : -1;
    if (rank > specificity || (rank === specificity && rank >= 0 && q > best)) {
      specificity = rank;
      best = Number.isFinite(q) ? q : 1;
    }
  }
  return specificity < 0 ? 0 : best;
}

/** True when the client asks for Markdown by name and likes it at least as much as HTML. */
export function prefersMarkdown(accept: string | null): boolean {
  if (!accept || !/markdown/i.test(accept)) return false;
  const md = Math.max(quality(accept, "text/markdown"), quality(accept, "text/x-markdown"));
  return md > 0 && md >= quality(accept, "text/html");
}

/** Where the proxy should send this request for Markdown, or null to serve the page as usual. */
export function markdownTarget(pathname: string, accept: string | null): string | null {
  if (pathname === "/index.md") return MARKDOWN_ROUTE;
  if (pathname.endsWith(".md")) {
    const page = pathname.slice(0, -3);
    return page && page !== "/" && isContentPath(page) ? `${MARKDOWN_ROUTE}${page}` : null;
  }
  const page = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  if (isContentPath(page) && prefersMarkdown(accept)) return page === "/" ? MARKDOWN_ROUTE : `${MARKDOWN_ROUTE}${page}`;
  return null;
}
