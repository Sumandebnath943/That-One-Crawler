/** Hard ceiling on pages per scan (the server enforces it too). */
export const MAX_PAGES_LIMIT = 1000;
export const PAGE_LIMIT_OPTIONS = [25, 50, 100, 300, 500, 1000] as const;
export const DEFAULT_PAGE_LIMIT = 300;
/** PageSpeed takes 10–30s per page, so we only run it on the first N pages. */
export const PAGESPEED_PAGE_LIMIT = 25;
/** Most links and images checked per scan (internal + external + images). */
export const LINK_CHECK_LIMIT = 400;
/** Free AI actions per visitor per day before they need their own key. */
export const DEFAULT_AI_DAILY_LIMIT = 20;
