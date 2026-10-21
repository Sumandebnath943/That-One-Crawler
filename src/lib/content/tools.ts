import type { Faq } from "./guides";

// Keyword-targeted landing pages for the individual things That One Crawler does.
// Each opens with a direct answer and links to the matching "checks explained" guides.

export interface ToolPage {
  slug: string;
  keyword: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  h1: string;
  answer: string;
  features: { title: string; body: string }[];
  steps: string[];
  faqs: Faq[];
  guides: string[];
}

export const TOOLS: ToolPage[] = [
  {
    slug: "broken-link-checker",
    keyword: "free broken link checker",
    metaTitle: "Free Broken Link Checker: Scan Your Whole Blog",
    metaDescription:
      "A free broken link checker for your whole blog. Find broken internal and external links and heavy images in one scan, with no signup and no 100-link cap.",
    eyebrow: "Free broken link checker",
    h1: "Free broken link checker for your whole blog",
    answer:
      "That One Crawler is a free broken link checker that crawls your whole blog, checks internal and external links, and flags the ones that return 404, point at dead domains or throw server errors. It also weighs your images. There's no signup or install, and every broken link shows which pages to fix.",
    features: [
      {
        title: "Internal and external links",
        body: "We check links between your own pages and links out to other sites, so you catch moved posts and dead resources alike.",
      },
      {
        title: "Bot-blocking isn't “broken”",
        body: "Sites that refuse bots (403, 429, LinkedIn's 999) are reported separately, so you only spend time on links that are really dead.",
      },
      {
        title: "Linked-from lists",
        body: "Every broken URL lists the pages that link to it, so each fix is one click away.",
      },
      {
        title: "Heavy images too",
        body: "While we're there, we weigh your images and flag anything over 300 KB that slows your pages down.",
      },
    ],
    steps: [
      "Paste your blog URL and keep “Check links & images” switched on.",
      "We read your sitemap (or follow links), then check up to 400 outgoing links and images.",
      "Open the Links tab to see every broken URL and the pages that link to it.",
      "Fix them, rescan, and compare the two scans to confirm the fixes landed.",
    ],
    faqs: [
      {
        q: "Is the broken link checker really free?",
        a: "Yes. There's no signup and no credit card. Scans run from your browser and results are saved only on your device.",
      },
      {
        q: "How many links can it check?",
        a: "Up to 1,000 pages per scan, plus 400 outgoing links and images, starting with links between your own pages.",
      },
      {
        q: "Why is a link marked “blocked” instead of broken?",
        a: "Some sites refuse automated requests while working fine for people. We don't count those as broken, so you don't chase false alarms.",
      },
    ],
    guides: ["broken-links", "broken-pages-404", "redirects", "orphan-pages"],
  },
  {
    slug: "keyword-cannibalization-checker",
    keyword: "keyword cannibalization checker",
    metaTitle: "Free Keyword Cannibalization Checker for Blogs",
    metaDescription:
      "A free keyword cannibalization checker for blogs: find pages that compete for the same keyword across your whole site, without Search Console or spreadsheets.",
    eyebrow: "Free keyword cannibalization checker",
    h1: "Free keyword cannibalization checker for blogs",
    answer:
      "That One Crawler finds keyword cannibalization automatically. It works out each page's main keyword from its title, H1, URL and text, ignores phrases that appear on almost every page (like your blog's name), and groups pages that target the same keyword so you can pick one winner. No Search Console connection needed.",
    features: [
      {
        title: "A main keyword for every page",
        body: "Each page gets a main keyword, along with where it appears: title, H1, description, URL and opening paragraph.",
      },
      {
        title: "Ignores your brand",
        body: "Phrases that show up on most pages, like your blog's name, are filtered out so they don't create false matches.",
      },
      {
        title: "Competing pages, grouped",
        body: "Pages chasing the same keyword are grouped with their scores, so the strongest candidate to keep is obvious.",
      },
      {
        title: "Keyword stuffing check",
        body: "Pages where the main keyword is more than 3% of the text are flagged as possible keyword stuffing.",
      },
    ],
    steps: [
      "Paste your blog URL and start the scan.",
      "Open the Keywords tab when it finishes.",
      "For each group, choose the page that should own the keyword.",
      "Merge, redirect or re-angle the rest, then rescan to confirm.",
    ],
    faqs: [
      {
        q: "How is this different from Search Console data?",
        a: "Search Console shows which pages Google actually ranks for each query. We read your content to find pages targeting the same keyword, ideally before they start competing. The two work well together.",
      },
      {
        q: "Do you show search volumes?",
        a: "No, and we never invent them. Keywords come from your own pages; real volumes need a paid or Google Ads data source.",
      },
      {
        q: "What should I do with cannibalizing pages?",
        a: "Keep the strongest page, merge useful content from the others into it and 301-redirect them, or rewrite them to target clearly different angles.",
      },
    ],
    guides: ["keyword-cannibalization", "keyword-placement", "keyword-stuffing", "duplicate-title-tags"],
  },
  {
    slug: "geo-aeo-checker",
    keyword: "geo aeo checker",
    metaTitle: "Free GEO & AEO Checker: Is Your Blog Ready for AI Search?",
    metaDescription:
      "A free GEO and AEO checker that scores every page for AI search readiness: direct answers, question headings, facts, FAQs and markup that AI tools quote.",
    eyebrow: "Free GEO & AEO checker",
    h1: "Free GEO and AEO checker for your whole blog",
    answer:
      "That One Crawler scores every page of your blog from 0 to 100 for AI search readiness, also called GEO (generative engine optimization) or AEO (answer engine optimization). It checks for a direct answer up top, answers under question-style headings, specific facts, lists, an FAQ, structured data and a clear author and date.",
    features: [
      {
        title: "Your whole site, not one page",
        body: "Most GEO checkers test one URL at a time. We score every page, so you can see which posts AI tools are most and least likely to quote.",
      },
      {
        title: "A checklist, not a black box",
        body: "Each page shows exactly which of the seven readiness checks it passes, and what to change for the ones it doesn't.",
      },
      {
        title: "AI fixes that fit free tiers",
        body: "One click drafts a quick-answer intro, question-style headings or an FAQ with markup, using only facts already on your page.",
      },
      {
        title: "Prompt-injection detection",
        body: "We flag hidden text that tries to give instructions to AI assistants, which can get a page treated as manipulative.",
      },
    ],
    steps: [
      "Paste your blog URL and start the scan.",
      "Check the AI-ready column and the site's average AI-readiness score.",
      "Open any page's Content tab for its readiness checklist.",
      "Use the AI tools to draft the missing pieces, then rescan.",
    ],
    faqs: [
      {
        q: "What is GEO?",
        a: "Generative engine optimization is structuring content so AI systems like ChatGPT, Perplexity and Google AI Overviews can understand, trust and cite it.",
      },
      {
        q: "What is AEO?",
        a: "Answer engine optimization focuses on direct, concise answers that search features and voice assistants can lift. In practice it overlaps heavily with GEO.",
      },
      {
        q: "Does this show whether ChatGPT already cites me?",
        a: "No. It measures how ready your pages are to be cited. Tracking real citations means querying the AI tools themselves.",
      },
    ],
    guides: ["ai-search-readiness", "faq-schema", "structured-data", "hidden-ai-instructions"],
  },
  {
    slug: "meta-tag-checker",
    keyword: "meta tag checker",
    metaTitle: "Free Meta Tag Checker: Titles, Descriptions and Previews",
    metaDescription:
      "A free meta tag checker for your whole blog: check title and meta description lengths, find duplicates, and preview each page in Google and on social media.",
    eyebrow: "Free meta tag checker",
    h1: "Free meta tag checker with Google and social previews",
    answer:
      "That One Crawler checks the title tag and meta description on every page of your blog: missing, too short, too long, cut off or duplicated. It previews each page as a Google result, measured in pixels the way Google does, and as a social share card, and it can suggest better versions with AI.",
    features: [
      {
        title: "Pixel-accurate Google preview",
        body: "Titles are measured in pixels against Google's roughly 600-pixel limit, not just counted in characters.",
      },
      {
        title: "Duplicates across the whole site",
        body: "Pages sharing a title or description are grouped together, something single-page checkers can't see.",
      },
      {
        title: "Social share cards",
        body: "See how each page looks when shared, and which Open Graph tags are missing.",
      },
      {
        title: "AI rewrites with a diff",
        body: "Get a better title and description, see exactly what changed, and preview it in Google before you copy it.",
      },
    ],
    steps: [
      "Paste your blog URL and start the scan.",
      "Filter by “Title too long”, “Missing meta description” or “Duplicate title”.",
      "Open a page to see its Google and social previews.",
      "Open AI tools, then Title & meta description, for suggestions.",
    ],
    faqs: [
      {
        q: "How long should a title tag be?",
        a: "About 30–60 characters, or roughly 600 pixels, so Google shows it in full.",
      },
      {
        q: "How long should a meta description be?",
        a: "About 120–160 characters. Shorter wastes space in results; longer gets cut off.",
      },
      {
        q: "Can I check a single page or one section?",
        a: "Yes. Enter a path such as myblog.com/blog and the scan covers that section, or a full post URL to focus on one page.",
      },
    ],
    guides: ["title-tag-length", "meta-description-length", "duplicate-title-tags", "open-graph-tags"],
  },
];

export function toolFor(slug: string): ToolPage {
  const tool = TOOLS.find((t) => t.slug === slug);
  if (!tool) throw new Error(`Unknown tool page: ${slug}`);
  return tool;
}
