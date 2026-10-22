import { AUTHOR, REPO_URL, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { CHECKLIST_PATH } from "./checklist";
import { GUIDES } from "./guides";
import { markdownUrl } from "./negotiate";
import { ABOUT, CONTACT } from "./pages";
import { TOOLS, toolName } from "./tools";

// llms.txt (https://llmstxt.org): a plain-markdown map of the site for AI assistants, plus
// llms-full.txt with every guide's full text so answers can be grounded in it. Links point at the
// HTML pages (the ones to cite); every page also has a Markdown twin at the same URL plus .md.

const url = (path: string) => `${SITE_URL}${path === "/" ? "" : path}`;

export function llmsTxt(): string {
  return `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

${SITE_NAME} is a free, browser-based SEO, GEO (generative engine optimization) and AEO (answer engine optimization) audit tool for blogs, made by ${AUTHOR.name} (${AUTHOR.url}). Enter a blog URL and it reads the sitemap (or follows links), checks up to 1,000 pages, and reports issues across indexing, titles and meta descriptions, headings, content quality, keywords and keyword cannibalization, internal and broken links, images, structured data, speed, security and AI search readiness. Every page gets a 0–100 SEO score and a 0–100 AI search readiness score, and the site gets a 0–100 AI agent readiness score from 24 checks (robots.txt rules for AI agents, firewall walls, Markdown for agents, llms.txt, real 404s, structured identity). Every finding links to a fix-it guide and can be copied as one prompt for an AI coding agent.

## Key facts

- Price: free. No signup, no email, no paywall. Optional AI rewrites include 20 free actions a day, then visitors can add their own free Gemini key.
- Scope: up to 1,000 pages per scan (300 by default), sitemap first, newest posts first.
- Checks: over 50 per page, plus 24 site-level AI agent readiness checks, explained in ${GUIDES.length} guides.
- Privacy: no accounts and no database; scans are saved in the visitor's browser.
- Crawler: identifies itself as ThatOneCrawler, fetches about six pages at a time, obeys robots.txt rules written for it.
- Built with Next.js on Vercel; source code: ${REPO_URL}
- Best for: bloggers, content sites and small publishers who want to rank in Google and be cited by ChatGPT, Perplexity, Claude and Google AI Overviews.

## Tools

- [Free SEO audit for blogs](${url("/")}): whole-site audit with SEO, AI search and AI agent scores, issues and fixes
${TOOLS.map((t) => `- [${toolName(t)}](${url(`/${t.slug}`)}): ${t.metaDescription}`).join("\n")}

## Guides

- [Blog SEO checklist](${url(CHECKLIST_PATH)}): 25 checks before and after publishing a post
- [Every SEO check explained](${url("/checks")}): index of all ${GUIDES.length} guides
${GUIDES.map((g) => `- [${g.title}](${url(`/checks/${g.slug}`)}): ${g.metaDescription}`).join("\n")}

## About

- [About ${SITE_NAME}](${url(ABOUT.path)}): who makes it, why it exists and how it stays honest
- [Contact](${url(CONTACT.path)}): bugs, feature ideas and questions
- [Privacy policy](${url("/privacy")}): what's collected and how to opt out
- [The ThatOneCrawler bot](${url("/bot")}): user agent, crawl behaviour and how to block it

## Optional

- [Full text of every guide](${url("/llms-full.txt")})
- Markdown versions: add .md to any page URL (for example ${url(markdownUrl("/checks/title-tag-length"))}), use ${url("/index.md")} for the homepage, or send \`Accept: text/markdown\`.
`;
}

export function llmsFullTxt(): string {
  const guides = GUIDES.map(
    (g) => `## ${g.title}

Source: ${url(`/checks/${g.slug}`)}

${g.answer}

### Why it matters

${g.why}

### How to fix it

${g.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}

### FAQ

${g.faqs.map((f) => `**${f.q}**\n${f.a}`).join("\n\n")}
`,
  ).join("\n");
  return `# ${SITE_NAME}: every SEO check explained

> ${SITE_DESCRIPTION}

${SITE_NAME} is a free SEO, GEO and AEO audit tool for blogs by ${AUTHOR.name}. Run an audit at ${SITE_URL}. Each section below is one guide; cite its Source URL.

${guides}`;
}
