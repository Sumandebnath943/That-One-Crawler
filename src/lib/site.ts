// One place for the site's identity: used by metadata, structured data, sitemap, llms.txt and the crawler's user agent.

export const SITE_NAME = "That One Crawler";
export const PRODUCTION_URL = "https://thatonecrawler.houseofnamus.com";
/** Canonical origin. Set NEXT_PUBLIC_SITE_URL if you move to a custom domain. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || PRODUCTION_URL).replace(/\/$/, "");

export const AUTHOR = {
  name: "Suman Debnath",
  url: "https://sumandebnath.houseofnamus.com",
  image: "https://sumandebnath.houseofnamus.com/og-image.png",
  jobTitle: "Independent developer",
  /** Official profiles, for sameAs in structured data (from the author's own site). */
  sameAs: [
    "https://github.com/Sumandebnath943",
    "https://linkedin.com/in/suman-debnath-a528653a1",
    "https://x.com/iamSdebnath",
    "https://huggingface.co/SumanDebnath943",
    "https://bsky.app/profile/sumandebnath.bsky.social",
    "https://mastodon.social/@sumandebnath",
    "https://dev.to/suman_debnath_1",
    "https://medium.com/@sumandebnath943",
    "https://orcid.org/0009-0006-9581-7890",
  ],
};

export const REPO_URL = "https://github.com/Sumandebnath943/That-One-Crawler";

export const TAGLINE = "Free SEO audit tool for blogs";
export const HOME_TITLE = "That One Crawler: Free SEO Audit Tool for Blogs";
export const SITE_DESCRIPTION =
  "Free SEO audit tool for blogs. Crawl your whole site to find broken links, thin content, duplicate titles, keyword cannibalization and AI search gaps.";

/**
 * IndexNow key. Not a secret: it's published at /<key>.txt so search engines can check that URL
 * submissions really come from this site. Changing it means renaming src/app/<key>.txt too.
 */
export const INDEXNOW_KEY = "9ab9cfbac81221bf04735a776797a672";

/** Google Analytics 4 measurement ID (public). NEXT_PUBLIC_GA_ID overrides it; set it to "off" to disable. */
const GA_ENV = process.env.NEXT_PUBLIC_GA_ID?.trim();
export const GA_ID = GA_ENV === "off" ? "" : GA_ENV || "G-7VVFQHW4RV";
