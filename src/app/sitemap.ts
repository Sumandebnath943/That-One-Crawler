import type { MetadataRoute } from "next";
import { CONTENT_PATHS } from "@/lib/content/routes";
import { CONTENT_UPDATED } from "@/lib/content/structured-data";
import { TOOLS } from "@/lib/content/tools";
import { SITE_URL } from "@/lib/site";

const TOOL_PATHS = new Set(TOOLS.map((t) => `/${t.slug}`));

function priority(path: string): number {
  if (path === "/") return 1;
  if (TOOL_PATHS.has(path)) return 0.9;
  if (path === "/blog-seo-checklist" || path === "/checks") return 0.8;
  if (path.startsWith("/checks/")) return 0.6;
  if (path === "/about") return 0.5;
  return 0.3;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(`${CONTENT_UPDATED}T00:00:00Z`);
  return CONTENT_PATHS.map((path) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
    lastModified,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: priority(path),
  }));
}
