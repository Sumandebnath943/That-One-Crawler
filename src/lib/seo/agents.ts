// AI agent readiness: can an assistant like ChatGPT, Claude or Perplexity reach the site, read it
// without a browser, and find its way around? These are site-level checks, run once per scan, with
// the evidence for every result. Essentials are about access; recommended checks make the site easy
// to understand; bonus signals are emerging conventions that never cost points.

export type AgentTier = "essential" | "recommended" | "bonus";
export type AgentResult = "pass" | "partial" | "fail" | "na";

export type AgentCheckId =
  | "robots-ai"
  | "bot-access"
  | "no-js"
  | "public"
  | "redirects"
  | "real-404"
  | "indexable"
  | "sitemap"
  | "llms-txt"
  | "markdown"
  | "identity"
  | "metadata"
  | "trust"
  | "token-budget"
  | "structure"
  | "controls"
  | "no-injection"
  | "llms-full"
  | "md-twins"
  | "link-headers"
  | "well-known"
  | "sitemap-fresh"
  | "same-as"
  | "llms-links";

export interface AgentCheck {
  id: AgentCheckId;
  result: AgentResult;
  /** 0 to 1: partial results get partial credit. */
  credit: number;
  /** What we actually saw, in plain words. */
  evidence: string;
}

export interface AgentReport {
  /** The homepage we checked. */
  url: string;
  checkedAt: number;
  checks: AgentCheck[];
  /** Pages sampled for the page-level checks. */
  sampled: string[];
}

interface CheckInfo {
  tier: AgentTier;
  label: string;
  /** Why an agent cares. */
  why: string;
  /** How to pass. */
  fix: string;
}

export const AGENT_CHECKS: Record<AgentCheckId, CheckInfo> = {
  "robots-ai": {
    tier: "essential",
    label: "AI agents allowed in robots.txt",
    why: "Assistants that browse for a person (ChatGPT-User, Claude-User, Perplexity) and AI search crawlers (OAI-SearchBot, Claude-SearchBot, PerplexityBot) obey robots.txt. If it shuts them out, your pages can't be read, quoted or linked in AI answers.",
    fix: "Remove Disallow rules for ChatGPT-User, OAI-SearchBot, Claude-User, Claude-SearchBot, PerplexityBot and Perplexity-User (or add `Allow: /` groups for them). Blocking training crawlers such as GPTBot or CCBot is a separate choice and doesn't affect this.",
  },
  "bot-access": {
    tier: "essential",
    label: "No firewall wall for AI agents",
    why: "Many firewalls and bot-protection services answer AI agents with a 403 or a CAPTCHA page even when robots.txt allows them, so the agent sees an error instead of your page.",
    fix: "In your CDN or firewall (Cloudflare, Vercel, Akamai…), allow verified AI agents and AI search crawlers instead of challenging them. Cloudflare: Security → Bots, and check any custom rules that match on user agent.",
  },
  "no-js": {
    tier: "essential",
    label: "Content works without JavaScript",
    why: "Most AI agents fetch HTML and don't run scripts. If the text only appears after JavaScript runs, they see an empty page.",
    fix: "Render the main content on the server (SSR or static generation) so it's in the HTML the server sends, including the H1 and body text.",
  },
  public: {
    tier: "essential",
    label: "Readable without signing in",
    why: "Agents can't log in. Pages behind a login wall, a cookie wall or a 401/403 can't be read or cited.",
    fix: "Keep public content public: serve it with a 200 status and no login redirect. Put only genuinely private areas behind sign-in.",
  },
  redirects: {
    tier: "essential",
    label: "Redirects resolve cleanly",
    why: "Agents follow HTTP redirects, but many don't run meta-refresh or JavaScript redirects, and redirects to another domain look like a different site.",
    fix: "Use server-side 301/308 redirects. Replace <meta http-equiv=\"refresh\"> and window.location redirects, and keep pages on your own domain.",
  },
  "real-404": {
    tier: "essential",
    label: "Missing pages return 404",
    why: "When a missing page answers 200 OK (a soft 404) or redirects to the homepage, agents can't tell a broken link from real content and may quote the wrong page.",
    fix: "Return a real 404 (or 410) status for unknown URLs. A helpful 404 page with links to your main sections is great, as long as the status code is 404.",
  },
  indexable: {
    tier: "essential",
    label: "Homepage not hidden from search",
    why: "AI search features build on search indexes. A noindex on the homepage (meta tag or X-Robots-Tag header) hides the whole site's front door.",
    fix: "Remove noindex from the homepage's robots meta tags and X-Robots-Tag header.",
  },
  sitemap: {
    tier: "recommended",
    label: "Sitemap found",
    why: "A sitemap gives agents and crawlers the full list of pages, including ones that are hard to reach by following links.",
    fix: "Publish an XML sitemap at /sitemap.xml (or list it in robots.txt with a `Sitemap:` line) containing every public page.",
  },
  "llms-txt": {
    tier: "recommended",
    label: "llms.txt",
    why: "llms.txt (llmstxt.org) is a short Markdown map of your site for AI assistants: what it is, and links to the pages that matter. Agents that look for it get the right pages first.",
    fix: "Publish /llms.txt as plain text: start with `# Site name`, a `> one-line summary`, then sections of `- [Page title](https://…): what it covers` links. Keep it under about 30,000 characters and move long text to /llms-full.txt.",
  },
  markdown: {
    tier: "recommended",
    label: "Markdown for agents",
    why: "Markdown is far smaller and cleaner than HTML for a model to read. Sites that answer `Accept: text/markdown` with Markdown let agents read the content without the page chrome.",
    fix: "Serve a Markdown version of each page when a request sends `Accept: text/markdown`, with `Content-Type: text/markdown; charset=utf-8` and `Vary: Accept` so caches keep the two versions apart.",
  },
  identity: {
    tier: "recommended",
    label: "Structured identity (JSON-LD)",
    why: "Organization, Person or WebSite markup tells agents exactly who is behind the site, so they don't confuse you with someone of the same name.",
    fix: "Add JSON-LD to the homepage for your Organization or Person with name, url, description, logo or image, and sameAs links to your official profiles.",
  },
  metadata: {
    tier: "recommended",
    label: "Metadata complete",
    why: "Title, description, canonical, language and Open Graph tags are how agents label and summarize a page before reading it.",
    fix: "Give the homepage a <title>, meta description, canonical link, <html lang>, og:title, og:image and og:type.",
  },
  trust: {
    tier: "recommended",
    label: "Trust pages linked",
    why: "About, Contact and Privacy pages are how people and agents check who runs a site. Assistants weigh them when deciding whether a source is trustworthy.",
    fix: "Link to About, Contact and Privacy pages from the homepage (the footer is fine), with plain <a href> links.",
  },
  "token-budget": {
    tier: "recommended",
    label: "Fits an agent's context",
    why: "Agents read pages inside a limited context window. Very long pages get cut off, so the part that answers the question may never be read.",
    fix: "Split very long pages into focused ones, or offer a Markdown version that leaves out navigation and repeated blocks.",
  },
  structure: {
    tier: "recommended",
    label: "Accessible page structure",
    why: "Agents that browse use the accessibility tree: a <main> landmark, one H1 and headings in order tell them where the content is and how it's organized.",
    fix: "Wrap the content in <main>, use exactly one H1, and nest headings one level at a time (H1 → H2 → H3).",
  },
  controls: {
    tier: "recommended",
    label: "Buttons and links have names",
    why: "Agents that click things find controls by their accessible names. An icon-only button with no label is invisible to them (and to screen-reader users).",
    fix: "Give every link, button and form field a name: visible text, an aria-label, or a <label> for inputs. Use real <button> and <a> elements instead of clickable <div>s.",
  },
  "no-injection": {
    tier: "recommended",
    label: "No hidden AI instructions",
    why: "Hidden text that gives orders to AI assistants is prompt injection. Agents and AI search treat sites that do it as manipulative.",
    fix: "Remove hidden instructions to AI assistants from pages, comments and \"Summarize with AI\" links.",
  },
  "llms-full": {
    tier: "bonus",
    label: "llms-full.txt",
    why: "A single Markdown file with your key content lets an agent ground its answer in one fetch.",
    fix: "Publish /llms-full.txt with the full text of your most important pages, and link to it from llms.txt.",
  },
  "md-twins": {
    tier: "bonus",
    label: ".md versions of pages",
    why: "Some agents try adding .md to a URL to get Markdown. A homepage at /index.md and page twins like /guide.md answer them.",
    fix: "Serve /index.md for the homepage and a .md twin for each content page (/docs/auth → /docs/auth.md) as text/markdown.",
  },
  "link-headers": {
    tier: "bonus",
    label: "HTTP Link headers",
    why: "A Link header (RFC 8288) on the homepage points agents at machine-readable resources such as your sitemap, llms.txt or API description without parsing HTML.",
    fix: "Send a Link header on the homepage, e.g. `Link: </llms.txt>; rel=\"describedby\", </sitemap.xml>; rel=\"sitemap\"`.",
  },
  "well-known": {
    tier: "bonus",
    label: "Agent discovery files",
    why: "Well-known files such as /.well-known/api-catalog (RFC 9727) or an A2A agent card tell agents which APIs or agent endpoints a site offers.",
    fix: "If you offer an API or agent endpoint, publish /.well-known/api-catalog and, for agents, /.well-known/agent-card.json. Content-only sites can skip this.",
  },
  "sitemap-fresh": {
    tier: "bonus",
    label: "Sitemap dates (lastmod)",
    why: "lastmod dates tell agents which pages changed recently, so they can prefer fresh sources.",
    fix: "Include an accurate <lastmod> for every URL in your sitemap, and only change it when the page really changes.",
  },
  "same-as": {
    tier: "bonus",
    label: "Linked profiles (sameAs)",
    why: "sameAs links in your structured data connect the site to your profiles elsewhere, which helps agents identify you for certain.",
    fix: "Add sameAs links to your Organization or Person JSON-LD: LinkedIn, GitHub, X, Wikipedia or Wikidata, and so on.",
  },
  "llms-links": {
    tier: "bonus",
    label: "llms.txt links work",
    why: "An llms.txt full of dead links sends agents into dead ends.",
    fix: "Check every link in llms.txt points at a live page, and update it when URLs change.",
  },
};

/** Points available per tier. Bonus signals add up to BONUS_CAP on top, never taking points away. Checks we couldn't run ("na") drop out. */
export const TIER_POINTS: Record<Exclude<AgentTier, "bonus">, number> = { essential: 60, recommended: 40 };
export const BONUS_CAP = 5;

export interface TierSummary {
  earned: number;
  available: number;
  passed: number;
  total: number;
}

export interface AgentScore {
  score: number;
  essential: TierSummary;
  recommended: TierSummary;
  bonus: { points: number; positive: number; total: number };
}

export function agentScore(report: AgentReport): AgentScore {
  const tier = (name: "essential" | "recommended"): TierSummary => {
    const checks = report.checks.filter((c) => AGENT_CHECKS[c.id].tier === name && c.result !== "na");
    const credit = checks.reduce((sum, c) => sum + c.credit, 0);
    const available = checks.length ? TIER_POINTS[name] : 0;
    return {
      earned: checks.length ? Math.round((credit / checks.length) * TIER_POINTS[name] * 10) / 10 : 0,
      available,
      passed: checks.filter((c) => c.result === "pass").length,
      total: checks.length,
    };
  };
  const essential = tier("essential");
  const recommended = tier("recommended");
  const bonusChecks = report.checks.filter((c) => AGENT_CHECKS[c.id].tier === "bonus" && c.result !== "na");
  const bonusPoints = Math.min(BONUS_CAP, bonusChecks.reduce((sum, c) => sum + c.credit, 0));
  const available = essential.available + recommended.available;
  // Not-applicable checks drop out, and whatever's left is scaled to 100.
  const base = available ? ((essential.earned + recommended.earned) / available) * 100 : 0;
  return {
    score: Math.round(Math.min(100, base + bonusPoints)),
    essential,
    recommended,
    bonus: { points: Math.round(bonusPoints * 10) / 10, positive: bonusChecks.filter((c) => c.credit > 0).length, total: bonusChecks.length },
  };
}

export function agentGrade(score: number): string {
  if (score >= 90) return "Agent-ready";
  if (score >= 75) return "Mostly ready";
  if (score >= 50) return "Partly ready";
  return "Hard for agents";
}

/** Checks that need attention, the essentials first. */
export function agentGaps(report: AgentReport): AgentCheck[] {
  const order: Record<AgentTier, number> = { essential: 0, recommended: 1, bonus: 2 };
  return report.checks
    .filter((c) => c.result === "fail" || c.result === "partial")
    .sort((a, b) => order[AGENT_CHECKS[a.id].tier] - order[AGENT_CHECKS[b.id].tier] || a.credit - b.credit);
}

/** Replace the homepage-only injection check with what the whole crawl found. */
export function withCrawlEvidence(report: AgentReport, pages: { finalUrl: string; hiddenInstructions?: string[] }[]): AgentReport {
  const flagged = pages.filter((p) => p.hiddenInstructions?.length);
  if (!pages.length) return report;
  const check: AgentCheck = flagged.length
    ? {
        id: "no-injection",
        result: "fail",
        credit: 0,
        evidence: `Hidden instructions to AI assistants on ${flagged.length} of ${pages.length} crawled pages, e.g. “${flagged[0].hiddenInstructions![0]}”.`,
      }
    : { id: "no-injection", result: "pass", credit: 1, evidence: `No hidden instructions to AI assistants on any of the ${pages.length} crawled pages.` };
  return { ...report, checks: report.checks.map((c) => (c.id === "no-injection" ? check : c)) };
}
