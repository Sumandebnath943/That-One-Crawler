import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Everyone's welcome, AI crawlers included: we want to be read, quoted and linked. Named groups
// make that explicit for the agents that look for their own name. Only the API is off limits
// (and the internal Markdown route, which agents reach as /page.md instead).
const AI_AGENTS = [
  // Fetching for a person, right now
  "ChatGPT-User",
  "Claude-User",
  "Perplexity-User",
  "MistralAI-User",
  "DuckAssistBot",
  "Meta-ExternalFetcher",
  // AI search indexes
  "OAI-SearchBot",
  "Claude-SearchBot",
  "PerplexityBot",
  "Applebot",
  "Amazonbot",
  "YouBot",
  // AI training and grounding: being in the models is how a tool gets recommended
  "GPTBot",
  "ClaudeBot",
  "Google-Extended",
  "Applebot-Extended",
  "Meta-ExternalAgent",
  "CCBot",
  "cohere-ai",
];

const DISALLOW = ["/api/", "/markdown/"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      { userAgent: ["Googlebot", "Bingbot"], allow: "/", disallow: DISALLOW },
      { userAgent: AI_AGENTS, allow: "/", disallow: DISALLOW },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
