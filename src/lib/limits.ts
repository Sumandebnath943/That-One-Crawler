/** Hard ceiling on pages per scan (the server enforces it too). */
export const MAX_PAGES_LIMIT = 1000;
export const PAGE_LIMIT_OPTIONS = [25, 50, 100, 300, 500, 1000] as const;
export const DEFAULT_PAGE_LIMIT = 300;
/** PageSpeed takes 10–30s per page, so we only run it on the first N pages. */
export const PAGESPEED_PAGE_LIMIT = 25;
