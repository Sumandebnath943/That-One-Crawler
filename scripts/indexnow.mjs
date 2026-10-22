// Tells IndexNow search engines (Bing, Yandex, Seznam, Naver…) that pages changed, so they recrawl
// in hours instead of weeks. Run after deploying new or updated content:
//
//   npm run indexnow                       every URL in the live sitemap
//   npm run indexnow -- /about /privacy    just these paths

import { readFileSync } from "node:fs";

const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://thatonecrawler.houseofnamus.com").replace(/\/$/, "");

async function main() {
  const key = readFileSync(new URL("../src/lib/site.ts", import.meta.url), "utf8").match(/INDEXNOW_KEY = "([0-9a-f]{32})"/)?.[1];
  if (!key) return "INDEXNOW_KEY not found in src/lib/site.ts";

  const keyFile = await fetch(`${site}/${key}.txt`);
  if (!keyFile.ok || (await keyFile.text()).trim() !== key) {
    return `${site}/${key}.txt doesn't serve the key yet. Deploy the latest code first, then run this again.`;
  }

  const paths = process.argv.slice(2).filter((a) => a.startsWith("/"));
  let urls = paths.map((p) => `${site}${p}`);
  if (!urls.length) {
    const xml = await (await fetch(`${site}/sitemap.xml`)).text();
    urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  }
  if (!urls.length) return `No URLs found in ${site}/sitemap.xml.`;

  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: new URL(site).host, key, keyLocation: `${site}/${key}.txt`, urlList: urls }),
  });
  // 200 = accepted, 202 = accepted while the key is still being checked.
  console.log(`IndexNow answered ${res.status} for ${urls.length} URLs on ${site}.`);
  if (res.status >= 400) return await res.text();
  return null;
}

const error = await main();
if (error) {
  console.error(error);
  process.exitCode = 1;
}
