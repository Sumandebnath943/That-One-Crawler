import { isKnownPath } from "@/lib/content/routes";

// What a crawler was asking for. The proxy runs before routing, so it can't see the response;
// without this, a probe for /.env (a 404) and a read of /checks (a real page) look identical.
// Two separate questions that fail in opposite directions:
//   known  does the path match a real route? We check the real list, so this is exact.
//   probe  is it a known attack target? Errs toward "no", and anchors to whole path segments so
//          a guide about secrets is never flagged as an attack.

/** Pages and agent files worth an alert. Assets and robots/sitemap fetches are noise. */
export function isReportablePath(pathname: string): boolean {
  if (pathname.startsWith("/_next/") || pathname.startsWith("/api/")) return false;
  if (pathname === "/robots.txt" || pathname === "/sitemap.xml") return false;
  // An agent reading the AI files or a Markdown twin is the most interesting arrival there is.
  if (pathname === "/llms.txt" || pathname === "/llms-full.txt" || pathname.endsWith(".md")) return true;
  if (/(^|\/)(opengraph-image|twitter-image|icon|apple-icon)(-[a-z0-9]+)?$/i.test(pathname)) return false;
  return !/\.[a-z0-9]{2,5}$/i.test(pathname);
}

const SEG = "(?:^|/)";
const PROBES: [RegExp, string][] = [
  [/^\/\.git(\/|$)/i, "git repository (source and history)"],
  [/^\/\.env(\.|\/|$)/i, "env file (API keys)"],
  [/^\/\.(aws|ssh|npmrc|docker|htpasswd|svn|hg|vscode|idea|ds_store)(\/|$)/i, "developer credentials"],
  [new RegExp(`${SEG}(wp-admin|wp-login\\.php|wp-content|wp-includes|xmlrpc\\.php|wordpress|wp-json)(/|$)`, "i"), "WordPress"],
  [new RegExp(`${SEG}(phpmyadmin|phpinfo\\.php|eval-stdin\\.php|cgi-bin|vendor|phpunit)(/|$)`, "i"), "PHP tooling"],
  [/\.php$/i, "a PHP script"],
  [/^\/(administrator|admin|cpanel|webmail|manager|login|dashboard)(\/|$)/i, "an admin panel"],
  [new RegExp(`${SEG}(backup|backups|dump|db|database)(/|$)|\\.(sql|bak|dump|zip|tar|gz)$`, "i"), "a database or site backup"],
  [new RegExp(`${SEG}(config\\.json|credentials|secrets?)(/|$)|\\.(pem|key|p12|pfx)$|${SEG}id_rsa`, "i"), "a secrets file"],
  [new RegExp(`${SEG}(actuator|server-status|telescope|_profiler|debug|swagger|graphql)(/|$)`, "i"), "a framework debug endpoint"],
];

export interface PathVerdict {
  /** Matches a real route, so something was served. */
  known: boolean;
  /** What the request was fishing for, or null when it isn't a known probe. */
  probe: string | null;
}

export function classifyPath(pathname: string): PathVerdict {
  // A real route can't be a probe, whatever it's called.
  if (isKnownPath(pathname)) return { known: true, probe: null };
  for (const [re, what] of PROBES) if (re.test(pathname)) return { known: false, probe: what };
  // /.well-known/ is a standard, not an intrusion; it's just not served here.
  if (pathname.startsWith("/.well-known/")) return { known: false, probe: null };
  if (/(^|\/)\.[^/]/.test(pathname)) return { known: false, probe: "a hidden dotfile" };
  return { known: false, probe: null };
}
