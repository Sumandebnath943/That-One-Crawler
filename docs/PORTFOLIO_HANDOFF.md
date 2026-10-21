# That One Crawler: Portfolio Handoff

Everything needed to present That One Crawler in a portfolio, case study, resume or post: the story, the highlights, the numbers, a screenshot list and ready-to-paste copy. Every number here comes from the live product or the codebase.

_Last updated: 22 October 2026._

## The essentials

| | |
| --- | --- |
| Project | That One Crawler |
| One-liner | A free, brutally honest SEO and AI-search audit tool for blogs |
| Live | https://that-one-crawler.vercel.app |
| Code | https://github.com/Sumandebnath943/That-One-Crawler |
| Maker | Suman Debnath ([sumandebnath.houseofnamus.com](https://sumandebnath.houseofnamus.com)) |
| Role | Product, design and full-stack development |
| Year | 2026 |
| Stack | Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Vercel · Groq and Gemini APIs · Google PageSpeed and Chrome UX Report APIs · Vitest |
| Running cost | $0 (free tiers only) |

## The story

**The problem.** My first SEO crawler, Crawl Daddy, lived on Replit, and I had to republish it every 30 days to keep it online. It ran a long-lived Flask server with headless Chromium, which made it hard to host anywhere free.

**The idea.** Rebuild it as **That One Crawler**, "Crawl Daddy, reprised": free to host forever, nothing to babysit, and much better at its job.

**The key move.** Free serverless hosting can't run long background jobs, so I turned the architecture around: **the visitor's browser runs the crawl** and calls small, stateless API routes that each finish in seconds. No database, no queue, no servers to keep alive. Scans are stored in the visitor's own browser.

**Where it went next.** Classic SEO wasn't enough anymore, since AI answer engines now quote pages directly. So the tool also scores every page for **AI-search readiness (GEO/AEO)**, adds AI writing help that runs on free tiers, and ships four focused tools and 30 guides. It also had to pass its own audit: the site scores 91 for SEO and 93 for AI readiness, with zero issues.

## Highlights (what to show)

1. **A full-site audit in the browser.** It crawls up to 1,000 pages, checks up to 400 links and images, and scores every page out of 100 for SEO and for AI readiness. Each of the 47 checks comes with "why it matters" and "how to fix it".
2. **A clear report.** Equal score rings (lime for SEO, violet for AI), an issue overview by severity, tabs for pages, links, keywords, changes over time, and an AI action plan.
3. **AI help on free tiers, with guardrails.** Title and description rewrites, quick-answer intros, question headings, section rewrites and FAQ generation. Page text is fenced off against prompt injection, every answer is checked for invented numbers and links, and the visitor sees "✓ Fact check passed".
4. **Four focused tools**, each doing one job: meta tag checker, GEO/AEO checker, broken link checker, keyword cannibalization checker.
5. **Personality.** A spider mascot whose eyes follow your cursor and whose mood follows your score. Poke it, try the Konami code, and watch the confetti for good scores.
6. **It practices what it preaches.** Structured data on every page, llms.txt, a sitemap, AI-crawler-friendly robots.txt, real 404s, and 30 guides written to be quoted by AI search.

## Technical talking points

Good for interviews and case-study sections.

- **Serverless-friendly crawling.** The browser orchestrates discovery, crawling (about six pages in flight), link checks and PageSpeed, and calls stateless API routes. This sidesteps serverless time limits without a queue or database.
- **Safe fetching.** A custom fetcher blocks private and internal network addresses (SSRF protection), re-checks every redirect hop, never follows a redirect off the site, and caps response size and time.
- **Free AI without a database.**
  - Short jobs go to Groq first and long jobs to Gemini, each falling back to the other inside a 70-second budget.
  - A daily allowance per visitor is tracked with an HMAC-signed cookie plus an IP counter.
  - After that, visitors can use their own free key, kept only in their browser.
  - When a provider retired a model, the router fell back to working defaults instead of breaking.
- **Trustworthy AI output.**
  - Page text is wrapped in fences that the model is told to treat as data.
  - Numbers, links and emails in an answer that don't appear in the source are flagged.
  - FAQ markup is built by code, not by the model.
  - Over-long titles get one targeted follow-up call to shorten them.
- **An honest keyword engine.** Every keyword is a phrase actually on the page. Matching ignores plurals, keeps version numbers whole ("7.1.2"), prefers specific phrases ("broken link checker" over "broken link"), and filters site-wide boilerplate like the blog's name. Cannibalization groups mark the page to keep.
- **Accurate link checking.** A failed HEAD request is always confirmed with a GET. One real-world case (bsky.app answers every HEAD with 404) cut false "broken link" pages from 24 of 25 to 1 on a test blog.
- **Pixel-accurate Google preview.** Titles are measured with canvas text metrics against Google's roughly 600px limit, not just counted in characters.
- **Design details that matter to crawlers.** Decorative badges and step numbers are CSS-only, so headings read exactly as written for search engines and AI.
- **Quality bar.** 143 unit tests, plus tests that hold the site's own copy to the limits its crawler enforces. The tool is regularly run against its own site.

## Numbers

| Metric | Value |
| --- | --- |
| Checks per page | 47 (9 categories) |
| Guides | 30, covering every check |
| Focused tools | 4 |
| AI writing tasks | 6 |
| Pages per scan | up to 1,000 |
| Links and images checked per scan | up to 400 |
| Free AI actions per visitor per day | 20 (unlimited with their own free key) |
| Unit tests | 143 |
| Own audit | SEO 91/100, AI readiness 93/100, 0 issues on 38 pages |
| Hosting cost | $0 |

## Screenshot and video list

Capture in light mode at about 1440px wide unless noted, and show the live site.

| # | What | Where |
| --- | --- | --- |
| 1 | Landing hero with the mascot and the scan form | `/` |
| 2 | Scan in progress (progress bar with the little spider walking it) | `/scan?url=https%3A%2F%2Fwordpress.org%2Fnews%2F&max=25` |
| 3 | Report verdict: two score rings, verdict, severity chips | same scan, top of the report |
| 4 | Issue overview and the tab bar with counts | same scan, scroll down |
| 5 | Page drawer, AI tools tab: title rewrite with the diff and "✓ Fact check passed" | click any page, then "✦ AI tools" |
| 6 | Meta tag checker: tag inspector next to the Google and social previews | `/meta-tag-checker` with a real post URL |
| 7 | GEO & AEO checker: violet ring, verdict and checklist | `/geo-aeo-checker` with a real post URL |
| 8 | Broken link checker results with "found on" pages | `/broken-link-checker`, 25 pages |
| 9 | Keyword cannibalization groups with "★ Keep" | `/keyword-cannibalization-checker`, 100 pages |
| 10 | A guide page with the "On this page" sidebar | `/checks/keyword-cannibalization` |
| 11 | Mobile, dark mode (375px): a guide and the report | any |
| 12 | Short clip: the mascot's eyes following the cursor, a poke, then Daddy mode (Konami code) | `/` |

## Ready-to-paste copy

**Portfolio card (about 25 words)**
> That One Crawler is a free SEO and AI-search audit tool for blogs. It crawls your whole site, scores every page and tells you exactly what to fix.

**Case study intro (about 90 words)**
> That One Crawler started as a fix for my own problem: my old SEO crawler lived on Replit and needed republishing every 30 days. I rebuilt it from scratch for free serverless hosting by moving the crawl into the visitor's browser, so it runs on Vercel's free tier with no database. Then I made it better: it scores every page for classic SEO and for AI-search readiness, explains 47 checks in plain English, adds guarded AI writing help on free tiers, and passes its own audit with zero issues.

**LinkedIn or social post**
> I rebuilt my old SEO crawler, and it's now free to use forever. 🕷️
>
> That One Crawler audits your whole blog for Google *and* for AI search (ChatGPT, Perplexity, AI Overviews): broken links, thin content, duplicate titles, keyword cannibalization, missing answers, and 40-odd other things. Each finding explains why it matters and how to fix it.
>
> A few things I'm proud of:
> • The crawl runs in your browser, so it costs $0 to host and your results stay on your device
> • AI suggestions are fact-checked against your page before you see them
> • It audits its own site: 91 for SEO, 93 for AI readiness, zero issues
>
> No signup. Try it on your blog: https://that-one-crawler.vercel.app

**Resume bullets**
- Built That One Crawler, a free SEO and AI-search audit tool (Next.js, TypeScript, Vercel). It crawls up to 1,000 pages per scan with 47 checks and $0 hosting costs.
- Designed a browser-driven crawl architecture over stateless serverless APIs, removing the need for servers, queues or a database.
- Added AI writing tools on free Groq and Gemini tiers with automatic fallback, a per-visitor daily allowance without accounts, and guardrails against prompt injection and invented facts.
- Shipped 4 focused SEO tools and 30 guides structured for search and AI answer engines. The site scores 91 for SEO and 93 for AI readiness on its own audit.

## Tags

`SEO` · `GEO` · `AEO` · `AI search` · `Next.js` · `React` · `TypeScript` · `Tailwind CSS` · `Vercel` · `Serverless` · `LLM` · `Groq` · `Gemini` · `Web crawler` · `Developer tools` · `Product design`

## Honesty notes

Keep the presentation accurate:

- Keywords come from the pages themselves. There are **no search volumes**, and the tool says so.
- Data is stored in the visitor's browser, so there are no accounts, shared links or scheduled email reports.
- Pages that only render with JavaScript are flagged rather than rendered (there's no headless browser).
- Development was AI-assisted (Claude Code); commits note the co-author. Say so if your portfolio lists tools used.
- The "Reviews from the crawled" section on the landing page is labeled as fictional and comedic. Don't present it as real testimonials.
