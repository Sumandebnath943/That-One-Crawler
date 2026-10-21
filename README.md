# That One Crawler

**Your blog has issues. We'll find every single one.**

Brutally honest SEO audits for blogs. Paste a URL and That One Crawler reads every page, scores it out of 100, and tells you what to fix: missing H1s, thin content, duplicate titles, broken pages, noindex tags, redirect chains and more.

It's the reprised version of Crawl Daddy (see [`legacy/crawl-daddy`](legacy/crawl-daddy)), rebuilt to run on a free Vercel Hobby plan with nothing to babysit.

## What it checks

| Area | Checks |
| --- | --- |
| Search appearance | Title (missing / too short / too long), meta description (missing / length), duplicates across pages |
| Headings & content | Missing or multiple H1s, H2/H3 outline, word count, thin content, reading time |
| Indexability | `noindex` (meta + `X-Robots-Tag`), robots.txt blocks, canonical tags pointing elsewhere |
| Health | Broken pages (4xx/5xx/unreachable), redirects, off-site redirects, slow responses, pages that need JavaScript to render |
| Social & schema | Open Graph, Twitter cards, JSON-LD types, author, publish date, hreflang |
| Optional | Google PageSpeed (performance, SEO, accessibility, best practices, LCP, CLS, TBT) and AI-written title/meta suggestions via Groq or Gemini |

Every issue in the report comes with why it matters and how to fix it. Results can be filtered, sorted and exported to CSV.

## How it works

Crawl Daddy ran a long-lived Flask server with background threads, headless Chromium and in-memory state, which is why it needed Replit. That One Crawler flips it around: **the browser drives the crawl**, and the server only does small, stateless jobs that fit comfortably in serverless functions.

```
Browser (src/lib/client/crawl.ts)
  │  POST /api/discover   → follow redirects, read robots.txt, harvest sitemaps (newest posts first)
  │  POST /api/analyze    → fetch + parse 3 URLs per call, 2 calls in flight
  │  POST /api/pagespeed  → one PageSpeed Insights call (optional)
  │  POST /api/ai         → one Groq or Gemini call for a single page (optional)
  ▼
Scores, issues and history computed and stored in the browser (IndexedDB)
```

- **No sitemap?** It follows internal links from the homepage instead.
- **Blog at `/blog`?** Type `myblog.com/blog` and only that section is scanned.
- **Safe by default:** the fetcher refuses private and internal IP addresses, caps response sizes, and never follows redirects off the site.
- **No database:** scans are saved in the visitor's own browser.

## Local development

Requires Node 20.9+.

```bash
npm install
cp .env.example .env.local   # optional: add GROQ_API_KEY or GEMINI_API_KEY, PAGESPEED_KEY
npm run dev                  # http://localhost:3000
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |

## Deploying to Vercel (Hobby)

1. On [vercel.com/new](https://vercel.com/new), import this GitHub repo. Vercel detects Next.js automatically, so there's nothing to configure.
2. Optional: under **Settings → Environment Variables**, add `GROQ_API_KEY` or `GEMINI_API_KEY` (AI fixes) and/or `PAGESPEED_KEY` (PageSpeed), then redeploy. See `.env.example` for the optional model settings.
3. Every push to `main` redeploys automatically.

## Project layout

```
src/
  app/                 pages (landing, /scan) and API routes
  components/          landing sections, scan workspace, report table, page drawer
  lib/seo/             shared rules: URL handling, robots.txt, scoring, issue catalog
  lib/server/          server-only: safe fetcher, HTML extraction, sitemap discovery, PageSpeed, AI
  lib/client/          browser-only: crawl orchestrator, history (IndexedDB), CSV export
legacy/crawl-daddy/    the original Flask app, for reference
```
