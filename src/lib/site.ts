// One place for the site's identity: used by metadata, structured data, sitemap, llms.txt and the crawler's user agent.

export const SITE_NAME = "That One Crawler";
export const PRODUCTION_URL = "https://that-one-crawler.vercel.app";
/** Canonical origin. Set NEXT_PUBLIC_SITE_URL if you move to a custom domain. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || PRODUCTION_URL).replace(/\/$/, "");

export const AUTHOR = {
  name: "Suman Debnath",
  url: "https://sumandebnath.houseofnamus.com",
};

export const TAGLINE = "Free SEO audit tool for blogs";
export const HOME_TITLE = "That One Crawler: Free SEO Audit Tool for Blogs";
export const SITE_DESCRIPTION =
  "Free SEO audit tool for blogs. Crawl your whole site to find broken links, thin content, duplicate titles, keyword cannibalization and AI search gaps.";
