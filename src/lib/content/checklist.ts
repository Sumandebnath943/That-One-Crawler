import type { Faq } from "./guides";

// The blog SEO checklist: the page at /blog-seo-checklist and its Markdown twin both read this.

export const CHECKLIST_PATH = "/blog-seo-checklist";
export const CHECKLIST_TITLE = "Blog SEO Checklist: 25 Checks Before You Hit Publish";
export const CHECKLIST_DESCRIPTION =
  "A practical blog SEO checklist: titles, headings, keywords, internal links, images, structured data and AI search readiness, plus a free tool to check it all.";
export const CHECKLIST_ANSWER =
  "A blog SEO checklist makes sure every post can be found, understood and quoted: a 30–60 character title with the main keyword, one clear H1, a 120–160 character meta description, a direct answer up top, internal links, optimized images and Article markup. Here are 25 checks, grouped by stage.";

export interface ChecklistItem {
  title: string;
  body: string;
  guide?: string;
}

export const CHECKLIST_STAGES: { id: string; title: string; answer: string; items: ChecklistItem[] }[] = [
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

export const CHECKLIST_FAQS: Faq[] = [
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
