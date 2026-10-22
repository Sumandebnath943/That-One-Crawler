import type { Metadata } from "next";
import Link from "next/link";
import { ContentShell, FaqSection, JsonLd, PageIntro, ScanCta } from "@/components/content/ContentKit";
import { GUIDES, type Faq } from "@/lib/content/guides";
import { markdownUrl } from "@/lib/content/negotiate";
import { abs, breadcrumbs, CONTENT_UPDATED, faqPage, graph } from "@/lib/content/structured-data";
import { ISSUES, type IssueCategory } from "@/lib/seo/issues";

const PATH = "/checks";
const TITLE = "Every SEO Check Explained: What It Means and How to Fix It";
const DESCRIPTION =
  "Every SEO check That One Crawler runs, explained in plain English: titles, headings, broken links, cannibalization, schema, speed and AI search readiness.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH, types: { "text/markdown": markdownUrl(PATH) } },
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
  "Security",
  "Brand rules",
];

const categoryId = (category: IssueCategory) => category.toLowerCase().replace(/\s+/g, "-");

const categories = CATEGORY_ORDER.map((category) => ({ category, guides: GUIDES.filter((g) => g.category === category) })).filter(
  (c) => c.guides.length,
);

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
        answer="That One Crawler runs over 50 checks on every page of your blog, from missing H1s and title length to broken links, keyword cannibalization and AI search readiness. Each guide below explains what a problem means, why it matters and exactly how to fix it, in under five minutes of reading."
        crumbs={crumbs}
      />
      <div className="shell space-y-14 py-12 lg:py-16">
        <nav aria-label="Categories" className="flex flex-wrap gap-2">
          {categories.map(({ category, guides }) => (
            <a
              key={category}
              href={`#${categoryId(category)}`}
              className="rounded-full border-2 border-ink bg-card px-3 py-1 text-sm font-semibold transition hover:-translate-y-0.5 hover:shadow-brutal-sm"
            >
              {category} <span className="text-ink-3">{guides.length}</span>
            </a>
          ))}
        </nav>
        {categories.map(({ category, guides }) => (
          <section key={category} id={categoryId(category)} aria-labelledby={`${categoryId(category)}-title`} className="scroll-mt-24">
            <h2 id={`${categoryId(category)}-title`} className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
              {category}
            </h2>
            <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {guides.map((g) => (
                <li key={g.slug}>
                  <Link
                    href={`/checks/${g.slug}`}
                    className="group flex h-full flex-col rounded-2xl border-2 border-ink bg-card p-5 transition hover:-translate-y-1 hover:shadow-brutal"
                  >
                    <span className="font-display text-lg leading-snug font-extrabold">{g.metaTitle.split(":")[0]}</span>
                    <span className="mt-2 flex-1 text-sm text-ink-2">{g.metaDescription}</span>
                    <span className="mt-4 flex flex-wrap gap-1.5">
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
        ))}
        <div className="max-w-3xl space-y-14">
          <ScanCta title="Find out which of these your blog has" />
          <FaqSection faqs={FAQS} />
        </div>
      </div>
    </ContentShell>
  );
}
