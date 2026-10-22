// Human or bot, and why. No single signal decides it, so this scores several independent ones and
// shows its working: in a Telegram message about one visitor, the reasons matter as much as the number.
// 0 = certainly automated, 100 = behaves like a person.

import type { Geo } from "./geo";
import type { BeaconPayload } from "./payload";

const AUTOMATION_UA =
  /(bot\b|crawl|spider|slurp|scrape|fetch|monitor|preview|headless|phantom|puppeteer|playwright|selenium|webdriver|python-requests|httpx|aiohttp|curl|wget|axios|node-fetch|undici|go-http|java\/|okhttp|libwww|lighthouse|pingdom|uptime|semrush|ahrefs|mj12|dotbot|petal|bytespider|gptbot|claudebot|ccbot|perplexity|thatonecrawler)/i;

/** Crawlers that run JavaScript (Googlebot renders pages) can fire the beacon too. They're reported by the proxy instead. */
const DECLARED_CRAWLER =
  /(googlebot|google-inspectiontool|bingbot|duckduckbot|yandex|baiduspider|applebot|facebookexternalhit|twitterbot|linkedinbot|slackbot|telegrambot|discordbot|whatsapp|gptbot|oai-searchbot|chatgpt-user|claudebot|claude-user|claude-searchbot|ccbot|perplexitybot|perplexity-user|thatonecrawler)/i;

export type VerdictLabel = "Human" | "Likely human" | "Uncertain" | "Likely bot" | "Bot";

export interface Verdict {
  score: number;
  label: VerdictLabel;
  crawler?: string;
  reasons: string[];
}

/** Below this, a visit counts as a bot (and is muted when bot alerts are off). */
export const BOT_THRESHOLD = 40;

export function labelFor(score: number): VerdictLabel {
  return score >= 80 ? "Human" : score >= 62 ? "Likely human" : score >= BOT_THRESHOLD ? "Uncertain" : score >= 20 ? "Likely bot" : "Bot";
}

export function judge(payload: BeaconPayload, geo: Pick<Geo, "datacenter" | "isp">, ua: string, acceptLanguage: string | null): Verdict {
  const crawler = ua.match(DECLARED_CRAWLER)?.[0];
  if (crawler) return { score: 2, label: "Bot", crawler, reasons: [`declared crawler (${crawler})`] };

  const s = payload.signals;
  const human: string[] = [];
  const bot: string[] = [];
  // The arrival fires about a second after load, before anyone could move a mouse. Penalizing
  // missing behavior then would mark every real visitor "Uncertain", so behavior only counts
  // against a visit at its end.
  const final = payload.kind === "end";
  let score = 52;

  if (AUTOMATION_UA.test(ua)) {
    score -= 45;
    bot.push("automation in user agent");
  }
  if (s.webdriver) {
    score -= 40;
    bot.push("navigator.webdriver");
  }
  if (!ua) {
    score -= 20;
    bot.push("no user agent");
  }
  if (!acceptLanguage) {
    score -= 12;
    bot.push("no Accept-Language");
  }
  if (s.languages === 0) {
    score -= 10;
    bot.push("no browser languages");
  }
  if (!payload.device.screenW || !payload.device.screenH) {
    score -= 15;
    bot.push("no screen size");
  }
  if (geo.datacenter) {
    score -= 22;
    bot.push(`datacenter network${geo.isp ? ` (${geo.isp})` : ""}`);
  }
  // A real browser fills in the timezone, but headless Chrome on a server usually reports UTC.
  if (s.timezone === "UTC" || s.timezone === "Etc/UTC") {
    score -= 6;
    bot.push("UTC timezone");
  }

  // Does this look like a real browser at all? Available immediately, so arrivals are judged on it.
  if (s.languages > 0) score += 6;
  if (s.plugins > 0) score += 5;
  if (s.hardwareConcurrency > 0 && s.deviceMemory > 0) score += 6;
  if (payload.device.screenW > 0 && payload.device.screenH > 0) score += 6;
  if (s.timezone && s.timezone !== "UTC") score += 4;
  if (s.cookiesEnabled) score += 4;

  // Interaction: the strongest evidence of a person.
  if (s.pointerMoves > 12) {
    score += 18;
    human.push("mouse movement");
  } else if (final && s.pointerMoves === 0 && !s.touchSupport) {
    score -= 18;
    bot.push("no pointer movement");
  }
  if (s.touches > 0) {
    score += 14;
    human.push("touch input");
  }
  if (s.clicks > 0) {
    score += 10;
    human.push(`${s.clicks} click${s.clicks === 1 ? "" : "s"}`);
  }
  if (s.keys > 0) {
    score += 8;
    human.push("typing");
  }
  if (s.visibilityChanges > 0) {
    score += 5;
    human.push("tab switching");
  }
  if (payload.activity.length) {
    score += 8;
    human.push("used the tools");
  }

  if (payload.scroll.events > 4 && payload.scroll.maxPct > 15) {
    score += 12;
    human.push("progressive scrolling");
  }
  // Reaching the bottom in one or two scroll events is a script.
  if (final && payload.scroll.maxPct >= 95 && payload.scroll.events <= 2 && payload.pages.length <= 1) {
    score -= 20;
    bot.push("jumped to the bottom");
  }

  if (payload.activeMs > 8_000) {
    score += 12;
    human.push("stayed a while");
  } else if (final && payload.sessionMs > 0 && payload.sessionMs < 1_200) {
    score -= 12;
    bot.push("left almost immediately");
  }
  if (s.firstActionMs !== null && s.firstActionMs < 250) {
    score -= 18;
    bot.push("acted within 250ms of load");
  }
  if (s.hardwareConcurrency === 0 && s.deviceMemory === 0) {
    score -= 6;
    bot.push("no hardware hints");
  }
  if (!s.cookiesEnabled) {
    score -= 8;
    bot.push("cookies disabled");
  }

  score = Math.max(0, Math.min(100, score));
  // Lead with whichever side carried the decision.
  const reasons = score >= 62 ? [...human, ...bot] : [...bot, ...human];
  return { score, label: labelFor(score), reasons: reasons.slice(0, 6) };
}

/** Rough browser and OS from the user agent, for the alert only. */
export function describeClient(ua: string): string {
  if (!ua) return "unknown client";
  const browser = /edg\//i.test(ua)
    ? "Edge"
    : /opr\/|opera/i.test(ua)
      ? "Opera"
      : /samsungbrowser/i.test(ua)
        ? "Samsung Internet"
        : /firefox|fxios/i.test(ua)
          ? "Firefox"
          : /chrome|crios/i.test(ua)
            ? "Chrome"
            : /safari/i.test(ua)
              ? "Safari"
              : "unknown browser";
  const os = /windows nt/i.test(ua)
    ? "Windows"
    : /iphone|ipad|ipod/i.test(ua)
      ? "iOS"
      : /android/i.test(ua)
        ? "Android"
        : /cros/i.test(ua)
          ? "ChromeOS"
          : /mac os x/i.test(ua)
            ? "macOS"
            : /linux/i.test(ua)
              ? "Linux"
              : "unknown OS";
  const version = ua.match(/(?:edg|firefox|fxios|crios|chrome|version)\/(\d+)/i)?.[1];
  return `${browser}${version ? ` ${version}` : ""} · ${os}`;
}

const AI_REFERRERS: [RegExp, string][] = [
  [/(^|\.)chatgpt\.com$|(^|\.)chat\.openai\.com$/, "ChatGPT"],
  [/(^|\.)perplexity\.ai$/, "Perplexity"],
  [/(^|\.)claude\.ai$/, "Claude"],
  [/^gemini\.google\.com$|^bard\.google\.com$/, "Gemini"],
  [/(^|\.)copilot\.microsoft\.com$/, "Microsoft Copilot"],
  [/(^|\.)you\.com$/, "You.com"],
  [/(^|\.)phind\.com$/, "Phind"],
  [/(^|\.)deepseek\.com$/, "DeepSeek"],
  [/(^|\.)grok\.com$/, "Grok"],
  [/(^|\.)meta\.ai$/, "Meta AI"],
  [/(^|\.)mistral\.ai$/, "Le Chat"],
];
const SEARCH_REFERRERS: [RegExp, string][] = [
  [/(^|\.)google\.[a-z.]+$/, "Google"],
  [/(^|\.)bing\.com$/, "Bing"],
  [/(^|\.)duckduckgo\.com$/, "DuckDuckGo"],
  [/(^|\.)search\.brave\.com$/, "Brave Search"],
  [/(^|\.)yahoo\.com$/, "Yahoo"],
  [/(^|\.)yandex\.[a-z]+$/, "Yandex"],
  [/(^|\.)ecosia\.org$/, "Ecosia"],
  [/(^|\.)baidu\.com$/, "Baidu"],
];
const SOCIAL_REFERRERS: [RegExp, string][] = [
  [/(^|\.)(twitter\.com|x\.com|t\.co)$/, "X"],
  [/(^|\.)linkedin\.com$|^lnkd\.in$/, "LinkedIn"],
  [/(^|\.)reddit\.com$/, "Reddit"],
  [/(^|\.)facebook\.com$|^l\.facebook\.com$/, "Facebook"],
  [/(^|\.)news\.ycombinator\.com$/, "Hacker News"],
  [/(^|\.)github\.com$/, "GitHub"],
  [/(^|\.)bsky\.app$/, "Bluesky"],
  [/(^|\.)dev\.to$/, "DEV"],
  [/(^|\.)medium\.com$/, "Medium"],
  [/(^|\.)youtube\.com$/, "YouTube"],
];

export interface Source {
  kind: "ai" | "search" | "social" | "site" | "direct";
  name: string;
}

/**
 * Where the visit came from. AI assistants matter most here: ChatGPT and friends add
 * utm_source to the links they cite, and that's the clearest sign an AI answer sent someone.
 */
export function trafficSource(referrer: string | undefined, landingPath: string, ownHost?: string): Source {
  const utm = (() => {
    try {
      return new URL(landingPath, "https://x.invalid").searchParams.get("utm_source")?.toLowerCase() ?? "";
    } catch {
      return "";
    }
  })();
  const host = (() => {
    try {
      return referrer ? new URL(referrer).hostname.toLowerCase().replace(/^www\./, "") : "";
    } catch {
      return "";
    }
  })();
  for (const candidate of [utm, host]) {
    if (!candidate) continue;
    const ai = AI_REFERRERS.find(([re]) => re.test(candidate));
    if (ai) return { kind: "ai", name: ai[1] };
  }
  if (host && ownHost && host === ownHost.replace(/^www\./, "")) return { kind: "direct", name: "an earlier page on this site" };
  const search = host && SEARCH_REFERRERS.find(([re]) => re.test(host));
  if (search) return { kind: "search", name: search[1] };
  const social = host && SOCIAL_REFERRERS.find(([re]) => re.test(host));
  if (social) return { kind: "social", name: social[1] };
  if (host) return { kind: "site", name: host };
  if (utm) return { kind: "site", name: `utm_source=${utm}` };
  return { kind: "direct", name: "direct / no referrer" };
}
