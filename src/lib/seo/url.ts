// URL helpers shared by the server routes and the in-browser crawler.

const TRACKING_PARAMS = /^(utm_[a-z_]+|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid|replytocom|_ga|_gl)$/i;

const NON_PAGE_EXTENSIONS =
  /\.(jpe?g|png|gif|webp|avif|svg|ico|bmp|tiff?|heic|pdf|zip|gz|tgz|rar|7z|tar|mp3|mp4|m4a|m4v|wav|ogg|webm|mov|avi|wmv|flv|css|js|mjs|map|json|xml|rss|atom|txt|csv|xlsx?|docx?|pptx?|odt|epub|woff2?|ttf|otf|eot|exe|dmg|apk|msi|iso)$/i;

const NON_PAGE_PATHS = /\/(wp-admin|wp-login\.php|wp-json|xmlrpc\.php|cdn-cgi|feed|comments\/feed)(\/|$)/i;

/** Hostname without a leading "www." so example.com and www.example.com count as one site. */
export function bareHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "");
}

export function isSameSite(url: string, baseDomain: string): boolean {
  try {
    return bareHost(new URL(url).hostname) === baseDomain;
  } catch {
    return false;
  }
}

/**
 * Identity key for de-duplicating URLs. Ignores protocol, "www.", fragments,
 * tracking params and trailing slashes; keeps path case and real query params.
 */
export function urlKey(raw: string): string {
  try {
    const u = new URL(raw);
    for (const key of [...u.searchParams.keys()]) {
      if (TRACKING_PARAMS.test(key)) u.searchParams.delete(key);
    }
    u.searchParams.sort();
    let path = u.pathname;
    if (path.length > 1 && path.endsWith("/")) path = path.replace(/\/+$/, "");
    const port = u.port ? `:${u.port}` : "";
    return `${bareHost(u.hostname)}${port}${path || "/"}${u.search}`;
  } catch {
    return raw.trim().toLowerCase();
  }
}

/** Strip the fragment so the same page isn't queued twice as /post and /post#comments. */
export function stripHash(raw: string): string {
  const i = raw.indexOf("#");
  return i === -1 ? raw : raw.slice(0, i);
}

/** True when a link probably points at an HTML page we should crawl. */
export function isCrawlableUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    if (NON_PAGE_EXTENSIONS.test(u.pathname)) return false;
    if (NON_PAGE_PATHS.test(u.pathname)) return false;
    return true;
  } catch {
    return false;
  }
}

/** Turn whatever the user typed into an absolute http(s) URL, or null. */
export function normalizeInputUrl(input: string): string | null {
  let value = input.trim();
  if (!value) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) value = `https://${value}`;
  try {
    const u = new URL(value);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    const host = u.hostname;
    const looksLikeHost = host.includes(".") || host === "localhost" || host.startsWith("[");
    if (!looksLikeHost) return null;
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}

/**
 * The section of the site a scan covers. "" means the whole site; "/blog" means
 * only /blog and everything under it. Comes from the path the user typed.
 */
export function scopeFor(inputUrl: string, startUrl: string): string {
  try {
    if (new URL(inputUrl).pathname.replace(/\/+$/, "") === "") return "";
    let path = new URL(startUrl).pathname.replace(/\/+$/, "");
    // "/blog/index.html" scopes to "/blog".
    if (/\/[^/]*\.[a-z0-9]+$/i.test(path)) path = path.replace(/\/[^/]*$/, "");
    return path;
  } catch {
    return "";
  }
}

export function inScope(url: string, scope: string): boolean {
  if (!scope) return true;
  try {
    const path = new URL(url).pathname.toLowerCase();
    const prefix = scope.toLowerCase();
    return path === prefix || path.startsWith(`${prefix}/`);
  } catch {
    return false;
  }
}

/** Path + query, which is what robots.txt rules match against. */
export function robotsPath(raw: string): string {
  try {
    const u = new URL(raw);
    return `${u.pathname}${u.search}`;
  } catch {
    return "/";
  }
}

/** Short display form: drops the protocol and a trailing slash. */
export function prettyUrl(raw: string): string {
  return raw.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/** Path for display relative to the site, e.g. "/blog/hello". */
export function displayPath(raw: string): string {
  try {
    const u = new URL(raw);
    return `${u.pathname}${u.search}` || "/";
  } catch {
    return raw;
  }
}
