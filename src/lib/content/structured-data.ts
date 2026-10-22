import { AUTHOR, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import type { Faq } from "./guides";

// JSON-LD builders. Everything here describes content that is visible on the page.

/** When the site's editorial content was last revised (shown on pages and in markup). */
export const CONTENT_UPDATED = "2026-10-22";

export const abs = (path: string) => `${SITE_URL}${path === "/" ? "" : path}`;

export const person = {
  "@type": "Person",
  "@id": `${SITE_URL}/#author`,
  name: AUTHOR.name,
  url: AUTHOR.url,
  image: AUTHOR.image,
  jobTitle: AUTHOR.jobTitle,
  sameAs: AUTHOR.sameAs,
};

export const website = {
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  inLanguage: "en",
  creator: { "@id": `${SITE_URL}/#author` },
  publisher: { "@id": `${SITE_URL}/#author` },
  about: { "@id": `${SITE_URL}#app` },
};

/** A plain page of a given schema.org type (AboutPage, ContactPage, WebPage…). */
export function webPage(type: string, opts: { name: string; description: string; path: string; extra?: object }) {
  return {
    "@type": type,
    "@id": `${abs(opts.path)}#page`,
    name: opts.name,
    description: opts.description,
    url: abs(opts.path),
    inLanguage: "en",
    isPartOf: { "@id": `${SITE_URL}/#website` },
    dateModified: CONTENT_UPDATED,
    ...opts.extra,
  };
}

export function webApplication(name: string, path: string, description: string, features: string[]) {
  return {
    "@type": "WebApplication",
    "@id": `${abs(path)}#app`,
    name,
    url: abs(path),
    description,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "SEO audit tool",
    operatingSystem: "Any (runs in the browser)",
    isAccessibleForFree: true,
    datePublished: CONTENT_UPDATED,
    dateModified: CONTENT_UPDATED,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    featureList: features,
    creator: { "@id": `${SITE_URL}/#author` },
  };
}

export function faqPage(faqs: Faq[], path: string) {
  return {
    "@type": "FAQPage",
    "@id": `${abs(path)}#faq`,
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function breadcrumbs(items: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: abs(item.path),
    })),
  };
}

export function article(opts: { type?: string; headline: string; description: string; path: string; about?: string }) {
  return {
    "@type": opts.type ?? "TechArticle",
    "@id": `${abs(opts.path)}#article`,
    headline: opts.headline,
    description: opts.description,
    url: abs(opts.path),
    mainEntityOfPage: abs(opts.path),
    inLanguage: "en",
    datePublished: CONTENT_UPDATED,
    dateModified: CONTENT_UPDATED,
    author: { "@id": `${SITE_URL}/#author` },
    publisher: { "@id": `${SITE_URL}/#author` },
    image: `${SITE_URL}/opengraph-image`,
    ...(opts.about ? { about: opts.about } : {}),
    isPartOf: { "@id": `${SITE_URL}/#website` },
  };
}

export function graph(...nodes: object[]) {
  return { "@context": "https://schema.org", "@graph": [person, website, ...nodes] };
}
