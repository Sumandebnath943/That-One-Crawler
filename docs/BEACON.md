# Visitor alerts (the beacon)

That One Crawler pings you on Telegram when people (and bots) visit. It's a port of the IMPRINT beacon, rebuilt for TOC and extended.

## What you get

| Alert | When | Sound |
| --- | --- | --- |
| 🟢 **New visitor** / 🔁 **Returning visitor** | A visit starts | Yes |
| 🔍 **Scan started** / 🛠 **Tool used** | Someone scans a site or runs a tool (with the URL). Up to 5 per visit | Yes |
| 📋 **Visit ended** | The tab closes or leaves: journey, time per page, scans with scores, AI actions, clicks, scroll, human/bot verdict | Silent |
| 🔥 AI assistant fetched a page | ChatGPT-User, Claude-User, Perplexity-User…: someone asked an AI, and it came here | Yes |
| 🤖 🔎 🔗 📈 🛠 crawler alerts | AI crawlers, search engines (✅ when reverse DNS proves they're real, 🎭 when they're fakes), link previews, SEO bots, scripts | Silent |
| 🚨 Probe | Something fishing for `/.env`, `/wp-login.php`… | Silent |
| ✉️ **New message** | The contact form at `/contact`. Always delivered, even when paused | Yes |

New compared with IMPRINT:

- **Commands** in the chat (below), stored without a database.
- **"Came from ChatGPT"**: visits sent by AI answers are called out (referrer or `utm_source`), plus search, social and direct.
- **TOC activity**: scans (with the scanned URL and final SEO / AI search / AI agent scores), tool runs and AI rewrites.
- **One end-of-visit message** instead of two, so they can't arrive out of order.
- **Fake crawler detection**: Googlebot, Bingbot, Applebot, YandexBot and Baiduspider are verified by reverse DNS in the background.
- **Crawler bursts collapse**: Googlebot reading 40 pages is one alert, and the next one says "+39 more requests".
- **Mute buttons** under every crawler alert.

## Setup (about 10 minutes)

1. **Create the bot.** In Telegram, message [@BotFather](https://t.me/BotFather) → `/newbot` → pick a name (e.g. "TOC Alerts") and a username ending in `bot`. Copy the token.
   Use a new bot rather than IMPRINT's: a bot has one webhook and one set of settings.
2. **Start a chat with it.** Open `t.me/<your_bot_username>` and press **Start**.
3. **Local `.env`** (never committed): add
   ```
   TELEGRAM_BOT_TOKEN=<token>
   TELEGRAM_WEBHOOK_SECRET=<random string>
   ```
   Make the secret with:
   ```bash
   node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
   ```
4. **Find your chat id:**
   ```bash
   npm run telegram:setup -- --find-chat
   ```
   Add the printed `TELEGRAM_CHAT_ID=…` to `.env`.
5. **Vercel**: Project → Settings → Environment Variables → add `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` and `TELEGRAM_WEBHOOK_SECRET` (Production) → **Redeploy**.
6. **Turn on commands** (after the deploy is live):
   ```bash
   npm run telegram:setup
   ```
   It points the bot's webhook at `https://thatonecrawler.houseofnamus.com/api/telegram` and registers the command menu.
7. **Check it:** send `/status` to the bot, then `/test` for a sample alert. Open `https://thatonecrawler.houseofnamus.com/api/beacon` in a browser: it should say `"telegramConfigured": true, "commandsConfigured": true`.
8. **Mute yourself:** open `https://thatonecrawler.houseofnamus.com/?notrack=1` once in each browser you use (undo with `?notrack=0`).

## Commands

| Command | What it does |
| --- | --- |
| `/bots off` | **Humans only.** No crawler or bot alerts, and visits that look automated are dropped too |
| `/bots ai` | Humans plus AI assistants and AI search crawlers (GPTBot, ClaudeBot, PerplexityBot, ChatGPT-User…). Everything else stays quiet |
| `/bots on` | Every crawler and bot (the default) |
| `/pause 2h` | Hold every alert for a while (`30m`, `2h`, `1d`, up to 7 days). Contact messages still arrive |
| `/resume` | End a pause early |
| `/status` | Current settings, with one-tap buttons |
| `/test` | A sample visitor alert |
| `/help` | The list |

Every crawler alert also has **🔕 Humans only** and **✨ AI bots only** buttons.

Settings are stored in the bot's own short description (you'll see "🕷 That One Crawler alerts · bots: off" on its profile), so they survive redeploys without a database. Each server instance re-reads them at most once a minute, so a change takes effect within a minute everywhere. Only messages from `TELEGRAM_CHAT_ID`, delivered with the webhook secret, are obeyed.

`BEACON_ALERT_BOTS` (`1`, `ai` or `0`) sets the starting mode before you've used `/bots`.

## How it works

| File | Job |
| --- | --- |
| `src/components/beacon/Beacon.tsx` | Client collector, mounted in the root layout. A visit is one tab, kept in sessionStorage across page loads. Passive listeners; `sendBeacon` on exit |
| `src/lib/client/beacon-events.ts` | `track()` bridge used by the scan workspace, tool forms and AI client; the opt-out helpers |
| `src/app/api/beacon/route.ts` | Collector: validates (`payload.ts`), locates (`geo.ts`), scores human vs bot (`bot.ts`), applies settings and rate limits, formats (`format.ts`), sends. Always answers 204. `GET` is a health check |
| `src/proxy.ts` + `src/lib/beacon/crawler-alert.ts` | Crawler alerts from every page request. Decides synchronously, sends in `waitUntil`, so pages never wait |
| `src/lib/beacon/crawlers.ts`, `verify.ts`, `paths.ts` | Who the bot claims to be, whether it's real, and whether the path exists or is a probe |
| `src/lib/beacon/settings.ts`, `src/app/api/telegram/route.ts` | Commands and their storage |
| `src/app/api/contact/route.ts` | Contact form → Telegram (honeypot, timing check, 5 per 10 minutes per IP) |

Nothing alerts from `localhost` unless `NEXT_PUBLIC_BEACON_DEBUG=1`. With the Telegram variables unset, everything is a quiet no-op.

Privacy: what's collected and the opt-out are described on `/privacy`. Keep that page in step with any change to what the beacon sends.

## Testing locally without Telegram

`TELEGRAM_API_URL` (test-only) points the bot at a fake API. Build with `NEXT_PUBLIC_BEACON_DEBUG=1`, run a tiny server that answers `{"ok":true,"result":…}` and logs request bodies, and start the app with `TELEGRAM_API_URL=http://127.0.0.1:<port>` plus dummy token, chat id and secret. That's how the alerts and commands were tested before release.
