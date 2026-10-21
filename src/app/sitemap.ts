import type { MetadataRoute } from "next";
import { GUIDES } from "@/lib/content/guides";
import { CONTENT_UPDATED } from "@/lib/content/structured-data";
import { TOOLS } from "@/lib/content/tools";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(`${CONTENT_UPDATED}T00:00:00Z`);
  const entry = (path: string, priority: number, changeFrequency: "weekly" | "monthly" = "monthly") => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
    lastModified,
    changeFrequency,
    priority,
  });
  return [
    entry("/", 1, "weekly"),
    ...TOOLS.map((tool) => entry(`/${tool.slug}`, 0.9)),
    entry("/blog-seo-checklist", 0.8),
    entry("/checks", 0.8),
    ...GUIDES.map((guide) => entry(`/checks/${guide.slug}`, 0.6)),
    entry("/bot", 0.3),
  ];
}
