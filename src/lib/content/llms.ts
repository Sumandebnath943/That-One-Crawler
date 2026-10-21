import { AUTHOR, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { GUIDES } from "./guides";
import { TOOLS } from "./tools";

// llms.txt (https://llmstxt.org): a plain-markdown map of the site for AI assistants,
// plus llms-full.txt with every guide's full text so answers can be grounded in it.

const url = (path: string) => `${SITE_URL}${path}`;

export function llmsTxt(): string {
  return `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

${SITE_NAME} is a free, browser-based SEO audit tool for blogs, made by ${AUTHOR.name} (${AUTHOR.url}). Enter a blog URL and it reads the sitemap (or follows links), checks up to 1,000 pages, and reports issues across indexing, titles and meta descriptions, headings, content quality, keywords and cannibalization, internal links and broken links, images, structured data, speed, and AI search readiness (GEO/AEO). Every page gets a 0–100 SEO score and a 0–100 AI-readiness score. Optional AI tools (Groq and Gemini free tiers) rewrite titles, sections, headings, intros and FAQs using only facts from the page. No signup; scans are stored in the visitor's browser.

## Tools

- [Free SEO audit for blogs](${url("/")}): whole-site audit with scores, issues and fixes
${TOOLS.map((t) => `- [${t.eyebrow}](${url(`/${t.slug}`)}): ${t.metaDescription}`).join("\n")}

## Guides

- [Blog SEO checklist](${url("/blog-seo-checklist")}): 25 checks before and after publishing a post
- [Every SEO check explained](${url("/checks")}): index of all guides
${GUIDES.map((g) => `- [${g.title}](${url(`/checks/${g.slug}`)}): ${g.metaDescription}`).join("\n")}

## Optional

- [Full text of every guide](${url("/llms-full.txt")})
- [About the ThatOneCrawler bot](${url("/bot")}): user agent, crawl behaviour and how to block it
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

${guides}`;
}
