# That One Crawler: Indexing Guide

How to get That One Crawler (TOC) found, indexed and measured: Google Search Console, Bing Webmaster Tools, IndexNow and Google Analytics 4, plus what helps AI search engines cite it. Everything on the site side is already built; this guide is the account-side setup only you can do.

_Written 22 October 2026 for **https://thatonecrawler.houseofnamus.com**, which is now the canonical address in the code (`PRODUCTION_URL` in `src/lib/site.ts`): canonical tags, sitemap, robots.txt, llms.txt and social cards all use it._

## What's already in place

| Piece | Where | Notes |
| --- | --- | --- |
| Sitemap | `/sitemap.xml` | 45 pages, each with a `lastmod` date. Built from `src/lib/content/routes.ts` |
| robots.txt | `/robots.txt` | Allows everyone, names 19 AI agents explicitly, blocks only `/api/` and the internal `/markdown/` route, lists the sitemap |
| llms.txt / llms-full.txt | `/llms.txt`, `/llms-full.txt` | Site map and key facts for AI assistants; full text of every guide |
| Markdown twins | `/index.md`, `/<any-page>.md`, or `Accept: text/markdown` | For AI agents. Each sends `Link: <html page>; rel="canonical"`, so search engines treat the HTML page as the real one |
| Structured data | Every page | WebSite, Person (with 9 `sameAs` profiles), WebApplication, FAQPage, BreadcrumbList, TechArticle, AboutPage, ContactPage |
| Verification tags | `src/app/layout.tsx` | Filled from `GOOGLE_SITE_VERIFICATION`, `BING_SITE_VERIFICATION` and `YANDEX_VERIFICATION` env vars |
| IndexNow key | `/9ab9cfbac81221bf04735a776797a672.txt` | Submit with `npm run indexnow` |
| GA4 | `src/components/beacon/Analytics.tsx` | On, with ID `G-7VVFQHW4RV` from `GA_ID` in `src/lib/site.ts` |
| Crawler alerts | Telegram | You'll see Googlebot and Bingbot arrive, marked ✅ when reverse DNS proves they're real. See [BEACON.md](BEACON.md) |

## Do this in order

0. **Deploy, and redirect the old address** (see below). Nothing here works until the new pages are live.
1. **Google Search Console**: verify, submit the sitemap, request indexing for the top pages (about 20 minutes).
2. **Bing Webmaster Tools**: import from Search Console (5 minutes).
3. **IndexNow**: run `npm run indexnow` once (1 minute).
4. **Google Analytics 4**: create the property, add the ID, link it to Search Console (15 minutes).
5. Wait. New sites usually see first impressions in Search Console within 2 to 14 days. Watch the Telegram crawler alerts in the meantime.

---

## 0. Before you start: deploy and redirect

1. Push the latest code so Vercel deploys it. Check that `https://thatonecrawler.houseofnamus.com/about` and `/index.md` load.
2. **Redirect the old Vercel address** so Google never sees two copies of the site:
   Vercel → Project → **Settings → Domains** → find `that-one-crawler.vercel.app` → **Edit** → choose **Redirect to** `thatonecrawler.houseofnamus.com` with **308 Permanent Redirect** → Save.
   Check: `https://that-one-crawler.vercel.app/` should now jump to the new address.
3. In Vercel's Domains list, `thatonecrawler.houseofnamus.com` should be the one serving the site (not redirecting), with a valid certificate.

---

## 1. Google Search Console

### Add the property

**Already have a Domain property for `houseofnamus.com`** (for your portfolio or IMPRINT)? It already covers this subdomain, so data is being collected there. Still add the URL-prefix property below: it gives That One Crawler its own reports and sitemap status, and verification is instant once the tag is live.

Why not a Domain property for the subdomain itself? It needs a TXT record at `thatonecrawler.houseofnamus.com`, and that name is a CNAME to Vercel; DNS doesn't allow other records next to a CNAME. The HTML tag avoids the problem.

1. Open https://search.google.com/search-console and sign in.
2. Click the property menu (top left) → **Add property** → **URL prefix**.
3. Enter `https://thatonecrawler.houseofnamus.com/` exactly (https, trailing slash) → **Continue**.
4. Under **Other verification methods**, open **HTML tag**. Google shows something like:
   ```html
   <meta name="google-site-verification" content="AbC123…xyz" />
   ```
   Copy **only** the `content` value (`AbC123…xyz`).
5. In Vercel: **Project → Settings → Environment Variables** → add `GOOGLE_SITE_VERIFICATION` = that value, for **Production**. Save.
6. **Redeploy** (Deployments → ⋯ on the latest → Redeploy). Env vars only apply to new builds.
7. Check it's live: open the site, View Source, search for `google-site-verification`.
8. Back in Search Console, click **Verify**.

> Keep the env var forever. Google re-checks verification now and then, and removing the tag unverifies the property.

### Submit the sitemap

1. In the left menu, **Indexing → Sitemaps**.
2. Under "Add a new sitemap", type `sitemap.xml` → **Submit**.
3. Status should say **Success** with **45 discovered pages** within a few minutes (it can show "Couldn't fetch" for the first hour; that's normal, so check back).

### Request indexing for the pages that matter most

The URL Inspection tool has a small daily quota (roughly 10 requests a day), so spend it on the pages that can rank:

1. Paste a URL into the search bar at the top → Enter.
2. Click **Request indexing** and wait for the confirmation.

Suggested order (day 1, then the rest on day 2):

1. `https://thatonecrawler.houseofnamus.com/`
2. `/broken-link-checker`
3. `/ai-agent-readiness-checker`
4. `/geo-aeo-checker`
5. `/keyword-cannibalization-checker`
6. `/meta-tag-checker`
7. `/page-speed-test`
8. `/blog-seo-checklist`
9. `/checks`
10. `/about`

The sitemap covers the rest. You don't need to request the 32 guides one by one.

### What to check afterwards

| Report | Where | What good looks like |
| --- | --- | --- |
| Pages | Indexing → Pages | Indexed count climbing toward 45. "Discovered, currently not indexed" is normal for a new site. Only investigate pages stuck for 4+ weeks |
| Performance | Performance → Search results | First impressions within about 2 weeks. Filter by Query to see which keywords find you |
| Core Web Vitals | Experience | Needs real Chrome traffic before it shows data |
| Enhancements | Breadcrumbs, and others as Google detects them | Zero errors. FAQ rich results are only shown for a few government and health sites, so don't expect them; the FAQ markup still helps AI answers |
| Links | Links | Who links to you. Grows as you share the tool |

Recheck any page after a big change with **URL Inspection → Test live URL**.

---

## 2. Bing Webmaster Tools

Bing matters more than its market share suggests: its index feeds Microsoft Copilot, DuckDuckGo, Yahoo and Ecosia results, and ChatGPT search draws on it too. It's also where IndexNow submissions show up.

### Fastest: import from Search Console

1. Open https://www.bing.com/webmasters and sign in (a Microsoft, Google or Facebook account works).
2. Choose **Import from Google Search Console** → sign in with the Google account you used above → allow access.
3. Tick `https://thatonecrawler.houseofnamus.com/` → **Import**. Bing copies the verified site and its sitemap. Done.

### Manual alternative (if the import isn't offered)

1. **Add a site** → enter `https://thatonecrawler.houseofnamus.com/` → **Add**.
2. Choose **HTML Meta Tag**. Bing shows `<meta name="msvalidate.01" content="ABC123…" />`. Copy the `content` value.
3. In Vercel, add `BING_SITE_VERIFICATION` = that value → **Redeploy**.
4. Back in Bing, click **Verify**.
5. **Sitemaps** (left menu) → **Submit sitemap** → `https://thatonecrawler.houseofnamus.com/sitemap.xml`.

### Worth a look in Bing

- **URL Inspection**: same idea as Google's; request indexing for the homepage and tools.
- **IndexNow** (left menu): shows URLs received from `npm run indexnow`.
- **Site Explorer** and **Search Performance**: Bing's crawl and click data.
- **Recommendations / SEO reports**: Bing's own audit. Compare it with TOC's audit of itself, for fun.

---

## 3. IndexNow

IndexNow tells participating search engines (Bing, Yandex, Seznam, Naver, Yep) that pages changed, so they recrawl in hours instead of weeks. Google doesn't use IndexNow; it relies on the sitemap and its own crawling.

The key file is already live at `/9ab9cfbac81221bf04735a776797a672.txt`, so there's nothing to configure. The key isn't a secret: anyone can read it, and it only proves that submissions for this site come from this site.

**After every deploy that adds or changes content**, from the project folder:

```bash
npm run indexnow
```

That submits every URL in the live sitemap. To submit only the pages you changed:

```bash
npm run indexnow -- /about /privacy /checks/title-tag-length
```

Expect `IndexNow answered 200` (or `202`, meaning accepted while the key is still being checked). A `403` means the key file didn't match: deploy first, then run it again.

> Don't submit unchanged pages over and over. Engines ignore (and may distrust) repeat submissions with no real change.

---

## 4. Google Analytics 4

TOC's Telegram alerts tell you about each visit as it happens; GA4 gives you trends over weeks. It's optional, and stays off until you add the ID.

### Create the property

1. Open https://analytics.google.com → **Admin** (gear, bottom left) → **Create → Account** (or **Property** if you already have an account).
2. Property name `That One Crawler`, your time zone and currency → **Next** → fill in the business questions → **Create**.
3. Choose platform **Web** → URL `https://thatonecrawler.houseofnamus.com` → stream name `That One Crawler` → keep **Enhanced measurement** on → **Create stream**.
4. Copy the **Measurement ID** (`G-XXXXXXXXXX`) from the stream details.

### Turn it on in TOC

Already done: the ID `G-7VVFQHW4RV` is built into `src/lib/site.ts` (`GA_ID`), so no Vercel variable is needed. `NEXT_PUBLIC_GA_ID` in Vercel overrides it (`off` disables GA4); a change needs a redeploy.

1. Deploy.
2. Open the site and, in GA4, check **Reports → Realtime**. You should appear within a minute. (Your own browser won't show up if you've opted out with `?notrack=1`; the opt-out covers GA4 too.)

What the code does: loads `gtag.js` after the page is interactive, never on localhost, never for visitors who opted out, and the [Privacy page](https://thatonecrawler.houseofnamus.com/privacy) automatically gains a "Google Analytics" section once the ID is set. Page changes inside the app are tracked by Enhanced measurement's "Page changes based on browser history events", which is on by default; leave it on.

### Recommended settings

1. **Admin → Data collection and modification → Data retention** → set event data retention to **14 months** (the default is 2).
2. **Admin → Product links → Search Console links → Link** → pick the Search Console property and the web stream. This adds the Search Console reports to GA4, joining queries to on-site behavior.
3. **Track visits from AI assistants as their own channel** (the point of a GEO tool):
   - **Admin → Data display → Channel groups → Create new channel group**, name it `With AI`.
   - **Add new channel** → name `AI assistants` → condition **Source** *matches regex*:
     ```
     chatgpt\.com|chat\.openai\.com|perplexity\.ai|claude\.ai|gemini\.google\.com|copilot\.microsoft\.com|you\.com|phind\.com|deepseek\.com|grok\.com|meta\.ai|mistral\.ai
     ```
   - Save, then **drag it above "Referral"** (channels match top to bottom) and save the group.
   - In **Reports → Acquisition → Traffic acquisition**, switch the dimension to `With AI` to see AI-sent visitors on their own row. The Telegram arrival alert also says "✨ Came from ChatGPT" for these.
4. **Admin → Data streams → your stream → Configure tag settings → List unwanted referrals**: add `thatonecrawler.houseofnamus.com` if you ever see the site listed as its own referrer.

### Privacy note

GA4 sets cookies. Visitors from the EU and UK may need to give consent first under GDPR and the ePrivacy rules. If EU traffic becomes significant, add a consent banner (Google Consent Mode) before relying on GA4 there, or keep using the Telegram alerts, which use no cookies.

---

## 5. Other engines (optional)

| Engine | Worth it? | How |
| --- | --- | --- |
| Yandex Webmaster | Only for Russian-speaking audiences | https://webmaster.yandex.com → add site → meta tag → put the value in `YANDEX_VERIFICATION` → redeploy → verify. IndexNow already notifies Yandex |
| Seznam, Naver, Yep | No setup needed | They receive IndexNow submissions automatically |
| DuckDuckGo, Yahoo, Ecosia | No setup needed | They use Bing's index, so step 2 covers them |

---

## 6. AI search and AI assistants (GEO)

There's no "Search Console" for ChatGPT, Claude or Perplexity. They find pages through their own crawlers and through search indexes, so being cited comes down to being crawlable, indexed and quotable. TOC already does the site side:

- **Crawlable:** robots.txt invites OAI-SearchBot, ChatGPT-User, Claude-SearchBot, Claude-User, PerplexityBot, Perplexity-User, Applebot, GPTBot, ClaudeBot, Google-Extended and more. No firewall blocks them (TOC's own agent audit scores the site 100).
- **Indexed:** Google (step 1) and Bing (step 2), which AI answer features build on.
- **Quotable:** 40–60 word direct answers under every H1, question-style headings, FAQs with FAQPage markup, specific numbers, `llms.txt`, `llms-full.txt` and Markdown twins.

What still helps, and only you can do:

1. **Get mentioned.** AI assistants recommend tools that other sites talk about. Good places: a "Show HN" post, a dev.to or Medium article on building it, Product Hunt, Reddit communities about blogging and SEO (where self-promotion is allowed), the GitHub README, and your portfolio and LinkedIn.
2. **Keep the name consistent.** "That One Crawler" everywhere, linking to the same URL, so engines connect the mentions.
3. **Ask the assistants.** Every few weeks, ask ChatGPT, Perplexity and Claude things like "free tool to check if AI agents can read my site" or "free blog SEO audit tool". The Telegram alerts show when their live fetchers (ChatGPT-User, Claude-User, Perplexity-User) visit, and when a visitor arrives from an AI answer.
4. **Keep content fresh.** When a guide changes, bump `CONTENT_UPDATED` in `src/lib/content/structured-data.ts` so the sitemap's `lastmod` changes, deploy, and run `npm run indexnow`.

---

## After every content deploy

1. `npm run indexnow` (or with just the changed paths).
2. For a brand-new page: Search Console → URL Inspection → **Request indexing**.
3. Spot-check: `/sitemap.xml` lists the page, `/<page>.md` returns Markdown, and `/llms.txt` links to it if it's important.

## Quick validators

- Rich results: https://search.google.com/test/rich-results
- Schema: https://validator.schema.org
- Speed: https://pagespeed.web.dev (or TOC's own `/page-speed-test`)
- AI agent readiness: TOC's own `/ai-agent-readiness-checker?url=thatonecrawler.houseofnamus.com`
- robots.txt: Search Console → Settings → robots.txt report
