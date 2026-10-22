# That One Crawler: Handoff

Everything the next person (or agent) needs to pick this project up safely. For how the product and code work, read the [Project Bible](PROJECT_BIBLE.md). For portfolio material, see the [Portfolio Handoff](PORTFOLIO_HANDOFF.md).

_Last updated: 22 October 2026._

## At a glance

| | |
| --- | --- |
| What it is | A free SEO, GEO, AEO and AI-agent-readiness audit tool for blogs, plus six focused tools (including a PageSpeed test and an AI agent readiness checker) and 32 "checks explained" guides |
| Live site | https://thatonecrawler.houseofnamus.com |
| Repository | https://github.com/Sumandebnath943/That-One-Crawler (public), branch `main` |
| Hosting | Vercel Hobby (free). Every push to `main` deploys automatically |
| Owner | Suman Debnath (https://sumandebnath.houseofnamus.com) |
| Stack | Next.js 16.4 (App Router, Turbopack), React 19.3, TypeScript, Tailwind CSS 4, cheerio, Vitest |
| Data | No database. Scans, brand rules and a visitor's own AI key live in that visitor's browser |
| Status | Live and working. The site audits itself at SEO 100, AI search 95 and AI agents 100 across 45 pages, with no critical, warning or notice issues |

## Current state of services

All optional services are configured and were tested on production on 22 October 2026.

| Service | Env var | Vercel | Local `.env` | Notes |
| --- | --- | --- | --- | --- |
| Groq (AI, short jobs first) | `GROQ_API_KEY` | ✓ | ✓ | Default model `openai/gpt-oss-120b`, backup `openai/gpt-oss-20b` |
| Gemini (AI, long jobs first) | `GEMINI_API_KEY` | ✓ (new key) | ✓ (new key) | `gemini-3.5-flash-lite`. The first key's Google project was blocked by Google; it was replaced |
| PageSpeed Insights | `PAGESPEED_KEY` | ✓ | ✓ | Same Google key also powers CrUX |
| Chrome UX Report (real-user speed) | uses `PAGESPEED_KEY` | ✓ | ✓ | "Chrome UX Report API" is enabled on the key's Google Cloud project |

| Telegram visitor alerts | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET` | not yet | not yet | Built and tested against a fake Telegram API on 22 October 2026. Setup: [BEACON.md](BEACON.md). Until set, the beacon, crawler alerts and contact form are quiet no-ops (the form points people to GitHub) |
| Search Console, Bing, GA4 | none needed | | | Search Console verified through the domain provider; Bing imported from Search Console; GA4 ID `G-7VVFQHW4RV` is built in (`GA_ID` in `src/lib/site.ts`). Steps in [INDEXING_GUIDE.md](INDEXING_GUIDE.md) |

Optional settings nobody needs to set: `AI_DAILY_LIMIT` (free AI actions per visitor per day, default 20), `AI_QUOTA_SECRET` (signs the quota cookie; derived from the AI keys if unset), `GROQ_MODEL`, `GEMINI_MODEL`, `AI_PROVIDER`, `NEXT_PUBLIC_SITE_URL` (only for a custom domain), `BEACON_ALERT_BOTS` (starting bot-alert mode), `NEXT_PUBLIC_BEACON_DEBUG` (dev only: let localhost alert), `YANDEX_VERIFICATION`. See [`.env.example`](../.env.example).

## Rules that must not be broken

1. **Never push the local branches `crawl-daddy-replit` or `replit-agent`.** Their history contains `zipFile.zip` with a real Groq API key from the old Replit app. `main` was deliberately restarted as a clean orphan history so the key never reached GitHub. If old files are needed, copy the files, never merge the branches. If that old key is still active, revoke it in the Groq console (console.groq.com/keys).
2. **Push only to `origin`.** The repo also has a `gitsafe-backup` remote left over from Replit. Ignore it.
3. **Keys live only in environment variables** (Vercel settings and the local `.env`), never in the repo. `.env*` is git-ignored except `.env.example`. Don't open or print `.env`. To test keys, load them into a throwaway script with `process.loadEnvFile()` and print only status codes and model names.
4. **Never set `ALLOW_PRIVATE_URLS` on Vercel.** It turns off the fetcher's private-network protection and exists only for auditing the site on `localhost`.
5. **The reference project `D:\project\Aritra seo-&-content-dual-agent-optimizer` is read-only.** It inspired some features; don't edit anything in it.
6. **A visitor's own Gemini key must never be stored or logged by the server.** It's sent per request in the `x-gemini-key` header and used once.
7. **The reference project `D:\project\Imprint` is read-only.** The visitor beacon was ported from it; never edit anything there.
8. **Keep `/privacy` true.** If the beacon, contact form or analytics start collecting something new, update `src/lib/content/pages.ts` in the same change.
9. **Never set `TELEGRAM_API_URL` on Vercel.** It exists only to point tests at a fake Telegram API.

## Run it locally

Requires Node 20.9+ (the dev machine has Node 24).

```bash
npm install
npm test
npm run build
npm run start
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on port 3000 (see the Windows note below) |
| `npm run build` / `npm run start` | Production build and server |
| `npm test` | Vitest: 11 files, 207 tests |
| `npm run telegram:setup` | Connects the alert bot's webhook and command menu (`-- --find-chat` prints your chat id) |
| `npm run indexnow` | Submits the live sitemap (or given paths) to IndexNow |
| `npm run lint` / `npm run typecheck` | ESLint / `tsc --noEmit` |

### Windows machine notes (the current dev PC)

- **The C: drive is full** (about 2 GB free, and Windows can't grow the page file). Point npm's cache and temp files at D: before installing or building:
  ```powershell
  $env:npm_config_cache = "D:\project\ThatOneCrawler\.cache\npm"
  $env:TEMP = "D:\project\ThatOneCrawler\.cache\tmp"; $env:TMP = $env:TEMP
  ```
- **`next dev` tends to crash with out-of-memory errors** on this PC. Verify changes with `next build` and `next start` instead. A build can occasionally fail with "Zone Allocation failed"; retrying usually works.
- `.claude/launch.json` (local only, git-ignored) has three preview configs: `dev`, `prod` (port 3005) and `prod-self` (port 3007 with `ALLOW_PRIVATE_URLS=1`, for auditing the site itself).
- In PowerShell 5.1, `Set-Content -Encoding utf8` adds a byte-order mark. Write files with `[IO.File]::WriteAllText(path, text, (New-Object Text.UTF8Encoding $false))`. Commit with `git commit -F <message file>`. `git push` prints to stderr, so it looks like an error even when it succeeds.

## Deploying

1. Commit on `main` and run `git push origin main`.
2. Vercel builds and deploys in about a minute.
3. Environment variable changes in Vercel only take effect after a redeploy.

## How to check a change

1. `npm run typecheck`, `npm test`, `npm run lint` all pass.
2. `npm run build` succeeds (114 static pages, including 45 Markdown twins).
3. **Self-audit:** build with `NEXT_PUBLIC_SITE_URL=http://localhost:3007`, start the `prod-self` config, then open `http://localhost:3007/scan?url=http%3A%2F%2Flocalhost%3A3007&max=100`. Expect 45 sitemap URLs, SEO 100, AI search about 95, AI agents 100, and 0 critical, 0 warnings, 0 notices. Any new notice on our own pages is a bug in the copy or the checker. The agent check can also be run on its own at `/ai-agent-readiness-checker?url=http%3A%2F%2Flocalhost%3A3007`.
4. **Production smoke test** after deploying:
   - `/api/config` returns `{"pagespeed":true,"crux":true,"ai":true,"aiDailyLimit":20}`.
   - `/robots.txt`, `/sitemap.xml` (45 URLs), `/llms.txt` and `/llms-full.txt` return 200. `/checks/not-a-real-check` and `/nope.md` return 404.
   - `/index.md`, `/about.md` and `curl -H "Accept: text/markdown" <site>/checks` return `text/markdown` with `Vary: Accept`.
   - `/api/beacon` (in a browser) shows `telegramConfigured` and `commandsConfigured`; `/status` in the bot answers.
   - `/ai-agent-readiness-checker?url=sumandebnath.houseofnamus.com` scores about 100 (is-agentic.com says 100 too) and lists llms.txt (over 30K characters) and `.md` twins as the only gaps.
   - `/page-speed-test?url=…` shows mobile and desktop results with failed audits.
   - One AI action shows which provider answered. A long job (section rewrite) should say Gemini, and a short one (title & meta) should say Groq.
   - `POST /api/crux` with `{"url":"https://wordpress.org/news/"}` returns real-user metrics.
   - Rate limits still work, without spending any quota: send 32 quick `POST /api/pagespeed` requests with `{"url":"not-a-url"}`. The first 30 should return 400 (invalid URL) and the rest 429. The limiter counts requests before checking the URL, so Google is never called. The limit clears after a minute.

## Troubleshooting

| Symptom | Likely cause | What to do |
| --- | --- | --- |
| AI tools say "turned down our server key" | A provider refused the key, or the model was retired | Check the server logs for `AI provider failed: <provider> <model> <status> <message>` lines. Models get retired (Groq retired `llama-3.3-70b-versatile` in 2026); the router falls back to its defaults |
| Gemini "Your project has been denied access" | Google blocked the key's Cloud project | Create a key in a **new** project at aistudio.google.com/apikey |
| Real-user speed says "API not enabled" | Chrome UX Report API is off for the key's project | Enable it in Google Cloud Console (it's free) |
| Real-user speed says "Not enough real Chrome visitors" | The site is too new or quiet for Google to publish data | Nothing to fix |
| Lots of "broken" links on one domain | The site refuses bots or HEAD requests | The checker already retries any failed HEAD with GET and lists bot-refusals separately. Check the status code before changing the checker |
| A page scores lower after a design change | Decorations (numbers, badges, "#") ended up in heading or paragraph text | Keep decorations CSS-only (pseudo-elements). See "Design system" in the Bible |

## Known gaps and ideas

- **The AI quota is "good enough", not airtight.** It's a signed cookie plus an in-memory per-IP counter, with no database. Clearing cookies resets the cookie count. The IP counter lives in one serverless instance and resets when that instance restarts. The same goes for all rate limits.
- **No headless browser.** Pages that only render with JavaScript are flagged ("needs JavaScript") rather than rendered.
- **No search volumes.** Keywords come from the pages themselves; we never invent volumes.
- **Single-page tools don't read robots.txt.** The meta tag and GEO checkers analyze one URL directly; the full audit does read robots.txt.
- **The SEO score changed on 22 October 2026** from Crawl Daddy's checklist to "100 minus weighted issues". Saved scans are re-scored on load, but summaries in the recent-scans list keep the number they were saved with until that scan is opened and saved again.
- **Agent probes borrow agents' names.** The firewall check loads the homepage as ChatGPT-User, OAI-SearchBot, Claude-User and PerplexityBot (with our name appended). Firewalls that verify real bots by IP may block us while letting the real bot through; the result says so. Timeouts are left out, not counted as blocks.
- **Not checked: brand discoverability** (whether the site ranks for its own name). is-agentic.com checks it with a search engine; we have no search API.
- **Our own agent gap:** only the bonus `/.well-known/` discovery files, which the checker itself says content sites can skip.
- **Alert settings and dedupe are best-effort.** Settings live in the Telegram bot's short description (cached a minute per instance); crawler-alert dedupe is in memory per instance, so a busy crawl can produce a few extra alerts.
- **The proxy now runs on every page request** (crawler alerts, Markdown negotiation, real 404s). It's cheap and synchronous, but it counts toward Vercel's function invocations.
- **Not built, by choice:** scheduled rescans with email, and shareable report links. Both need a server-side database, and the owner chose browser-only data. The replacements are a "Time for a rescan?" reminder after 7 days and a downloadable HTML report.
- **Model churn:** free-tier model names change. Keep the defaults in `src/lib/server/ai/router.ts` current.

## Change history

| Commit | Summary |
| --- | --- |
| `bc92bf6` | That One Crawler: Crawl Daddy rebuilt for Vercel (browser-driven crawl, report, CSV, PageSpeed, AI fixes) |
| `2ac4cab` | Gemini added as an AI provider |
| `52c38e2` | Site-wide spider quirks; GitHub link removed from the landing page |
| `b1c6e4a` | Content checks, AI tools, link checking and the SEO-ready site (guides, llms.txt, sitemap, structured data) |
| `f41425c` | The action plan no longer invents problems on clean sites |
| `52ad4f2` | Each tool got its own job; report, guide pages and layout polished |
| `156f004` | Project docs: Handoff, Project Bible, Portfolio Handoff |
| `2506ffb` | Rate limit on `/api/pagespeed` (30 per minute per IP), so every API route that does work now has one |
| `bf6bea3` | Accuracy overhaul from a real-site benchmark (false positives fixed, issue-weighted SEO score), AI agent readiness audit and tool, full PageSpeed report and tool, "Prompt to improve", six new checks |

The old Flask app is kept in [`legacy/crawl-daddy`](../legacy/crawl-daddy) for reference.
