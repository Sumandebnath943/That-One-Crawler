# Crawl Daddy (legacy)

The original Flask app that That One Crawler replaces, kept for reference only. It is not built or deployed.

- `app.py`: Flask server: background-thread crawl with Playwright/Chromium, static-fetch fallback, PageSpeed and Groq/Gemini AI routes, in-memory scan state with a one-scan-at-a-time lock.
- `templates/index.html`: the single-page UI.

It needed a long-running server, which is why it lived on Replit and had to be republished every 30 days. The full Replit project history is on the local `crawl-daddy-replit` branch (not pushed, because it contains an old API key).
