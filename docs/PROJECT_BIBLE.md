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
7. [AI system](#7-ai-system)
8. [The site's own SEO, GEO and AEO](#8-the-sites-own-seo-geo-and-aeo)
9. [Design system](#9-design-system)
10. [Code map](#10-code-map)
11. [Conventions](#11-conventions)
12. [Decisions and their reasons](#12-decisions-and-their-reasons)
13. [Glossary](#13-glossary)

---

## 1. Product

**That One Crawler** is a free SEO audit tool for blogs. Paste a URL and it crawls the whole site (up to 1,000 pages), scores every page for classic SEO and for AI-search readiness (GEO/AEO), and explains every problem in plain English with how to fix it.

- **Tagline:** "Your blog has issues. This free SEO audit finds every single one."
- **Origin:** a rebuild ("reprise") of the owner's earlier Replit app, Crawl Daddy (Flask + Playwright). Replit forced a republish every 30 days; this version runs on a free Vercel Hobby plan with nothing to babysit. The original code is kept in `legacy/crawl-daddy`.
- **Audience:** bloggers and small site owners who want a straight answer to "what's wrong with my blog and what do I fix first?", without signups or paid tools.
- **Voice:** brutally honest but kind, and funny. A spider mascot judges your blog ("Honestly? Annoyingly good.", "B-minus energy. Very fixable, though."). Jokes never get in the way of the information.
- **Price:** free, with no account. AI help has a daily free allowance, then visitors can paste their own free Gemini key.
- **Privacy:** no database. Scans are stored in the visitor's own browser.

## 2. Features

### Full audit (`/scan`)

1. **Discover:** follow redirects, read robots.txt, gather sitemap URLs (newest posts first). With no sitemap, it follows links from the homepage instead. Entering a path (`myblog.com/blog`) limits the scan to that section.
2. **Crawl:** about six pages in flight (2 requests × 3 URLs), up to the chosen page limit (25 to 1,000; default 300).
3. **Check links and images** (on by default): up to 400 URLs beyond the crawled pages.
4. **PageSpeed** (optional): Google PageSpeed Insights for the first 25 pages.
5. **Report:**
   - Verdict with two score rings (SEO and AI readiness), severity chips and the mascot's mood.
   - Issue overview grouped into Critical, Warnings and Notices. Clicking an issue filters the page list.
   - Tabs:
     - **Pages:** sortable, filterable table with column groups (Basic SEO, Technical, Content, Social, PageSpeed) and CSV export.
     - **Links:** broken links and images with the pages they're on, orphan pages, pages buried more than 4 clicks deep, most-linked pages.
     - **Keywords:** cannibalization groups with a "Keep" pick, possible keyword stuffing, keyword map.
     - **Changes:** compare with an earlier scan of the same site (score deltas, issues fixed and new, pages that improved or got worse).
     - **✦ Action plan:** a five-step AI plan from the scan's numbers.
6. **Page drawer** (click any page):
   - **Overview:** Google preview, issues with why and how to fix, social card.
   - **Content:** title and description lengths, main keyword and where it appears, AI-readiness checklist, heading outline, readability, freshness, brand rules.
   - **Links & tech:** indexability, canonical, schema, links, images, PageSpeed and real-user speed (CrUX).
   - **✦ AI tools:** title & meta rewrite, quick-answer intro, better headings, section rewrite, FAQ generator with JSON-LD.
7. **Extras:**
   - **Brand rules:** brand name, banned phrases and required phrases per site, stored in the browser.
   - **Downloadable HTML report.**
   - **History:** the last 25 scans in IndexedDB, with a "Time for a rescan?" nudge after 7 days.
   - **Live progress:** the tab title shows progress while scanning.

### Four focused tools

Each tool page has its own working tool in a card that overlaps the page intro.

| Tool | Mode | What it does |
| --- | --- | --- |
| `/meta-tag-checker` | One page | Tag inspector (title, description, H1, canonical, robots, language, Open Graph, Twitter, structured data, hreflang), each marked good, warning or missing. Pixel-measured Google preview, social card, AI title and description rewrite |
| `/geo-aeo-checker` | One page | AI-readiness score ring with verdict, the seven-point checklist with tips, signals found on the page, prompt-injection warning. AI drafts for an intro, headings and an FAQ |
| `/broken-link-checker` | Site crawl (links on) | Pages crawled, links tested, broken, refused bots, heavy images. Results switch between Broken, Refused bots, Errors, Heavy images and Everything, each with "found on" pages and a CSV |
| `/keyword-cannibalization-checker` | Site crawl (links off) | Competing groups with the strongest page marked "★ Keep", possible stuffing, a searchable keyword map with Title/H1/Desc/URL columns, and a CSV |

Site tools save their crawl like any scan, so "Open the full report" shows everything else.

### Content site

| Page | Purpose |
| --- | --- |
| `/` | Landing: hero with the scan form, findings marquee, recent scans, "What is a blog SEO audit?", things we judge, the four tools, how it works, reviews, FAQ, final call to action |
| `/checks` | Index of 30 guides grouped by category |
| `/checks/[slug]` | 30 guides that together cover all 47 checks: direct answer, why it matters, how to fix it, how we check it, FAQ, related guides, previous/next |
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
  │ POST /api/analyze      fetch and extract up to 10 URLs per call (the crawler sends 3, 2 calls at a time)
  │ POST /api/check-links  HEAD (then GET if needed) up to 20 URLs per call
  │ POST /api/pagespeed    one PageSpeed Insights call
  │ POST /api/crux         one Chrome UX Report lookup (page, then whole-site fallback)
  │ POST /api/ai           one AI task (quota-checked)
  │ GET  /api/ai           this visitor's remaining free AI actions
  │ GET  /api/config       which optional features are switched on
  ▼
buildRows() + summarize() in the browser → report UI → IndexedDB ("that-one-crawler": scans, summaries)
```

### API routes

| Route | Rate limit (per IP, per instance) | Max duration | Notes |
| --- | --- | --- | --- |
| `/api/discover` | 20 per minute | 60s | Up to 40 sitemap fetches, 3 levels deep |
| `/api/analyze` | 240 per minute | 60s | 1 to 10 URLs per request, plus `baseDomain` and optional brand rules |
| `/api/check-links` | 120 per minute | 60s | 1 to 20 http(s) URLs per request |
| `/api/pagespeed` | none (known gap) | 60s | Needs `PAGESPEED_KEY` |
| `/api/crux` | 30 per minute | 40s | Uses `PAGESPEED_KEY`; the Chrome UX Report API must be enabled |
| `/api/ai` | 10 per minute burst, plus the daily quota | 90s | Visitor key in the `x-gemini-key` header skips the quota |
| `/api/config` | none | n/a | Feature flags for the UI |

### Safe fetching (`src/lib/server/safe-fetch.ts`)

- Refuses private, loopback and internal network addresses (SSRF protection) unless `ALLOW_PRIVATE_URLS=1`, which is for local testing only.
- Follows redirects by hand: at most 5, never off the site being scanned, and every hop is re-checked against the address rules.
- 15-second timeout and a 3 MB response cap. HEAD support for link checks.
- User agent: `Mozilla/5.0 (compatible; ThatOneCrawler/1.0; +https://that-one-crawler.vercel.app/bot)`.

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

Deliberately **identical to Crawl Daddy's formula**, so old and new scores compare.

| Points | Rule |
| --- | --- |
| 20 | Has an H1 |
| 15 | Title is 30 to 60 characters |
| 15 | Meta description is 120 to 160 characters |
| 20 / 10 | 900+ words / 300 to 899 words |
| 10 | Has a canonical tag |
| 5 | Has an Open Graph title |
| 5 | No images missing alt text |
| 10 | Has structured data |

### AI-readiness score (0 to 100, GEO/AEO)

| Points | Check |
| --- | --- |
| 20 | Short answer up top: first paragraph after the H1 is 20 to 80 words (8 points if it exists but is outside that range) |
| 20 | Answer paragraphs under headings: 2 or more headings followed by a 30 to 80 word paragraph (10 for one) |
| 15 | Question-style headings: at least 25% of H2/H3s (8 if any) |
| 15 | FAQ section or FAQPage markup |
| 10 | Specific facts and numbers: 3 or more (5 for 1 or 2) |
| 10 | Lists or tables |
| 10 | Author (5) and a published or modified date (5) |

Grades on the score rings: Excellent 90+, Good 80+, Fair 60+, Weak 40+, Poor below 40.

### Thresholds (`src/lib/seo/issues.ts`, `src/lib/limits.ts`)

| Constant | Value |
| --- | --- |
| Title length | 30 to 60 characters |
| Meta description length | 120 to 160 characters |
| Thin content / full marks | under 300 words / 900+ words |
| Slow response | 3,000 ms |
| Stale post | not updated in 12 months |
| Buried page | more than 4 clicks from the start page |
| Heavy image | over 300 KB |
| Keyword stuffing | main keyword over 3% of the text (and used at least 8 times) |
| Pages per scan | up to 1,000 (default 300) |
| Links and images checked | 400 per scan (35% internal, 40% external, 25% images) |
| PageSpeed pages | first 25 |
| Free AI actions | 20 per visitor per day |

### The 47 checks

Each has a label, severity, category, "why it matters" and "how to fix" in `ISSUES` (`src/lib/seo/issues.ts`), and a guide at `/checks/<slug>`. Severity: [c] critical, [w] warning, [n] notice.

| Category | Checks |
| --- | --- |
| Indexing (7) | broken [c], noindex [c], robots-blocked [c], offsite-redirect [w], canonical-mismatch [w], no-canonical [n], needs-js [n] |
| Search appearance (10) | no-title [c], title-short [w], title-long [w], no-meta [w], duplicate-title [w], duplicate-meta [w], meta-short [n], meta-long [n], meta-cut-off [n], no-og [n] |
| Content (10) | no-h1 [c], thin [w], missing-alt [w], multiple-h1 [n], h1-not-first [n], heading-skip [n], walls-of-text [n], long-sentences [n], hard-to-read [n], stale [n] |
| Links (4) | orphan [w], broken-links [w], redirected [n], deep-page [n] |
| Keywords (4) | keyword-not-in-title [w], keyword-stuffing [w], cannibalization [w], keyword-placement [n] |
| Structured data (3) | schema-broken [w], no-schema [n], schema-incomplete [n] |
| AI search (3) | ai-injection [w], faq-no-schema [n], ai-readiness [n] |
| Performance (3) | slow [w], heavy-images [w], image-dimensions [n] |
| Brand rules (3) | banned-phrase [w], required-missing [w], brand-not-in-title [n] |

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
- Prompt-injection signals: text that tries to instruct AI assistants. A page that trips them gets the `ai-injection` issue, and AI tasks fence that text off.

## 5. Keyword engine (`src/lib/seo/keywords.ts`)

Deterministic and honest: every keyword is a phrase that really occurs on the page. No search volumes are invented.

1. **Candidates** are 1 to 4 word phrases from the title, H1, URL slug, description and headings, plus 2 to 3 word phrases used 3 or more times in the body.
2. **Scoring:** title +3, H1 +3, URL +2, description +1, headings up to +2, plus 1.5 × log₂(1 + uses in the body). Two-word phrases get ×1.3, three- and four-word phrases ×1.2, and single words ×0.7.
3. **Plural-insensitive matching:** "broken links" counts toward "broken link".
4. **Version numbers stay whole:** "WordPress 7.1.2" is one phrase, and URL slugs like `7-1-2` are read as `7.1.2`.
5. **Specific beats generic:** if the title and H1 both use a longer, filler-free phrase that contains the top phrase, and the body uses it too, the longer one wins ("broken link checker" over "broken link").
6. **Site-wide boilerplate is ignored:** with 5 or more pages, a phrase on more than 40% of pages (the blog's name, "read more") can't be anyone's main keyword.
7. **Cannibalization:** two or more indexable, self-canonical pages with the same main keyword. The tools pick the page to keep by best score, then most internal links, then most words.

## 6. Link and image checking (`src/lib/server/links.ts`)

- Try HEAD first. **Any failure is confirmed with a tiny GET** before calling a link broken, because some servers (bsky.app, for one) answer every HEAD with 404 while the page works.
- Classification:
  - **broken:** 404, 410, other 4xx, or an unreachable domain.
  - **blocked:** 401, 403, 405, 406, 429, 451, 999. The site refuses bots, so this isn't counted as broken.
  - **error:** 5xx or a timeout.
  - **ok:** everything else.
- Every broken target is labeled **internal**, **external** or **image**, with the pages it's found on.
- Image sizes come from `content-length`. Anything over 300 KB is a heavy image.

## 7. AI system (`src/lib/server/ai/`)

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

## 8. The site's own SEO, GEO and AEO

The tool has to pass its own audit, and it does: SEO 91, AI readiness 93, no issues of any severity across 38 pages.

- **Titles and descriptions:**
  - Every page sets an absolute title of 30 to 60 characters and a description of 120 to 160 that contains its main keyword.
  - Titles and descriptions are unique across the site.
  - Tests enforce all of this (`src/lib/content/content.test.ts`).
- **Direct answers:** every guide and tool page opens with a 35 to 70 word answer (also enforced by tests). Guides follow it with question-style FAQ headings and answers of 30 to 80 words.
- **Structured data:** a JSON-LD `@graph` per page (Person, WebSite, WebApplication, FAQPage, BreadcrumbList, TechArticle/Article, CollectionPage), with datePublished and dateModified from `CONTENT_UPDATED` (`src/lib/content/structured-data.ts`). Everything in the markup is also visible on the page.
- **Machine-readable files:**
  - `robots.txt` allows all crawlers plus named AI crawlers (GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, PerplexityBot, Google-Extended, Applebot-Extended), and disallows `/api/`.
  - `sitemap.xml` lists 38 URLs.
  - `llms.txt` and `llms-full.txt` follow the llmstxt.org format.
- **Real 404s:** unknown `/checks/<slug>` URLs return a real 404 status through `src/proxy.ts`. Streamed pages can otherwise only send a "soft" 404.
- **Author credit:** "Made with questionable amounts of caffeine by Suman Debnath" in the footer, linking to the portfolio with `rel="author"`. Each guide has a byline.
- **Keyword research:**
  - Target phrases were chosen from search-result research: "free SEO audit tool for blogs", "broken link checker", "keyword cannibalization checker", "GEO/AEO checker", "meta tag checker", "blog SEO checklist", and one guide per check.
  - No paid volume data was used.
- **Self-checking guide text:** our own guide text is checked against the prompt-injection detector in tests, so it never trips it.

## 9. Design system

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

## 10. Code map

```
src/
  app/
    page.tsx                  landing
    scan/                     full audit workspace
    checks/, checks/[slug]/   guide index and guides
    broken-link-checker/ …    four tool pages (one line each, rendering ToolPageView)
    blog-seo-checklist/, bot/
    api/                      ai, analyze, check-links, config, crux, discover, pagespeed
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
                              ai-cards (shared AI tool cards), ai-ui (quota bar, diff, copy), BrandRulesDialog
    quirks/                   GlobalQuirks, DanglingSpider, Toaster
  lib/
    site.ts                   site name, URL, author, home title and description
    limits.ts                 page, link, PageSpeed and AI limits
    seo/                      shared rules: types, url, robots, issues (catalog and scores), report (site-wide), keywords, text, figures
    server/                   server only: safe-fetch, discover, analyze, extract, links, pagespeed, crux, rate-limit, http, ai/
    client/                   browser only: crawl, history, ai, tools, csv, report-html, diff, brand-rules, quirks, jokes, api, use-features
    content/                  guides (30), tools (4), structured-data, llms
legacy/crawl-daddy/           the original Flask app
docs/                         Handoff, Project Bible, Portfolio Handoff
```

## 11. Conventions

- **TypeScript strict.** Shared logic lives in `lib/seo` (runs on both sides), server-only code in `lib/server`, browser-only code in `lib/client`.
- **Client modules:** don't import non-component values from a `"use client"` file into a server component; they arrive as client references. Shared constants live in plain modules, such as `MODE_LABEL` in `lib/content/tools.ts`.
- **Comments explain why, not what,** and stay short. Match the density of the surrounding code.
- **Tests:** 8 Vitest files, 143 tests, covering URL handling, robots, scoring, issues, keywords, reports, extraction, link checks, the AI router and guard, the quota, CSV, diffs, tool helpers and the content limits. Add a test with every behavior change, especially regressions found in self-audits.
- **Copy:** plain English, direct, lightly funny, never mean. Every number shown comes from real data. Our own titles, descriptions and answers must pass our own checks.
- **Commits:** imperative summary line, a body that explains what and why, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` for AI-assisted commits.
- **Next.js 16 specifics:**
  - Cache Components is on.
  - GET route handlers that must run per request call `await connection()`.
  - `useSearchParams` needs a Suspense boundary.
  - Layouts and pages can't export non-standard values.
  - `proxy.ts` replaces middleware.

## 12. Decisions and their reasons

| Decision | Why |
| --- | --- |
| Next.js on Vercel Hobby instead of Flask on Replit | Free, no 30-day republish, auto-deploys from GitHub |
| The browser runs the crawl | Serverless functions are short-lived and stateless; small stateless API calls fit Vercel's free limits |
| No database; IndexedDB and localStorage | Free, private by default, nothing to maintain. The owner chose to keep data in the browser |
| No headless browser | Too heavy for free serverless. JavaScript-only pages are flagged instead |
| SEO score formula kept from Crawl Daddy | Old and new scores stay comparable |
| Separate AI-readiness score | GEO/AEO is a different question from classic SEO, so it gets its own number |
| Obey robots.txt rules for our bot; report `*` rules | Respect site owners' explicit wishes while still auditing what search engines can't see |
| Groq and Gemini free tiers, routed by job size, each falling back to the other | Both are free; Groq is fast for short jobs and Gemini has a bigger budget for long ones; one being busy shouldn't break the feature |
| Daily quota, then "bring your own key" | Protects the owner's free quota without accounts or a database |
| Fence page text and check answers for invented facts | Pages can contain prompt injection, and models can invent numbers. Users see what was checked |
| A "rescan" reminder and an HTML report instead of scheduled emails and share links | Those need a server-side database; this keeps everything in the browser |
| Four focused tools rather than four doors into one scan | Each tool should do its own job well. They share the same engine underneath |
| Treat a failed HEAD as unconfirmed | Real false positives (bsky.app) made "broken" untrustworthy |

## 13. Glossary

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
| **Shell** | The shared page container utility that keeps every edge aligned |
