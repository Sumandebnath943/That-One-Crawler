# That One Crawler

**Your blog has issues. This free SEO audit finds every single one.**

That One Crawler is a free, brutally honest SEO and AI-search audit tool for blogs. Paste a URL and it crawls the whole site (up to 1,000 pages), scores every page for classic SEO and for AI-search readiness (GEO/AEO), checks whether AI agents can reach and read the site, and explains every problem in plain English with how to fix it. Every finding can be copied as one prompt for your AI coding agent.

Live at **https://thatonecrawler.houseofnamus.com**. It's the reprised version of Crawl Daddy (see [`legacy/crawl-daddy`](legacy/crawl-daddy)), rebuilt to run free on Vercel with nothing to babysit.

## Documentation

| Doc | For |
| --- | --- |
| [Handoff](docs/HANDOFF.md) | Running, deploying and maintaining the project: services, rules not to break, checks, troubleshooting, known gaps |
| [Project Bible](docs/PROJECT_BIBLE.md) | How everything works and why: features, architecture, scoring, the 53 checks, the keyword engine, AI agent readiness, PageSpeed, the improvement prompt, the AI system, the site's own SEO, design system, code map, decisions |
| [Portfolio Handoff](docs/PORTFOLIO_HANDOFF.md) | Presenting the project: story, highlights, numbers, screenshot list, ready-to-paste copy |
| [Visitor alerts](docs/BEACON.md) | The Telegram beacon: setup, bot commands (`/bots off`…), how it works |
| [Indexing Guide](docs/INDEXING_GUIDE.md) | Google Search Console, Bing Webmaster Tools, IndexNow, GA4 and AI search, step by step |

## What it does

- **Full audit:** 53 checks across indexing, search appearance, content, links, keywords, structured data, AI search, performance, security and brand rules, plus 24 site-level AI agent checks. Scores for SEO, AI search and AI agents (and speed when PageSpeed runs), a report with tabs for pages, links, keywords, AI agents, speed, changes and an AI action plan, a **Prompt to improve** for coding agents, CSV and HTML exports, and history kept in your browser.
- **Six focused tools:** a [meta tag checker](https://thatonecrawler.houseofnamus.com/meta-tag-checker), a [GEO & AEO checker](https://thatonecrawler.houseofnamus.com/geo-aeo-checker) and a [page speed test](https://thatonecrawler.houseofnamus.com/page-speed-test) (one page), an [AI agent readiness checker](https://thatonecrawler.houseofnamus.com/ai-agent-readiness-checker) (whole site, in seconds), plus a [broken link checker](https://thatonecrawler.houseofnamus.com/broken-link-checker) and a [keyword cannibalization checker](https://thatonecrawler.houseofnamus.com/keyword-cannibalization-checker) (site crawls).
- **AI help on free tiers:** title and description rewrites, quick-answer intros, question headings, section rewrites, FAQs with markup, and a site-wide action plan. Page text is fenced against prompt injection and every answer is fact-checked against the page. 20 free actions per visitor per day, then visitors can use their own free Gemini key, kept in their browser.
- **Optional speed data:** the full PageSpeed Insights report (four Lighthouse scores, lab metrics, every failed audit with savings) and real-user Core Web Vitals (Chrome UX Report).
- **Guides:** [32 plain-English guides](https://thatonecrawler.houseofnamus.com/checks) covering every check, and a [blog SEO checklist](https://thatonecrawler.houseofnamus.com/blog-seo-checklist).
- **Built for agents too:** every page has a Markdown twin (`/index.md`, `/<page>.md`, or `Accept: text/markdown`), plus `llms.txt` and `llms-full.txt`. The site scores 100 on its own AI agent readiness audit.
- **Visitor alerts:** a Telegram bot reports visits, scans, crawlers (verified or fake) and contact messages, with in-chat commands such as `/bots off` for human-only alerts. See [docs/BEACON.md](docs/BEACON.md).

## How it works

The visitor's **browser drives the crawl** and calls small, stateless API routes, so it fits free serverless hosting with no database or queue.

```
Browser (src/lib/client/crawl.ts)
  │  /api/discover     robots.txt, sitemaps (newest first), redirects
  │  /api/agents       AI agent readiness: robots.txt, bot walls, Markdown, llms.txt, 404s…
  │  /api/analyze      fetch and extract pages, 3 per call, 2 calls at a time
  │  /api/check-links  test outgoing links and images (HEAD, confirmed with GET)
  │  /api/pagespeed    PageSpeed Insights (optional)
  │  /api/crux         real-user speed from the Chrome UX Report (optional)
  │  /api/ai           one AI task: Groq or Gemini, with fallback (optional)
  ▼
Scores, issues and history computed and stored in the browser (IndexedDB)
```

The fetcher refuses private and internal addresses, caps response sizes and never follows redirects off the site. Rules in a site's robots.txt that name `ThatOneCrawler` are obeyed.

## Local development

Requires Node 20.9+.

```bash
npm install
cp .env.example .env.local   # optional keys: GROQ_API_KEY, GEMINI_API_KEY, PAGESPEED_KEY
npm run dev                  # http://localhost:3000
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm run start` | Production build and server |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm run telegram:setup` | Connects the alert bot's commands (see [BEACON.md](docs/BEACON.md)) |
| `npm run indexnow` | Tells Bing and other IndexNow engines the pages changed |

Every key is optional; the crawler works without them. See [`.env.example`](.env.example) and the [Handoff](docs/HANDOFF.md) for details.

## Deploying to Vercel (Hobby)

1. Import the GitHub repo at [vercel.com/new](https://vercel.com/new). Next.js is detected automatically.
2. Optional: add `GROQ_API_KEY` and/or `GEMINI_API_KEY` (AI tools) and `PAGESPEED_KEY` (PageSpeed and real-user speed; enable the Chrome UX Report API on the key's Google Cloud project) under **Settings → Environment Variables**, then redeploy.
3. Every push to `main` redeploys automatically.

Made by [Suman Debnath](https://sumandebnath.houseofnamus.com).
