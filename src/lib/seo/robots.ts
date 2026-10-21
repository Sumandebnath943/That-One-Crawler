import type { RobotsRules } from "./types";

export const CRAWLER_TOKEN = "thatonecrawler";

export interface ParsedRobots {
  sitemaps: string[];
  rules: RobotsRules;
  /** True when the rules come from a group naming ThatOneCrawler (an explicit opt-out we obey). */
  ownGroup: boolean;
}

interface Group {
  agents: string[];
  allow: string[];
  disallow: string[];
}

/**
 * Parse robots.txt. Returns every Sitemap: line plus the allow/disallow rules
 * that apply to us (our own user-agent group if present, otherwise "*").
 */
export function parseRobots(text: string, token = CRAWLER_TOKEN): ParsedRobots {
  const sitemaps: string[] = [];
  const groups: Group[] = [];
  let current: Group | null = null;
  let lastWasAgent = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const field = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();

    if (field === "sitemap") {
      if (value) sitemaps.push(value);
      continue;
    }
    if (field === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], allow: [], disallow: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (field === "allow" && value) current.allow.push(value);
    if (field === "disallow" && value) current.disallow.push(value);
  }

  const ours = groups.filter((g) => g.agents.some((a) => a && a !== "*" && token.includes(a)));
  const chosen = ours.length ? ours : groups.filter((g) => g.agents.includes("*"));

  return {
    sitemaps: [...new Set(sitemaps)],
    rules: {
      allow: chosen.flatMap((g) => g.allow),
      disallow: chosen.flatMap((g) => g.disallow),
    },
    ownGroup: ours.length > 0,
  };
}

function patternToRegex(pattern: string): RegExp {
  const anchored = pattern.endsWith("$");
  const body = (anchored ? pattern.slice(0, -1) : pattern)
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${body}${anchored ? "$" : ""}`);
}

/** Google-style matching: the longest matching rule wins, Allow wins ties. */
export function isAllowedByRobots(rules: RobotsRules | null | undefined, path: string): boolean {
  if (!rules || (!rules.allow.length && !rules.disallow.length)) return true;
  let best = -1;
  let allowed = true;
  for (const pattern of rules.disallow) {
    if (pattern.length > best && patternToRegex(pattern).test(path)) {
      best = pattern.length;
      allowed = false;
    }
  }
  for (const pattern of rules.allow) {
    if (pattern.length >= best && patternToRegex(pattern).test(path)) {
      best = pattern.length;
      allowed = true;
    }
  }
  return allowed;
}
