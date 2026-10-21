import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, ContentShell, FaqSection, JsonLd, PageIntro, ScanCta } from "@/components/content/ContentKit";
import { GUIDES, type Faq } from "@/lib/content/guides";
import { abs, breadcrumbs, CONTENT_UPDATED, faqPage, graph } from "@/lib/content/structured-data";
import { ISSUES, type IssueCategory } from "@/lib/seo/issues";

const PATH = "/checks";
const TITLE = "Every SEO Check Explained: What It Means and How to Fix It";
const DESCRIPTION =
  "Every SEO check That One Crawler runs, explained in plain English: titles, headings, broken links, cannibalization, schema, speed and AI search readiness.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: "website" },
};

const FAQS: Faq[] = [
  {
    q: "Which SEO issues should I fix first?",
    a: "Start with critical issues: broken pages, noindex tags, pages blocked by robots.txt and missing titles or H1s. They stop pages from ranking at all. Then work through warnings like thin content, duplicate titles and broken links.",
  },
  {
    q: "How do I know which of these problems my blog has?",
    a: "Run a free scan with That One Crawler. It checks every page against all of these and links each issue it finds to the matching guide here.",
  },
  {
    q: "Are these checks the same ones Google uses?",
    a: "They're based on Google's published guidance and common SEO practice, not Google's private ranking system. Each guide explains why the issue matters, so you can decide how much it affects your site.",
  },
];

const CATEGORY_ORDER: IssueCategory[] = [
  "Indexing",
  "Search appearance",
  "Content",
  "Keywords",
  "Links",
  "Structured data",
  "AI search",
  "Performance",
  "Brand rules",
];

export default function ChecksIndex() {
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Checks explained", path: PATH },
  ];
  return (
    <ContentShell>
      <JsonLd
        data={graph(
          {
            "@type": "CollectionPage",
            "@id": `${abs(PATH)}#page`,
            name: TITLE,
            description: DESCRIPTION,
            url: abs(PATH),
            datePublished: CONTENT_UPDATED,
            dateModified: CONTENT_UPDATED,
            author: { "@id": `${abs("/")}#author` },
            isPartOf: { "@id": `${abs("/")}#website` },
            mainEntity: {
              "@type": "ItemList",
              itemListElement: GUIDES.map((g, i) => ({ "@type": "ListItem", position: i + 1, url: abs(`/checks/${g.slug}`), name: g.title })),
            },
          },
          breadcrumbs(crumbs),
          faqPage(FAQS, PATH),
        )}
      />
      <PageIntro
        eyebrow="SEO checks, explained"
        title="Every SEO check we run, explained in plain English"
        answer="That One Crawler runs over 45 checks on every page of your blog, from missing H1s and title length to broken links, keyword cannibalization and AI search readiness. Each guide below explains what a problem means, why it matters and exactly how to fix it, in under five minutes of reading."
      >
        <div className="mt-6">
          <Breadcrumbs items={crumbs} />
        </div>
      </PageIntro>
      <div className="mx-auto max-w-5xl space-y-12 px-4 py-14 sm:px-6">
        {CATEGORY_ORDER.map((category) => {
          const guides = GUIDES.filter((g) => g.category === category);
          if (!guides.length) return null;
          return (
            <section key={category} aria-labelledby={`cat-${category}`}>
              <h2 id={`cat-${category}`} className="font-display text-3xl font-extrabold tracking-tight">
                {category}
              </h2>
              <ul className="mt-5 grid gap-4 sm:grid-cols-2">
                {guides.map((g) => (
                  <li key={g.slug}>
                    <Link
                      href={`/checks/${g.slug}`}
                      className="block h-full rounded-2xl border-2 border-ink bg-card p-5 shadow-brutal transition hover:-translate-y-1"
                    >
                      <span className="block font-display text-xl font-extrabold">{g.title}</span>
                      <span className="mt-2 block text-sm text-ink-2">{g.metaDescription}</span>
                      <span className="mt-3 flex flex-wrap gap-1.5">
                        {g.codes.map((code) => (
                          <span key={code} className="rounded-full bg-sunk px-2 py-0.5 text-xs font-semibold text-ink-2">
                            {ISSUES[code].label}
                          </span>
                        ))}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        <ScanCta title="Find out which of these your blog has" />
        <FaqSection faqs={FAQS} />
      </div>
    </ContentShell>
  );
}
