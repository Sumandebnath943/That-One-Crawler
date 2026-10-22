// Which automated agent a request claims to be, read from its user agent in the proxy.
//
// The visitor beacon can't do this: it's client-side JavaScript, and almost no crawler runs it.
// Kinds are per agent, not per vendor, because they mean very different things:
//   ClaudeBot         a training crawl
//   Claude-SearchBot  indexing for Claude's search: decides whether Claude can cite you
//   Claude-User       someone asked Claude a question just now, and it came here to answer
// User agents are self-declared. Search engines that publish a reverse-DNS domain are verified in
// verify.ts; everything else is "claims to be".

export type CrawlerKind =
  /** Fetched mid-conversation: a person asked an assistant, and it came here. */
  | "live"
  /** AI search indexing and AI training crawls. */
  | "ai"
  /** Classic search engines. */
  | "search"
  /** Link unfurlers building a preview card: someone shared a link. */
  | "social"
  /** Backlink and audit crawlers. */
  | "seo"
  /** Scripts, headless browsers, uptime monitors. */
  | "tool"
  /** Looked automated, or sent no user agent at all. */
  | "unknown";

export interface Crawler {
  name: string;
  vendor?: string;
  kind: CrawlerKind;
  /** Reverse-DNS domains the vendor publishes for verifying this crawler. */
  verifyDomains?: string[];
}

const GOOGLE = ["googlebot.com", "google.com", "googleusercontent.com"];

/**
 * Most specific first: the first match wins. ChatGPT-User must sit above GPTBot, Claude-SearchBot
 * above ClaudeBot and Applebot-Extended above Applebot, or the interesting signal gets relabelled
 * as routine crawling. Patterns are tested against the lowercased user agent.
 */
const RULES: { match: string | RegExp; crawler: Crawler }[] = [
  // Our own scanner, when someone audits this site with this site.
  { match: "thatonecrawler", crawler: { name: "ThatOneCrawler (our own scanner)", vendor: "That One Crawler", kind: "tool" } },

  // Live fetchers: these mean a person asked an AI about something, and it came here.
  { match: "chatgpt-user", crawler: { name: "ChatGPT-User", vendor: "OpenAI", kind: "live" } },
  { match: "claude-user", crawler: { name: "Claude-User", vendor: "Anthropic", kind: "live" } },
  { match: "perplexity-user", crawler: { name: "Perplexity-User", vendor: "Perplexity", kind: "live" } },
  { match: "mistralai-user", crawler: { name: "MistralAI-User", vendor: "Mistral", kind: "live" } },
  { match: "meta-externalfetcher", crawler: { name: "Meta-ExternalFetcher", vendor: "Meta", kind: "live" } },
  { match: "duckassistbot", crawler: { name: "DuckAssistBot", vendor: "DuckDuckGo", kind: "live" } },
  { match: "google-notebooklm", crawler: { name: "Google-NotebookLM", vendor: "Google", kind: "live" } },
  { match: "manus-user", crawler: { name: "Manus-User", vendor: "Manus", kind: "live" } },

  // AI search indexing and training.
  { match: "oai-searchbot", crawler: { name: "OAI-SearchBot", vendor: "OpenAI", kind: "ai" } },
  { match: "claude-searchbot", crawler: { name: "Claude-SearchBot", vendor: "Anthropic", kind: "ai" } },
  { match: "perplexitybot", crawler: { name: "PerplexityBot", vendor: "Perplexity", kind: "ai" } },
  { match: "applebot-extended", crawler: { name: "Applebot-Extended", vendor: "Apple", kind: "ai" } },
  { match: "google-extended", crawler: { name: "Google-Extended", vendor: "Google", kind: "ai" } },
  { match: "gptbot", crawler: { name: "GPTBot", vendor: "OpenAI", kind: "ai" } },
  { match: "claudebot", crawler: { name: "ClaudeBot", vendor: "Anthropic", kind: "ai" } },
  { match: /claude-web|anthropic-ai/, crawler: { name: "Anthropic (legacy agent)", vendor: "Anthropic", kind: "ai" } },
  { match: "ccbot", crawler: { name: "CCBot", vendor: "Common Crawl", kind: "ai" } },
  { match: "bytespider", crawler: { name: "Bytespider", vendor: "ByteDance", kind: "ai" } },
  { match: "meta-externalagent", crawler: { name: "Meta-ExternalAgent", vendor: "Meta", kind: "ai" } },
  { match: "amazonbot", crawler: { name: "Amazonbot", vendor: "Amazon", kind: "ai" } },
  { match: "youbot", crawler: { name: "YouBot", vendor: "You.com", kind: "ai" } },
  { match: /cohere-ai|cohere-training-data-crawler/, crawler: { name: "cohere-ai", vendor: "Cohere", kind: "ai" } },
  { match: "ai2bot", crawler: { name: "AI2Bot", vendor: "Allen Institute", kind: "ai" } },
  { match: "mistralai", crawler: { name: "MistralAI", vendor: "Mistral", kind: "ai" } },
  { match: "pangubot", crawler: { name: "PanGuBot", vendor: "Huawei", kind: "ai" } },
  { match: "diffbot", crawler: { name: "Diffbot", vendor: "Diffbot", kind: "ai" } },
  { match: "timpibot", crawler: { name: "Timpibot", vendor: "Timpi", kind: "ai" } },
  { match: "kagibot", crawler: { name: "Kagibot", vendor: "Kagi", kind: "ai" } },
  { match: /\bgrok\b|\bxai[-\s]?bot\b/, crawler: { name: "xAI / Grok (unconfirmed)", vendor: "xAI", kind: "ai" } },
  { match: /bravebot|brave[-\s]?search/, crawler: { name: "Brave Search (unconfirmed)", vendor: "Brave", kind: "ai" } },

  // Search engines.
  { match: "google-inspectiontool", crawler: { name: "Google Search Console", vendor: "Google", kind: "search", verifyDomains: GOOGLE } },
  { match: "googleother", crawler: { name: "GoogleOther", vendor: "Google", kind: "search", verifyDomains: GOOGLE } },
  { match: "storebot-google", crawler: { name: "Storebot-Google", vendor: "Google", kind: "search", verifyDomains: GOOGLE } },
  { match: "googlebot-image", crawler: { name: "Googlebot-Image", vendor: "Google", kind: "search", verifyDomains: GOOGLE } },
  { match: "googlebot", crawler: { name: "Googlebot", vendor: "Google", kind: "search", verifyDomains: GOOGLE } },
  { match: /bingbot|bingpreview|microsoftpreview|adidxbot/, crawler: { name: "Bingbot", vendor: "Microsoft", kind: "search", verifyDomains: ["search.msn.com"] } },
  { match: "duckduckbot", crawler: { name: "DuckDuckBot", vendor: "DuckDuckGo", kind: "search" } },
  { match: "applebot", crawler: { name: "Applebot", vendor: "Apple", kind: "search", verifyDomains: ["applebot.apple.com"] } },
  { match: "yandex", crawler: { name: "YandexBot", vendor: "Yandex", kind: "search", verifyDomains: ["yandex.ru", "yandex.net", "yandex.com"] } },
  { match: "baiduspider", crawler: { name: "Baiduspider", vendor: "Baidu", kind: "search", verifyDomains: ["baidu.com", "baidu.jp"] } },
  { match: "seznambot", crawler: { name: "SeznamBot", vendor: "Seznam", kind: "search" } },
  { match: /naver|yeti\//, crawler: { name: "Yeti", vendor: "Naver", kind: "search" } },
  { match: "mojeekbot", crawler: { name: "MojeekBot", vendor: "Mojeek", kind: "search" } },
  { match: "qwantbot", crawler: { name: "Qwantbot", vendor: "Qwant", kind: "search" } },

  // Link unfurlers: someone pasted a link to this site somewhere.
  { match: "linkedinbot", crawler: { name: "LinkedInBot", vendor: "LinkedIn", kind: "social" } },
  { match: /slackbot|slack-imgproxy/, crawler: { name: "Slackbot", vendor: "Slack", kind: "social" } },
  { match: "whatsapp", crawler: { name: "WhatsApp", vendor: "Meta", kind: "social" } },
  { match: "telegrambot", crawler: { name: "TelegramBot", vendor: "Telegram", kind: "social" } },
  { match: "twitterbot", crawler: { name: "Twitterbot", vendor: "X", kind: "social" } },
  { match: /facebookexternalhit|facebookcatalog/, crawler: { name: "facebookexternalhit", vendor: "Meta", kind: "social" } },
  { match: "discordbot", crawler: { name: "Discordbot", vendor: "Discord", kind: "social" } },
  { match: "redditbot", crawler: { name: "redditbot", vendor: "Reddit", kind: "social" } },
  { match: /bluesky|cardyb/, crawler: { name: "Bluesky", vendor: "Bluesky", kind: "social" } },
  { match: "mastodon", crawler: { name: "Mastodon", vendor: "Mastodon", kind: "social" } },
  { match: "pinterestbot", crawler: { name: "Pinterestbot", vendor: "Pinterest", kind: "social" } },
  { match: "skypeuripreview", crawler: { name: "Skype / Teams preview", vendor: "Microsoft", kind: "social" } },

  // SEO and audit crawlers.
  { match: "ahrefsbot", crawler: { name: "AhrefsBot", vendor: "Ahrefs", kind: "seo" } },
  { match: /semrushbot|siteauditbot/, crawler: { name: "SemrushBot", vendor: "Semrush", kind: "seo" } },
  { match: /mj12bot|dotbot|petalbot|blexbot|seokicks|dataforseobot|serpstatbot|barkrowler/, crawler: { name: "SEO crawler", kind: "seo" } },
  { match: /screaming frog|lighthouse|chrome-lighthouse|pagespeed|gtmetrix/, crawler: { name: "Site auditor", kind: "seo" } },

  // Tooling.
  { match: /headlesschrome|headless|puppeteer|playwright|phantom|selenium|webdriver/, crawler: { name: "Headless browser", kind: "tool" } },
  { match: /curl|wget|python-requests|python-urllib|httpx|aiohttp|go-http|node-fetch|undici|axios|okhttp|libwww|java\/|scrapy/, crawler: { name: "Script", kind: "tool" } },
  { match: /pingdom|uptimerobot|statuscake|betteruptime|newrelicpinger|vercel-screenshot|vercelbot/, crawler: { name: "Uptime monitor", kind: "tool" } },
];

/** Anything that describes itself as automated but isn't named above. */
const GENERIC = /bot\b|crawler|crawl|spider|slurp|scraper|scrape|preview|fetcher|monitor|validator/;

/** What this request claims to be, or null when it looks like a real browser. */
export function identifyCrawler(userAgent: string | null): Crawler | null {
  if (!userAgent) return { name: "Unknown (no user agent)", kind: "unknown" };
  const ua = userAgent.toLowerCase();
  for (const { match, crawler } of RULES) {
    if (typeof match === "string" ? ua.includes(match) : match.test(ua)) return crawler;
  }
  if (GENERIC.test(ua)) return { name: "Unidentified crawler", kind: "unknown" };
  return null;
}

/** Agents that matter for AI search and AI answers: the ones kept when bot alerts are set to "AI only". */
export function isAiAgent(crawler: Crawler): boolean {
  return crawler.kind === "live" || crawler.kind === "ai";
}
