import type { Metadata } from "next";
import Link from "next/link";
import {
  ArticleLayout,
  ContentShell,
  FaqSection,
  JsonLd,
  PageIntro,
  readingTime,
  ScanCta,
  Section,
  SideCta,
} from "@/components/content/ContentKit";
import type { Faq } from "@/lib/content/guides";
import { article, breadcrumbs, faqPage, graph } from "@/lib/content/structured-data";

const PATH = "/blog-seo-checklist";
const TITLE = "Blog SEO Checklist: 25 Checks Before You Hit Publish";
const DESCRIPTION =
  "A practical blog SEO checklist: titles, headings, keywords, internal links, images, structured data and AI search readiness, plus a free tool to check it all.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: "article" },
};

interface Item {
  title: string;
  body: string;
  guide?: string;
}

const STAGES: { id: string; title: string; answer: string; items: Item[] }[] = [
  {
    id: "before-you-write",
    title: "Before you write",
    answer:
      "Good blog SEO starts before the first sentence. Choose one main keyword per post, check that no other post already targets it, study what currently ranks to match the searcher's intent, and decide the one or two sentence answer your post will give.",
    items: [
      {
        title: "Pick one main keyword per post",
        body: "One clear topic per URL. Secondary phrases are fine, but the post should be about one thing.",
        guide: "keyword-placement",
      },
      {
        title: "Make sure no other post targets it",
        body: "Two posts chasing the same keyword compete with each other. Update the old one instead of writing a rival.",
        guide: "keyword-cannibalization",
      },
      {
        title: "Match the search intent",
        body: "Search the keyword and look at what ranks: guides, lists, comparisons or tools. Write the format searchers clearly want.",
      },
      {
        title: "Write down your direct answer",
        body: "Decide the one or two sentence answer to the main question. It becomes your intro and the passage AI tools quote.",
        guide: "ai-search-readiness",
      },
    ],
  },
  {
    id: "on-the-page",
    title: "On the page",
    answer:
      "On-page SEO is about telling search engines clearly what each post is about. Write a 30–60 character title with the main keyword near the start, one H1, a 120–160 character meta description, and use the keyword in the URL slug and first 100 words.",
    items: [
      {
        title: "Title tag of 30–60 characters",
        body: "Main keyword near the start, a reason to click at the end, unique across the site.",
        guide: "title-tag-length",
      },
      { title: "Exactly one H1", body: "The post title, near the top, agreeing with the title tag.", guide: "missing-h1-tag" },
      {
        title: "Meta description of 120–160 characters",
        body: "A specific summary that ends in a full sentence, never an automatic “[…]” excerpt.",
        guide: "meta-description-length",
      },
      {
        title: "Keyword in the URL and first 100 words",
        body: "A short slug like /sourdough-starter, and the keyword used naturally in the opening paragraph.",
        guide: "keyword-placement",
      },
      {
        title: "A clean heading outline",
        body: "H2 for sections, H3 inside them, no skipped levels.",
        guide: "heading-hierarchy",
      },
    ],
  },
  {
    id: "content-and-ai",
    title: "Content quality and AI search readiness",
    answer:
      "To rank in Google and get quoted by AI answer engines, open with a 40–60 word direct answer, put short answer paragraphs under question-style headings, use specific facts, lists and tables, add an FAQ with FAQPage markup, and keep paragraphs short and readable.",
    items: [
      { title: "A 40–60 word answer up top", body: "Answer the main question in the first paragraph, before any backstory.", guide: "ai-search-readiness" },
      {
        title: "Answers under question headings",
        body: "Phrase some H2s as questions and answer each in the first 30–80 words beneath it.",
        guide: "ai-search-readiness",
      },
      {
        title: "Specific facts, numbers and sources",
        body: "“Ready in about 7 days” beats “ready soon”. Name sources for claims.",
      },
      { title: "Lists and tables", body: "Bullets for steps and options, tables for comparisons. Both are easy to scan and quote." },
      { title: "An FAQ with markup", body: "Three to six real questions with short answers, plus FAQPage JSON-LD.", guide: "faq-schema" },
      {
        title: "Short paragraphs, plain words",
        body: "Three or four sentences per paragraph, sentences under about 25 words, jargon explained.",
        guide: "readability",
      },
    ],
  },
  {
    id: "links",
    title: "Links",
    answer:
      "Internal links tell search engines which posts matter and help readers find more. Link each new post to two or three related posts, link to it from older posts so it's never an orphan, and make sure every link points straight at a live page.",
    items: [
      {
        title: "Link to related posts",
        body: "Two or three links to closely related posts, with descriptive anchor text.",
      },
      {
        title: "Link to it from older posts",
        body: "Add links from relevant existing posts so the new one isn't an orphan.",
        guide: "orphan-pages",
      },
      {
        title: "No broken links, no redirects",
        body: "Every outgoing link should reach a live page directly, not through a redirect.",
        guide: "broken-links",
      },
    ],
  },
  {
    id: "images-and-speed",
    title: "Images and speed",
    answer:
      "Images are usually the heaviest part of a post. Give every meaningful image descriptive alt text, compress it and serve WebP or AVIF under about 300 KB, and set width and height so the layout doesn't jump while the page loads.",
    items: [
      { title: "Alt text on every meaningful image", body: "A short, specific description; alt=\"\" for decoration.", guide: "image-alt-text" },
      { title: "Compressed, modern formats", body: "WebP or AVIF, resized to display size, under about 300 KB.", guide: "image-optimization" },
      { title: "Width and height set", body: "So the browser reserves space and nothing shifts as images load.", guide: "image-optimization" },
    ],
  },
  {
    id: "technical-and-after",
    title: "Technical checks and after publishing",
    answer:
      "Before and after publishing, confirm the post is indexable with a self-referencing canonical, has BlogPosting structured data and Open Graph tags, appears in your sitemap with a fresh lastmod, and gets re-audited every few months so it never goes stale.",
    items: [
      {
        title: "Self-referencing canonical, no noindex",
        body: "The canonical points at the post itself, and nothing accidentally hides it from search.",
        guide: "canonical-tag",
      },
      {
        title: "BlogPosting structured data",
        body: "Headline, author, datePublished, dateModified and image in JSON-LD.",
        guide: "structured-data",
      },
      { title: "Open Graph tags and a share image", body: "So the post looks good when shared.", guide: "open-graph-tags" },
      {
        title: "In the sitemap, with lastmod",
        body: "Make sure the post appears in your XML sitemap and request indexing for important posts.",
      },
    ],
  },
];

const FAQS: Faq[] = [
  {
    q: "How often should I audit my blog's SEO?",
    a: "Run a full audit every one to three months, and after any redesign, migration or plugin change. A quick check of each new post before publishing catches most problems early.",
  },
  {
    q: "What's the most important item on this checklist?",
    a: "Making sure the post can be found at all: indexable, linked from other posts and in your sitemap. After that, a clear title and a direct answer up top do the most for clicks and AI citations.",
  },
  {
    q: "Do I need an SEO plugin to follow this checklist?",
    a: "No, but plugins like Yoast, Rank Math or SEOPress make titles, descriptions, canonicals, sitemaps and structured data much easier to manage on WordPress.",
  },
  {
    q: "Can I check all of this automatically?",
    a: "Most of it. That One Crawler checks titles, headings, descriptions, keywords, links, images, structured data, freshness and AI readiness across your whole blog for free.",
  },
];

export default function ChecklistPage() {
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Blog SEO checklist", path: PATH },
  ];
  const total = STAGES.reduce((sum, s) => sum + s.items.length, 0);
  const minutes = readingTime(...STAGES.flatMap((s) => [s.answer, ...s.items.flatMap((i) => [i.title, i.body])]), ...FAQS.map((f) => f.a));
  // Where each stage's numbering starts, so items count 01–25 across the whole checklist.
  const firstNumber = STAGES.map((_, i) => STAGES.slice(0, i).reduce((sum, s) => sum + s.items.length, 1));
  return (
    <ContentShell>
      <JsonLd
        data={graph(
          article({ type: "Article", headline: TITLE, description: DESCRIPTION, path: PATH, about: "blog SEO checklist" }),
          faqPage(FAQS, PATH),
          breadcrumbs(crumbs),
        )}
      />
      <PageIntro
        eyebrow="Blog SEO checklist"
        title={`The blog SEO checklist: ${total} checks before (and after) you hit publish`}
        answer="A blog SEO checklist makes sure every post can be found, understood and quoted: a 30–60 character title with the main keyword, one clear H1, a 120–160 character meta description, a direct answer up top, internal links, optimized images and Article markup. Here are 25 checks, grouped by stage."
        crumbs={crumbs}
        minutes={minutes}
        mood="happy"
      />

      <ArticleLayout
        toc={[...STAGES.map((s) => ({ id: s.id, label: s.title })), { id: "faq", label: "FAQ" }]}
        aside={
          <SideCta
            title="Check all 25 automatically"
            body="One free scan runs this whole checklist on every post."
            href="/"
            label="Scan my blog →"
          />
        }
      >
        <nav aria-label="Checklist sections" className="rounded-2xl border-2 border-dashed border-line p-5 lg:hidden">
          <p className="text-xs font-bold tracking-wider text-ink-3 uppercase">In this checklist</p>
          <ol className="mt-3 grid gap-1 text-ink-2 sm:grid-cols-2">
            {STAGES.map((stage, i) => (
              <li key={stage.id}>
                <a href={`#${stage.id}`} className="underline-offset-2 hover:text-ink hover:underline">
                  {i + 1}. {stage.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {STAGES.map((stage, s) => (
          <Section key={stage.id} id={stage.id} title={stage.title}>
            <p>{stage.answer}</p>
            <ul className="space-y-3 pt-2">
              {stage.items.map((item, i) => {
                return (
                  <li key={item.title} className="flex gap-4 rounded-2xl border-2 border-line bg-card p-4 transition hover:border-ink">
                    <span
                      aria-hidden
                      className="grid size-8 shrink-0 place-items-center rounded-lg border-2 border-ink bg-lime font-mono text-xs font-bold text-lime-ink"
                    >
                      {String(firstNumber[s] + i).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-display text-lg leading-snug font-bold text-ink">{item.title}</h3>
                      <p className="mt-1 text-base text-ink-2">{item.body}</p>
                      {item.guide && (
                        <Link
                          href={`/checks/${item.guide}`}
                          className="mt-2 inline-block text-sm font-bold text-ink underline decoration-line underline-offset-4 hover:decoration-ink"
                        >
                          How to fix it →
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Section>
        ))}

        <ScanCta title="Run the whole checklist on your blog, free" />
        <FaqSection faqs={FAQS} />
      </ArticleLayout>
    </ContentShell>
  );
}
