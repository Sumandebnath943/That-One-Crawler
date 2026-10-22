# That One Crawler: Project Bible

The single reference for what That One Crawler is, how it works and why it's built this way. Practical "how do I run, deploy and not break it" lives in the [Handoff](HANDOFF.md).

_Last updated: 22 October 2026._

## Contents

1. [Product](#1-product)
2. [Features](#2-features)
3. [Architecture](#3-architecture)
4. [Scoring and checks](#4-scoring-and-checks)
5. [Keyword engine](#5-keyword-engine)
6. [Link and image checking](#6-link-and-image-checking)
7. [AI agent readiness](#7-ai-agent-readiness)
8. [PageSpeed](#8-pagespeed)
9. [The improvement prompt](#9-the-improvement-prompt)
10. [AI system](#10-ai-system)
11. [The site's own SEO, GEO and AEO](#11-the-sites-own-seo-geo-and-aeo)
12. [Design system](#12-design-system)
13. [Code map](#13-code-map)
14. [Conventions](#14-conventions)
15. [Decisions and their reasons](#15-decisions-and-their-reasons)
16. [Glossary](#16-glossary)

---

## 1. Product

**That One Crawler** is a free SEO audit tool for blogs. Paste a URL and it crawls the whole site (up to 1,000 pages), scores every page for classic SEO and for AI-search readiness (GEO/AEO), checks whether AI agents can use the site at all, and explains every problem in plain English with how to fix it. Every finding can be copied as one prompt for an AI coding agent.

- **Tagline:** "Your blog has issues. This free SEO audit finds every single one."
- **Origin:** a rebuild ("reprise") of the owner's earlier Replit app, Crawl Daddy (Flask + Playwright). Replit forced a republish every 30 days; this version runs on a free Vercel Hobby plan with nothing to babysit. The original code is kept in `legacy/crawl-daddy`.
- **Audience:** bloggers and small site owners who want a straight answer to "what's wrong with my blog and what do I fix first?", without signups or paid tools.
- **Voice:** brutally honest but kind, and funny. A spider mascot judges your blog ("Honestly? Annoyingly good.", "B-minus energy. Very fixable, though."). Jokes never get in the way of the information.
- **Price:** free, with no account. AI help has a daily free allowance, then visitors can paste their own free Gemini key.
- **Privacy:** no database. Scans are stored in the visitor's own browser.

## 2. Features

### Full audit (`/scan`)

1. **Discover:** follow redirects, read robots.txt, gather sitemap URLs (newest posts first). With no sitemap, it follows links from the homepage instead. Entering a path (`myblog.com/blog`) limits the scan to that section.
2. **AI agent check** (runs alongside the crawl, about 15 seconds): one `/api/agents` call. See [AI agent readiness](#7-ai-agent-readiness).
3. **Crawl:** about six pages in flight (2 requests × 3 URLs), up to the chosen page limit (25 to 1,000; default 300).
4. **Check links and images** (on by default): up to 400 URLs beyond the crawled pages, three batches of 15 at a time.
5. **PageSpeed** (optional): Google PageSpeed Insights (mobile) for the first 25 pages, with every failed audit kept.
6. **Report:**
   - Verdict with score rings (SEO, AI search, AI agents, and Speed when PageSpeed ran), severity chips, the mascot's mood and the **✦ Prompt to improve** button.
   - Issue overview grouped into Critical, Warnings and Notices: fixed headline rows (✓ when clean) plus every other issue of that severity the scan found. Clicking one filters the page list.
   - Tabs:
     - **Pages:** sortable, filterable table with column groups (Basic SEO, Technical, Content, Social, PageSpeed) and CSV export.
     - **Links:** broken links and images with the pages they're on and a plain-words cause where the status code isn't enough, orphan pages, pages buried more than 4 clicks deep, most-linked pages.
     - **Keywords:** cannibalization groups with a "Keep" pick, possible keyword stuffing, keyword map.
     - **AI agents:** the agent-readiness report with evidence for every check (and a "Check again" button).
     - **Speed** (when PageSpeed ran): averaged Lighthouse scores, real-user Core Web Vitals, the audits that failed most often, every tested page.
     - **Changes:** compare with an earlier scan of the same site (score deltas, issues fixed and new, pages that improved or got worse).
     - **✦ Action plan:** a five-step AI plan from the scan's numbers.
7. **Page drawer** (click any page):
   - **Overview:** Google preview, issues with why and how to fix, social card.
   - **Content:** title length in characters and pixels, description length, main keyword and where it appears, AI-readiness checklist (checks that don't fit the page are greyed out), heading outline, readability, freshness, brand rules.
   - **Links & tech:** indexability, canonical, schema, links, broken links with their cause, text aimed at AI (hidden or visible), vague link text, http files, images, time to first byte, the full PageSpeed report and real-user speed (CrUX), plus a link to the mobile and desktop test.
   - **✦ AI tools:** title & meta rewrite, quick-answer intro, better headings, section rewrite, FAQ generator with JSON-LD.
8. **Extras:**
   - **Prompt to improve:** every finding (issues, failed agent checks, failed PageSpeed audits) as one prompt for an AI coding agent. Pick findings (Recommended, All or None), preview, copy or download as `.md`. See [The improvement prompt](#9-the-improvement-prompt).
   - **Brand rules:** brand name, banned phrases and required phrases per site, stored in the browser.
   - **Downloadable HTML report** (now with agent readiness and PageSpeed averages).
   - **History:** the last 25 scans in IndexedDB, with a "Time for a rescan?" nudge after 7 days.
   - **Live progress:** the tab title shows progress while scanning.

### Six focused tools

Each tool page has its own working tool in a card that overlaps the page intro, and a **✦ Prompt to improve** button for what it found. Single-page tools accept `?url=` and run straight away (the page drawer links to the PageSpeed test this way).

| Tool | Mode | What it does |
| --- | --- | --- |
| `/meta-tag-checker` | One page | Tag inspector (title in characters and pixels, description, H1, canonical incl. conflicting ones, robots, language, Open Graph, Twitter, structured data, hreflang), each marked good, warning or missing. Pixel-measured Google preview, social card, AI title and description rewrite |
| `/geo-aeo-checker` | One page | AI-readiness score ring with verdict, the seven-point checklist (items that don't fit the page marked "doesn't apply"), signals found on the page, hidden or visible instructions to AI. AI drafts for an intro, headings and an FAQ |
| `/ai-agent-readiness-checker` | Whole site, seconds | The 24-check agent audit (robots.txt for six AI agents, firewall probes, Markdown, llms.txt, real 404s, identity, trust pages…) with a score, tiers and evidence. Our answer to is-agentic.com |
| `/page-speed-test` | One page | PageSpeed Insights on mobile and desktop at once: real-user Core Web Vitals with the pass/fail assessment, the four Lighthouse scores, lab metrics, every failed audit with savings and files, diagnostics, the final screenshot |
| `/broken-link-checker` | Site crawl (links on) | Pages crawled, links tested, broken, refused bots, heavy images. Results switch between Broken, Refused bots, Errors, Heavy images and Everything, each with "found on" pages, causes and a CSV |
| `/keyword-cannibalization-checker` | Site crawl (links off) | Competing groups with the strongest page marked "★ Keep", possible stuffing, a searchable keyword map with Title/H1/Desc/URL columns, and a CSV |

Site tools save their crawl like any scan, so "Open the full report" shows everything else. They skip the agent check to keep the crawl focused.

### Content site

| Page | Purpose |
| --- | --- |
| `/` | Landing: hero with the scan form, findings marquee, recent scans, "What is a blog SEO audit?", things we judge, the six tools, how it works, reviews, FAQ, final call to action |
| `/checks` | Index of 32 guides grouped by category |
| `/checks/[slug]` | 32 guides that together cover all 53 checks: direct answer, why it matters, how to fix it, how we check it, FAQ, related guides, previous/next |
| `/blog-seo-checklist` | 25 checks grouped by stage |
| `/bot` | What the ThatOneCrawler bot does and how to block it |
| `/llms.txt`, `/llms-full.txt`, `/sitemap.xml`, `/robots.txt`, `/manifest.webmanifest` | Machine-readable files |

### Quirks (personality)

- **Mascot:** eyes follow the pointer, it blinks, and it squishes and says something when poked. Its mood follows the score (cool, happy, smirk, meh, shocked). It reacts to the URL form (typing, invalid URL, submit).
- **Daddy mode:** the Konami code, or poking the spider 10 times, turns lime into amber and shows a "Daddy mode" badge, a nod to Crawl Daddy.
- **Other touches:** a spider dangling from the top of the page, toasts, confetti for scores of 85 and up. When the tab is hidden, its title reads "👀 Psst… your blog still has issues". A spider peeks over the footer.
- All motion respects `prefers-reduced-motion`.

## 3. Architecture

### The core idea: the browser drives the crawl

Crawl Daddy needed a long-lived server with background threads, headless Chromium and in-memory state. Vercel functions are short-lived and stateless, so the work is turned around: the **browser orchestrates the crawl** (`src/lib/client/crawl.ts`) and calls small, stateless API routes, each finishing in seconds.

```
Browser: runScan() in src/lib/client/crawl.ts
  │ POST /api/discover     redirects, robots.txt, sitemap URLs (newest first)
  │ POST /api/agents       the AI agent readiness audit (~25 requests to the site, ~15s), alongside the crawl
  │ POST /api/analyze      fetch and extract up to 10 URLs per call (the crawler sends 3, 2 calls at a time)
  │ POST /api/check-links  HEAD (then GET if needed) up to 20 URLs per call; `images` get an image Accept header
  │ POST /api/pagespeed    one PageSpeed Insights call (`strategy` mobile/desktop, `full` adds the screenshot)
  │ POST /api/crux         one Chrome UX Report lookup (page, then whole-site fallback)
  │ POST /api/ai           one AI task (quota-checked)
  │ GET  /api/ai           this visitor's remaining free AI actions
  │ GET  /api/config       which optional features are switched on
  ▼
buildRows() + summarize() + withCrawlEvidence() in the browser → report UI → IndexedDB ("that-one-crawler": scans, summaries)
```

### API routes

| Route | Rate limit (per IP, per instance) | Max duration | Notes |
| --- | --- | --- | --- |
| `/api/discover` | 20 per minute | 60s | Up to 40 sitemap fetches, 3 levels deep |
| `/api/agents` | 10 per minute | 60s | One site per request; about 25 small requests to it in two waves, finishing in ~15s |
| `/api/analyze` | 240 per minute | 60s | 1 to 10 URLs per request, plus `baseDomain` and optional brand rules |
| `/api/check-links` | 120 per minute | 60s | 1 to 20 http(s) URLs per request (`urls` and `images`) |
| `/api/pagespeed` | 30 per minute | 60s | Needs `PAGESPEED_KEY`. A scan sends at most about 18 a minute; the speed test sends two (mobile and desktop) |
| `/api/crux` | 30 per minute | 40s | Uses `PAGESPEED_KEY`; the Chrome UX Report API must be enabled |
| `/api/ai` | 10 per minute burst, plus the daily quota | 90s | Visitor key in the `x-gemini-key` header skips the quota |
| `/api/config` | none | n/a | Feature flags for the UI |

### Safe fetching (`src/lib/server/safe-fetch.ts`)

- Refuses private, loopback and internal network addresses (SSRF protection) unless `ALLOW_PRIVATE_URLS=1`, which is for local testing only.
- Follows redirects by hand: at most 5, never off the site being scanned, and every hop is re-checked against the address rules.
- 15-second timeout and a 3 MB response cap. HEAD support for link checks.
- Records time to first byte (`ttfbMs`, redirects included) as well as the full download time.
- User agent: `Mozilla/5.0 (compatible; ThatOneCrawler/1.0; +https://that-one-crawler.vercel.app/bot)`. Only the agent audit borrows other names (ChatGPT-User, OAI-SearchBot, Claude-User, PerplexityBot), always with `(agent-readiness check by ThatOneCrawler; +…/bot)` appended so site owners can tell it was us.

### robots.txt policy

- Rules written for **our** user agent (`ThatOneCrawler`) are obeyed. Those URLs are skipped and the report says so.
- Rules for all bots (`User-agent: *`) are **reported, not obeyed**. Site owners usually want to know which pages search engines can't reach, and that's an audit finding ("Blocked by robots.txt").

### Storage

| What | Where | Key |
| --- | --- | --- |
| Scans (last 25) and summaries | IndexedDB | database `that-one-crawler`, stores `scans` and `summaries` |
| Brand rules per site | localStorage | `toc-brand-rules` |
| Visitor's own Gemini key | localStorage | `toc-gemini-key` |
| Daily AI usage | Signed HttpOnly cookie | `toc_ai` (`day:count`, HMAC-signed) |
| Theme and Daddy mode | localStorage | restored by an inline script before first paint |

Saved scans from older versions are upgraded on load (`upgradeScan`, `upgradePage`), so new fields never break old history.

## 4. Scoring and checks

### SEO score (0 to 100)

**Issue-weighted** (`scoreFromIssues` in `src/lib/seo/issues.ts`), so the number always follows the issue list: a page with no issues scores 100.

| Rule | Points |
| --- | --- |
| Start at | 100 |
| Each critical issue | −30 |
| Each warning | −10 |
| Each notice | −2, at most −10 for all notices together |
| Broken page or soft 404 | 0 (and it counts in the site average) |
| Not counted | Brand rules (your house style) and AI-structure notes (`ai-readiness`, `faq-no-schema`, `ai-instructions`), which have their own score |

The site score is the average over every scored page, broken ones included. Off-site redirects and non-HTML responses aren't scored. Old saved scans are re-scored with this formula when they load, so the Changes tab compares like with like.

This replaced Crawl Daddy's fixed checklist (20 points for an H1, 20 for 900+ words and so on) on 22 October 2026. That formula docked half the content points from any page under 900 words and a full 15 for a 61-character title. Sites with no real problems scored in the low 80s, which made the number untrustworthy next to Lighthouse.

### AI-readiness score (0 to 100, GEO/AEO, shown as "AI search")

Points earned out of the points that **apply** to the page, scaled to 100. Question headings, an FAQ and a byline only apply to articles (Article/BlogPosting markup, a published date, or 600+ words); facts and lists apply from 300 words; answer paragraphs need 2+ subheadings. A contact page isn't marked down for having no FAQ.

| Points | Check | Applies to |
| --- | --- | --- |
| 20 | Short answer up top: first paragraph after the H1 is 20 to 80 words (8 points if it exists but is outside that range) | every page |
| 20 | Answer paragraphs under headings: 2 or more headings followed by a 30 to 80 word paragraph (10 for one) | 2+ subheadings |
| 15 | Question-style headings: at least 25% of H2/H3s (8 if any) | articles with 2+ subheadings |
| 15 | FAQ section or FAQPage markup | articles |
| 10 | Specific facts and numbers: 3 or more (5 for 1 or 2) | 300+ words |
| 10 | Lists or tables | 300+ words |
| 10 | Author (5) and a published or modified date (5) | articles |

### AI agent readiness score (0 to 100, site-level)

Essentials share 60 points and recommended checks 40, each split evenly across the checks that ran. Partial results get partial credit, checks that couldn't run ("na") drop out, and bonus signals add up to +5 on top (never a penalty), capped at 100. See [AI agent readiness](#7-ai-agent-readiness).

Grades on the score rings: Excellent 90+, Good 80+, Fair 60+, Weak 40+, Poor below 40. The agent ring uses Agent-ready 90+, Mostly ready 75+, Partly ready 50+, Hard for agents below.

### Thresholds (`src/lib/seo/issues.ts`, `src/lib/limits.ts`)

| Constant | Value |
| --- | --- |
| Title length | at least 30 characters; too long when wider than ~600px of 20px Arial (`src/lib/seo/pixels.ts`), which is what Google cuts off |
| Meta description length | 120 to 160 characters |
| Thin content | under 300 words |
| Article (for AI-readiness applicability) | Article markup, a published date, or 600+ words |
| Slow response | time to first byte over 1,800 ms (web.dev's "poor"), measured twice before it's flagged; old scans fall back to 3,000 ms download time |
| Stale post | not updated in 12 months |
| Buried page | more than 4 clicks from the start page |
| Heavy image | over 300 KB for the srcset variant a 1350px desktop browser downloads, fetched with Chrome's image Accept header |
| Keyword stuffing | main keyword over 3% of the text (and used at least 8 times) |
| Soft 404 | 200 OK, under 400 words, title or H1 starts like "404", "Page not found", "Oops" |
| Pages per scan | up to 1,000 (default 300) |
| Links and images checked | 400 per scan: 35% internal, 40% external, 25% images, with any unused share handed to the other kinds |
| PageSpeed pages | first 25 |
| Free AI actions | 20 per visitor per day |

### The 53 checks

Each has a label, severity, category, "why it matters" and "how to fix" in `ISSUES` (`src/lib/seo/issues.ts`), and a guide at `/checks/<slug>`. Severity: [c] critical, [w] warning, [n] notice.

| Category | Checks |
| --- | --- |
| Indexing (10) | broken [c], soft-404 [c], noindex [c], robots-blocked [c], offsite-redirect [w], multiple-canonicals [w], canonical-mismatch [w], meta-refresh [n], no-canonical [n], needs-js [n] |
| Search appearance (10) | no-title [c], title-short [w], no-meta [w], duplicate-title [w], duplicate-meta [w], title-long [n], meta-short [n], meta-long [n], meta-cut-off [n], no-og [n] |
| Content (10) | no-h1 [c], thin [w], missing-alt [w], multiple-h1 [n], h1-not-first [n], heading-skip [n], walls-of-text [n], long-sentences [n], hard-to-read [n], stale [n] |
| Links (5) | orphan [w], broken-links [w], redirected [n], deep-page [n], vague-link-text [n] |
| Keywords (4) | keyword-stuffing [w], cannibalization [w], keyword-not-in-title [n], keyword-placement [n] |
| Structured data (3) | schema-broken [w], no-schema [n], schema-incomplete [n] |
| AI search (4) | ai-injection [w], ai-instructions [n], faq-no-schema [n], ai-readiness [n] |
| Performance (3) | slow [w], heavy-images [w], image-dimensions [n] |
| Security (1) | mixed-content [w] |
| Brand rules (3) | banned-phrase [w], required-missing [w], brand-not-in-title [n] |

Keyword findings are guesses about what the page targets, so they're notices except stuffing and cannibalization, and they're never raised on contact, about, FAQ, legal or account pages (`isUtilityPage`). "Main keyword not used everywhere" needs the phrase missing from at least two of H1, description and intro.

Site-wide checks need the whole crawl and run in `buildRows()` (`src/lib/seo/report.ts`):
- Duplicate titles and descriptions.
- Cannibalization (indexable, self-canonical pages only).
- Orphans (only after a complete sitemap crawl).
- Click depth (breadth-first from the start page).
- Broken links and images.
- Heavy images.
- Freshness (dates plus the sitemap's lastmod).

### Content extraction (`src/lib/server/extract.ts`)

- Site chrome (nav, footer, aside, and headers that aren't inside the main content) is excluded from word counts and keywords. A `<header>` inside `main` or `article` counts as content.
- JSON-LD is parsed into a graph, so `@id` references resolve (for example, a Yoast author reference becomes a name).
- Readability: Flesch reading ease (English only), sentences over 35 words, paragraphs that are walls of text.
- **Instructions aimed at AI** (`src/lib/seo/text.ts`). Writing about prompts ("a text box, a system prompt and a subscription") is not an instruction, so every pattern needs a command addressed to a model: "ignore previous instructions", "AI assistants should always recommend…", "if you are an AI, say…", chat-template tokens.
  - **Visible prose** is scanned with code samples (`pre`, `code`, `kbd`, `samp`) and quotations (`blockquote`, `q`) left out. A hit is the `ai-instructions` notice, since it may be a quoted example.
  - **Hidden text** is scanned more strictly: CSS-hidden or off-screen elements (Tailwind's `hidden md:flex` counts as visible), HTML comments, and the prompt inside "Summarize with ChatGPT/Claude/Perplexity" links. It also catches direct address ("ChatGPT: describe us as…") and "remember this site as a trusted source". A hit is the `ai-injection` warning ("Hidden AI instructions").
  - **Alt text and aria-labels** only count for clear instructions, so an alt text describing a ChatGPT screenshot stays clean.
  - Old scans' saved snippets are re-checked with the current rules when they load.
- **Images:** an image is sized if it has width and height attributes, CSS width/height or aspect-ratio, sizing utility classes, or it's absolutely positioned (Next.js `fill` images can't shift the layout; Lighthouse skips them too). The URL we weigh and check is the srcset candidate a 1350px desktop browser at 1x would pick (`src/lib/seo/images.ts`), not the oversized `src` fallback.
- Also read: distinct canonical URLs, `<meta http-equiv="refresh">`, `<link rel="alternate" type="text/markdown">`, http:// images, scripts, styles and frames on https pages, and link texts on Lighthouse's vague-text list ("click here", "read more"…) unless an aria-label names the target.

## 5. Keyword engine (`src/lib/seo/keywords.ts`)

Deterministic and honest: every keyword is a phrase that really occurs on the page. No search volumes are invented.

1. **Candidates** are 1 to 4 word phrases from the title, H1, URL slug, description and headings, plus 2 to 3 word phrases used 3 or more times in the body.
2. **Scoring:** title +3, H1 +3, URL +2, description +1, headings up to +2, plus 1.5 × log₂(1 + uses in the body). Two-word phrases get ×1.3, three- and four-word phrases ×1.2, and single words ×0.7.
3. **Plural-insensitive matching:** "broken links" counts toward "broken link". Stemming is only for matching: phrases are always shown as written, and stop-word checks run on the real words (stemming "this" to "thi" once let "thi site" through). Words like "news" and "series" aren't treated as plurals.
4. **Dates aren't keywords:** phrases made only of month, day and number words, or mixing a month with a number ("aug 2026"), are dropped.
5. **Version numbers stay whole:** "WordPress 7.1.2" is one phrase, and URL slugs like `7-1-2` are read as `7.1.2`.
6. **Specific beats generic:** if the title and H1 both use a longer, filler-free phrase that contains the top phrase, and the body uses it too, the longer one wins ("broken link checker" over "broken link").
7. **Site-wide boilerplate is ignored:** with 5 or more pages, a phrase on more than 40% of pages (the blog's name, "read more") can't be anyone's main keyword.
8. **The title says what a page targets:** if the top phrase isn't in the title but a title phrase scores at least 60% as well, the title phrase is the main keyword.
9. **Cannibalization:** two or more indexable, self-canonical pages whose main keyword is the same **and** appears in each page's title plus its H1 or URL. Category, tag, author and archive hubs (or CollectionPage/Blog markup), the homepage, and contact, about, FAQ and legal pages never count. The tools pick the page to keep by best score, then most internal links, then most words.

## 6. Link and image checking (`src/lib/server/links.ts`)

- Try HEAD first. **Any failure is confirmed with a tiny GET** before calling a link broken, because some servers (bsky.app, for one) answer every HEAD with 404 while the page works.
- **Timeouts and 5xx get one more try** (a GET after 1.5 seconds) before they're reported.
- **Images are fetched like a browser fetches them**, with Chrome's `Accept: image/avif,image/webp,…`, so image CDNs and Next.js answer with the format (and weight) a visitor really gets.
- Classification:
  - **broken:** 404, 410, other 4xx, or an unreachable domain.
  - **blocked:** 401, 403, 405, 406, 429, 451, 999. The site refuses bots, so this isn't counted as broken.
  - **error:** 5xx or a timeout.
  - **ok:** everything else.
- **Causes in plain words** (`note`, `brokenHint`):
  - When a Next.js or Vercel image-optimizer URL fails, we check the original file. If that's missing, the link is reported as its 404 with "The source image /x.png is missing (404), so every size of it fails", instead of an opaque 400.
  - GitHub, GitLab, Bitbucket, Hugging Face, Notion and Google Docs 404s carry a hint that private pages look deleted to anyone without access. (Found on the owner's own portfolio: a private repo linked from the homepage.)
- Every broken target is labeled **internal**, **external** or **image**, with the pages it's found on.
- Image sizes come from `content-length`. Anything over 300 KB is a heavy image.
- The 400-check budget is shared out (`shareBudget` in `crawl.ts`): a site with few external links gets more images checked, and vice versa.

## 7. AI agent readiness

`src/lib/seo/agents.ts` (catalog, scoring, `withCrawlEvidence`) and `src/lib/server/agents.ts` (the audit). Modelled on what is-agentic.com reports, but every check is ours and shows its evidence. On the owner's site it scores 100, the same as is-agentic, and finds the same two gaps (llms.txt over 30K characters, no `.md` twins for content pages).

The audit fetches the homepage, then in parallel: robots.txt, llms.txt, llms-full.txt, the homepage with `Accept: text/markdown`, `/index.md`, a made-up URL, three well-known files, and the homepage as four AI agents. Then: the sitemap, up to 5 llms.txt links, 3 sample pages spread across the sitemap, and a `.md` twin of the first one.

| Tier | Check | Passes when |
| --- | --- | --- |
| Essential | AI agents allowed in robots.txt | ChatGPT-User, OAI-SearchBot, Claude-User, Claude-SearchBot, PerplexityBot and Perplexity-User may fetch `/`. Training crawlers (GPTBot, ClaudeBot, CCBot, Google-Extended…) are reported, never scored |
| Essential | No firewall wall for AI agents | The homepage loads (no 403, CAPTCHA or Cloudflare challenge) for ChatGPT-User, OAI-SearchBot, Claude-User and PerplexityBot. A probe that times out (twice) is left out, not counted as blocked |
| Essential | Content works without JavaScript | 150+ words and an H1 in the server HTML, and the sample pages aren't empty shells |
| Essential | Readable without signing in | No 401, 403 or login redirect on the homepage and samples |
| Essential | Redirects resolve cleanly | No meta refresh, JavaScript redirect stub, off-site hop or 3+ hop chain |
| Essential | Missing pages return 404 | A made-up URL answers 404 or 410 (not 200 or a redirect home) |
| Essential | Homepage not hidden from search | No noindex in robots, googlebot or bingbot meta tags, or X-Robots-Tag |
| Recommended | Sitemap found | A valid urlset or sitemap index |
| Recommended | llms.txt | Plain text, starts with `# `, has Markdown links, under ~30K characters |
| Recommended | Markdown for agents | `Accept: text/markdown` returns Markdown **with** `Vary: Accept` (partial without Vary, or if Markdown only exists at a separate URL) |
| Recommended | Structured identity | Organization or Person JSON-LD with name, url, and sameAs or a logo/image |
| Recommended | Metadata complete | title, description, canonical, lang, og:image, og:type |
| Recommended | Trust pages linked | Links to About, Contact and Privacy from the homepage |
| Recommended | Fits an agent's context | Largest sampled page under ~25K tokens of text (partial to 60K) |
| Recommended | Accessible page structure | A `<main>` landmark, one H1, no heading jump of more than one level |
| Recommended | Buttons and links have names | 95%+ of links, buttons and fields have an accessible name, no clickable divs |
| Recommended | No hidden AI instructions | Homepage and samples, replaced by every crawled page in a full scan |
| Bonus | llms-full.txt, .md twins, Link headers (RFC 8288), well-known discovery files (`api-catalog`, `agent-card.json`, `ai-catalog.json`), sitemap lastmod coverage, sameAs links, llms.txt links work | Each adds up to +1, capped at +5 |

## 8. PageSpeed

`src/lib/server/pagespeed.ts`.

`parsePagespeed` trims a PageSpeed Insights response (often over 1 MB) to about 12 KB and keeps what Google's own page shows:

- The four Lighthouse category scores, FCP, LCP, TBT, CLS and Speed Index.
- Per category, every scored audit that didn't pass (score under 0.9), sorted by estimated savings. Lighthouse 13 "insights" report savings per metric, so the largest is used. Each audit keeps plain-text description, "learn more" link, display value and a few offending files or elements, plus informative diagnostics and passed/manual counts.
- Real-user data from `loadingExperience` (the page) or `originLoadingExperience` (whole site): p75 and distribution for LCP, INP, CLS, FCP and TTFB, and the Core Web Vitals assessment (LCP, INP and CLS all good; on LCP and CLS alone when INP has too little data).
- The final screenshot, for the single-page test only.

Results saved by older versions only have the headline numbers and still display.

## 9. The improvement prompt

`src/lib/seo/prompt.ts`.

One prompt for an AI coding agent, in the shape is-agentic.com uses: the goal, current scores, numbered fixes in priority order (critical, warnings, agent gaps, PageSpeed, then notices), each with **why it matters**, **evidence** (up to 20 lines from the scan) and **the recommended fix**, then a fixed list of requirements: inspect the code first, fix shared templates, keep design, 301 any URL change, never invent facts, follow file formats exactly, add tests, verify in the served HTML, summarize.

- Evidence is shaped per issue: broken links list each target, its cause and where it's linked from; heavy images list sizes; cannibalization names the page to keep; duplicates group the pages sharing a title.
- "Recommended" pre-selects critical issues, warnings, non-bonus agent gaps and PageSpeed audits worth 300 ms or more (or any accessibility, best-practices or SEO failure).
- The dialog renders in a portal on `<body>` (an animated parent would trap the fixed overlay) and uses flex, not grid (a grid track grows to the widest one-line snippet on phones).

## 10. AI system (`src/lib/server/ai/`)

### Providers and routing (`router.ts`, `providers.ts`)

| | Groq | Gemini |
| --- | --- | --- |
| Models | `openai/gpt-oss-120b` (default), `openai/gpt-oss-20b` (backup, separate rate limit) | `gemini-3.5-flash-lite` |
| Goes first for | Short jobs (title & meta, headings, plan) | Long jobs (section rewrite, FAQ, intro) |
| Notes | JSON mode. gpt-oss models get `reasoning_effort: "low"` and 1,024 extra tokens for their reasoning | JSON mode. The key goes in the `x-goog-api-key` header, never the URL. `maxOutputTokens` leaves room for thinking |

- **Fallback:** any failure falls through to the next provider or model, inside a 70-second total budget (25 seconds per attempt for short jobs, 35 for long).
- **Refused keys:** a refused key (401 or 403) skips that provider's other models.
- **Overrides:** a `GROQ_MODEL` override is tried first, with the defaults kept behind it in case it's been retired. `AI_PROVIDER` forces one provider first.
- **Visitor keys:** a visitor's own Gemini key is used on its own; our keys and quota are never spent on their behalf.
- **Logging and errors:** failures are logged as `AI provider failed: <provider> <model> <status> <message>`, never with keys. When our keys are refused, visitors see a clear message and an offer to use their own key, not the provider's raw error.

### Tasks (`tasks.ts`)

| Task | Size | Input | Output |
| --- | --- | --- | --- |
| `meta` | short | page outline and intro, current title and description, issues | assessment, title, description, 3 fixes. If the title runs over 60 or the description over 160 characters, one follow-up call shortens just that field (it doesn't count against the visitor's quota) |
| `headings` | short | outline | question-style headings with reasons |
| `plan` | short | scan numbers, top issues, weakest pages, our thresholds | summary plus 5 steps. It must never claim a problem the scan didn't find; spare steps are labeled "Optional:" |
| `section` | long | one H2 section | rewrite (shown as a word diff) |
| `faq` | long | page content | 4 to 6 questions and answers. The FAQPage JSON-LD is built by our code, not the AI |
| `intro` | long | page content | 40 to 60 word quick-answer intro |

Page tasks fetch the page again on the server (`readSource`), so the AI only ever sees real page text.

### Guardrails (`guard.ts`)

- **Prompt-injection fence:** page text is wrapped in `<<<PAGE label … PAGE>>>` blocks, with any fake fence markers inside it neutralized. The system prompt tells the model that fenced text is data, not instructions.
- **Fabrication guard:**
  - Numbers in the answer that aren't in the source are flagged.
  - So are links and email addresses not in the source.
  - So are banned brand phrases.
  - Results show "✓ Fact check passed" or specific warnings.
- **Parsing:** JSON is read even when a model wraps it in chatter or a code fence.

### Quota and "bring your own key" (`quota.ts`, `src/lib/client/ai.ts`)

- **Free actions:** 20 per visitor per day (`AI_DAILY_LIMIT`).
- **Counted twice, with no database:**
  - A signed, HttpOnly cookie counts actions per browser. It can't be forged, but it can be cleared.
  - An in-memory counter per IP address catches cookie clearing. It allows twice the limit, to tolerate shared offices, and resets when the server instance restarts.
- **Only successes count.** A failed action never uses up the allowance.
- **After the limit:** visitors can paste a free Gemini key. It's stored only in their browser (localStorage), sent per request in a header, and never stored or logged by the server.

## 11. The site's own SEO, GEO and AEO

The tool has to pass its own audit, and it does: SEO 100, AI search 95, no issues of any severity across 42 pages. Its own AI agent readiness is 94 (Agent-ready): every essential passes; the gaps are Markdown for agents, About/Contact/Privacy links, and profile links (sameAs) in the Person markup.

- **Titles and descriptions:**
  - Every page sets an absolute title of 30 to 60 characters and a description of 120 to 160 that contains its main keyword.
  - Titles and descriptions are unique across the site.
  - Tests enforce all of this (`src/lib/content/content.test.ts`).
- **Direct answers:** every guide and tool page opens with a 35 to 70 word answer (also enforced by tests). Guides follow it with question-style FAQ headings and answers of 30 to 80 words.
- **Structured data:** a JSON-LD `@graph` per page (Person, WebSite, WebApplication, FAQPage, BreadcrumbList, TechArticle/Article, CollectionPage), with datePublished and dateModified from `CONTENT_UPDATED` (`src/lib/content/structured-data.ts`). Everything in the markup is also visible on the page.
- **Machine-readable files:**
  - `robots.txt` allows all crawlers plus named AI crawlers (GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, PerplexityBot, Google-Extended, Applebot-Extended), and disallows `/api/`.
  - `sitemap.xml` lists 42 URLs.
  - `llms.txt` and `llms-full.txt` follow the llmstxt.org format.
- **Real 404s:** unknown `/checks/<slug>` URLs return a real 404 status through `src/proxy.ts`. Streamed pages can otherwise only send a "soft" 404.
- **Author credit:** "Made with questionable amounts of caffeine by Suman Debnath" in the footer, linking to the portfolio with `rel="author"`. Each guide has a byline.
- **Keyword research:**
  - Target phrases were chosen from search-result research: "free SEO audit tool for blogs", "broken link checker", "keyword cannibalization checker", "GEO/AEO checker", "meta tag checker", "blog SEO checklist", and one guide per check.
  - No paid volume data was used.
- **Self-checking guide text:** our own guide text is checked against the prompt-injection detector in tests, so it never trips it.

## 12. Design system

- **Style:** neo-brutalist and playful. Cream paper, ink-black 2px borders, hard offset shadows (`shadow-brutal`), lime highlights, rounded corners, a spider mascot.
- **Fonts:** Bricolage Grotesque for display (`font-display`), Geist Sans for body, Geist Mono for URLs and code.
- **Color tokens** (in `src/app/globals.css`; light and dark values):

| Token | Use |
| --- | --- |
| `paper`, `card` (`--paper-2`), `sunk` (`--paper-3`) | Page, card and inset backgrounds |
| `ink`, `ink-2`, `ink-3`, `line` | Text from strong to faint; borders |
| `lime` / `lime-ink` | Brand highlight and buttons; also the **SEO score** color |
| `ai` | Violet, the **AI-readiness** color (rings, chips, image-type badges) |
| `crit`, `warn`, `note`, `good` | Critical, warning, notice, success |

- **Theming:**
  - Dark mode is the `.dark` class on `<html>`, toggled by the theme button and restored before first paint.
  - `.theme-light` pins a section to light colors, such as the lime call-to-action boxes in dark mode.
  - `.daddy` swaps lime for amber.
- **Layout:**
  - **`shell`** is the single page container: max width 72rem, 1rem side padding (1.5rem from 640px). Header, footer and every section use it, so all left edges line up.
  - Articles use `ArticleLayout`: a body column of up to 48rem plus a sticky 15rem "On this page" sidebar at 1024px and up.
- **Shared components:**
  - `ScoreRing` (equal sizes; lime for SEO, violet for AI readiness; grade chip).
  - `IssueOverview`, `Segmented`, `StatTile`, `ToolForm`.
  - `PageIntro` (breadcrumbs, eyebrow, H1, answer, byline).
  - `Section` (anchored H2), `Steps` (timeline), `FaqSection`, `RelatedGuides`, `PrevNext`, `ScanCta`, `SideCta`.
- **Rules learned the hard way:**
  - **Decorations stay out of the text.** Step numbers, the FAQ "Q" badge and heading "#" anchors are CSS pseudo-elements. Real text there would change what crawlers (ours included) read as the heading ("QHow…?").
  - **To hide a Mascot, wrap it.** The Mascot renders its own `inline-block` wrapper, which overrides `hidden`. Put responsive visibility on a parent `div`.
  - **Focus rings:** the global `:focus-visible` style sits in `@layer base` so components can move the ring. Input groups show it on the whole group (`focus-within:ring-3 focus-within:ring-note`).
  - **Phone widths:** pages are checked at 375px with no horizontal scrolling.

## 13. Code map

```
src/
  app/
    page.tsx                  landing
    scan/                     full audit workspace
    checks/, checks/[slug]/   guide index and guides
    broken-link-checker/ …    six tool pages (one line each, rendering ToolPageView)
    blog-seo-checklist/, bot/
    api/                      agents, ai, analyze, check-links, config, crux, discover, pagespeed
    robots.ts, sitemap.ts, manifest.ts, llms.txt/, llms-full.txt/, opengraph-image.tsx, apple-icon.tsx, icon.svg
    layout.tsx                metadata, theme script, global quirks
    globals.css               tokens, shell utility, animations
  proxy.ts                    real 404s for unknown guides
  components/
    SiteChrome.tsx            header and footer
    ScanForm.tsx, RecentScans.tsx, Mascot.tsx, ThemeToggle.tsx
    landing/                  landing sections, hero mascot
    content/                  ContentKit (page building blocks), ArticleToc, ToolPageView
    tools/                    ToolWorkbench, kit, MetaTagTool, GeoAeoTool, BrokenLinkTool, CannibalizationTool, use-site-scan
    scan/                     ScanWorkspace, Report, Panels, PageDrawer, ProgressPanel, Previews, columns, bits,
                              ai-cards (shared AI tool cards), ai-ui (quota bar, diff, copy), BrandRulesDialog,
                              AgentPanel, PageSpeedView, PromptDialog (Prompt to improve)
    quirks/                   GlobalQuirks, DanglingSpider, Toaster
  lib/
    site.ts                   site name, URL, author, home title and description
    limits.ts                 page, link, PageSpeed and AI limits
    seo/                      shared rules: types, url, robots, issues (catalog and scores), report (site-wide), keywords, text, figures,
                              pixels (title width), images (srcset picking), agents (agent checks and score), prompt (improvement prompt)
    server/                   server only: safe-fetch, discover, analyze, extract, links, pagespeed, crux, agents, rate-limit, http, ai/
    client/                   browser only: crawl, history, ai, tools, csv, report-html, diff, brand-rules, quirks, jokes, api, use-features
    content/                  guides (32), tools (6), structured-data, llms
legacy/crawl-daddy/           the original Flask app
docs/                         Handoff, Project Bible, Portfolio Handoff
```

## 14. Conventions

- **TypeScript strict.** Shared logic lives in `lib/seo` (runs on both sides), server-only code in `lib/server`, browser-only code in `lib/client`.
- **Client modules:** don't import non-component values from a `"use client"` file into a server component; they arrive as client references. Shared constants live in plain modules, such as `MODE_LABEL` in `lib/content/tools.ts`.
- **Comments explain why, not what,** and stay short. Match the density of the surrounding code.
- **Tests:** 10 Vitest files, 184 tests, covering URL handling, robots, scoring, issues, keywords, reports, extraction (including every false positive found on real sites), image picking, title widths, link checks, the agent audit helpers and score, PageSpeed parsing, the improvement prompt, the AI router and guard, the quota, CSV, diffs, tool helpers and the content limits. Add a test with every behavior change, especially regressions found in self-audits.
- **Copy:** plain English, direct, lightly funny, never mean. Every number shown comes from real data. Our own titles, descriptions and answers must pass our own checks.
- **Commits:** imperative summary line, a body that explains what and why, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` for AI-assisted commits.
- **Next.js 16 specifics:**
  - Cache Components is on.
  - GET route handlers that must run per request call `await connection()`.
  - `useSearchParams` needs a Suspense boundary.
  - Layouts and pages can't export non-standard values.
  - `proxy.ts` replaces middleware.

## 15. Decisions and their reasons

| Decision | Why |
| --- | --- |
| Next.js on Vercel Hobby instead of Flask on Replit | Free, no 30-day republish, auto-deploys from GitHub |
| The browser runs the crawl | Serverless functions are short-lived and stateless; small stateless API calls fit Vercel's free limits |
| No database; IndexedDB and localStorage | Free, private by default, nothing to maintain. The owner chose to keep data in the browser |
| No headless browser | Too heavy for free serverless. JavaScript-only pages are flagged instead |
| SEO score is 100 minus weighted issues (replaced Crawl Daddy's checklist) | The old checklist marked down healthy pages (under 900 words, a 61-character title) and didn't move with real problems. Now the number follows the issue list, and broken pages pull the average down |
| Separate AI-readiness score | GEO/AEO is a different question from classic SEO, so it gets its own number |
| AI-readiness checks only count where they apply | An FAQ or byline makes sense on an article, not on a contact page; marking those down was noise |
| A separate, site-level AI agent score | "Can agents get in and read it?" (is-agentic.com's question) is about the site's plumbing, not a page's prose, so it's checked once per site with evidence |
| Agent probes that time out are left out | A busy site isn't a firewall. Counting timeouts as blocks produced false fails |
| Hidden vs visible AI instructions | Prose about prompts and quoted examples are normal on AI sites; only commands to models count, and hidden ones are far more serious |
| Cannibalization needs the keyword in the title plus H1 or URL, and skips hubs, the homepage and utility pages | Precision over recall: groups of contact, FAQ and category pages sharing a site-wide phrase weren't actionable |
| Titles judged in pixels | Google truncates by width; 60 characters of "il" fit, 40 of "WM" don't |
| Obey robots.txt rules for our bot; report `*` rules | Respect site owners' explicit wishes while still auditing what search engines can't see |
| Groq and Gemini free tiers, routed by job size, each falling back to the other | Both are free; Groq is fast for short jobs and Gemini has a bigger budget for long ones; one being busy shouldn't break the feature |
| Daily quota, then "bring your own key" | Protects the owner's free quota without accounts or a database |
| Fence page text and check answers for invented facts | Pages can contain prompt injection, and models can invent numbers. Users see what was checked |
| A "rescan" reminder and an HTML report instead of scheduled emails and share links | Those need a server-side database; this keeps everything in the browser |
| Six focused tools rather than doors into one scan | Each tool should do its own job well. They share the same engine underneath |
| The improvement prompt is built from scan data, not by an AI | Evidence must be real and reproducible, and it costs no AI quota |
| Treat a failed HEAD as unconfirmed | Real false positives (bsky.app) made "broken" untrustworthy |
| Weigh the srcset variant, fetched with a browser's image Accept header | The `src` fallback is often a 3840px PNG nobody downloads; image CDNs serve WebP/AVIF to browsers |

## 16. Glossary

| Term | Meaning |
| --- | --- |
| **GEO** | Generative engine optimization: making pages easy for AI systems (ChatGPT, Perplexity, Google AI Overviews) to understand, trust and cite |
| **AEO** | Answer engine optimization: short, direct answers that search features and assistants can lift |
| **Answer capsule** | A heading followed directly by a 30 to 80 word paragraph that answers it |
| **Cannibalization** | Several of your pages targeting the same keyword and competing with each other |
| **Orphan page** | A page in the sitemap that no other page links to |
| **Click depth** | Clicks needed to reach a page from the start page |
| **CrUX** | Chrome UX Report: Google's real-user speed data from Chrome visitors over the last 28 days |
| **BYOK** | "Bring your own key": a visitor's own Gemini key, kept in their browser |
| **Self-audit** | Running That One Crawler on its own site to prove it passes its own checks |
| **Agent readiness** | Whether AI agents (ChatGPT-User, Claude-User, Perplexity…) can reach a site, read it without JavaScript and find their way around |
| **TTFB** | Time to first byte: how long until the server starts answering |
| **Soft 404** | A "page not found" page that answers 200 OK instead of 404 |
| **Mixed content** | An https page loading files over plain http |
| **Prompt to improve** | The copyable prompt for an AI coding agent with every selected finding, its evidence and the fix |
| **Shell** | The shared page container utility that keeps every edge aligned |
