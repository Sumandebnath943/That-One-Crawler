import { GUIDES } from "./guides";
import { TOOLS } from "./tools";

// Every public page on the site, in one list: the sitemap, the Markdown twins and the crawler
// alerts all read it, so a new page only has to be added here (and to the sitemap's priorities).

export const TRUST_PAGES = ["/about", "/contact", "/privacy"] as const;

/** Content pages: indexable, in the sitemap, and each with a Markdown twin. */
export const CONTENT_PATHS: string[] = [
  "/",
  ...TOOLS.map((t) => `/${t.slug}`),
  "/blog-seo-checklist",
  "/checks",
  ...GUIDES.map((g) => `/checks/${g.slug}`),
  "/bot",
  ...TRUST_PAGES,
];

const CONTENT = new Set(CONTENT_PATHS);

/** Pages that exist but aren't content (the scan workspace). */
const APP_PATHS = new Set(["/scan"]);

/** Files served from routes rather than pages. */
const FILE_PATHS = new Set(["/llms.txt", "/llms-full.txt", "/robots.txt", "/sitemap.xml", "/manifest.webmanifest", "/index.md"]);

export const isContentPath = (path: string) => CONTENT.has(path);

/** Does this path resolve to something real on the site? (Assets aside.) */
export function isKnownPath(path: string): boolean {
  const bare = path.length > 1 ? path.replace(/\/$/, "") : path;
  if (CONTENT.has(bare) || APP_PATHS.has(bare) || FILE_PATHS.has(bare)) return true;
  // Markdown twins: /checks/title-tag-length.md
  return bare.endsWith(".md") && CONTENT.has(bare.slice(0, -3));
}
