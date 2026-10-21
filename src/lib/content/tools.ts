import type { Faq } from "./guides";

// Keyword-targeted landing pages, each with its own focused tool. Single-page tools answer in
// seconds; site tools run a crawl tuned for one job. Each opens with a direct answer and links to
// the matching "checks explained" guides.

export type ToolMode = "page" | "site";

export const MODE_LABEL: Record<ToolMode, string> = {
  page: "One page · seconds",
  site: "Whole site · crawl",
};

export interface ToolPage {
  slug: string;
  keyword: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  h1: string;
  answer: string;
  /** Checks one URL instantly, or crawls the whole site. */
  mode: ToolMode;
  /** One line for tool cards elsewhere on the site. */
  summary: string;
  /** Submit button label. */
  action: string;
  placeholder: string;
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
    mode: "site",
    summary: "Crawls your blog and tests every link and image. Shows each dead link and the pages that point at it.",
    action: "Check my links",
    placeholder: "myblog.com",
    features: [
      {
        title: "Internal and external links",
        body: "We check links between your own pages and links out to other sites, so you catch moved posts and dead resources alike.",
      },
      {
        title: "Bot-blocking isn't “broken”",
        body: "Sites that refuse bots (403, 429, LinkedIn's 999) are listed separately, so you only spend time on links that are really dead.",
      },
      {
        title: "Found-on lists",
        body: "Every broken URL lists the pages that link to it, so each fix is one click away.",
      },
      {
        title: "Heavy images too",
        body: "We weigh your images while we're there and flag anything over 300 KB that slows your pages down.",
      },
    ],
    steps: [
      "Paste your blog's address and choose how many pages to crawl.",
      "We crawl your pages, then test up to 400 outgoing links and images.",
      "Switch between broken, blocked and heavy-image results. Each one lists the pages to fix.",
      "Fix them and run it again, or open the full report to see everything else we found.",
    ],
    faqs: [
      {
        q: "Is the broken link checker really free?",
        a: "Yes. There's no signup, no credit card and no 100-link cap. The check runs from your browser, results are saved only on your device, and you can run it as often as you like to confirm your fixes.",
      },
      {
        q: "How many links can it check?",
        a: "Up to 1,000 pages per crawl, plus 400 outgoing links and images, starting with links between your own pages.",
      },
      {
        q: "Why is a link marked “blocked” instead of broken?",
        a: "Some sites refuse automated requests (with a 403, a 429 or LinkedIn's 999) while working fine for people. We don't count those as broken, so you don't waste time chasing false alarms. Open one in your browser if you want to be sure.",
      },
    ],
    guides: ["broken-links", "broken-pages-404", "redirects", "image-optimization"],
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
      "That One Crawler finds keyword cannibalization automatically. It works out each page's main keyword from its title, H1, URL and text, ignores phrases that appear on almost every page (like your blog's name), and groups pages that target the same keyword, marking the strongest one to keep. No Search Console connection needed.",
    mode: "site",
    summary: "Works out every post's main keyword and groups the posts competing for the same one, with a winner picked.",
    action: "Find competing posts",
    placeholder: "myblog.com",
    features: [
      {
        title: "A main keyword for every page",
        body: "Each page gets a main keyword, along with where it appears: title, H1, description and URL.",
      },
      {
        title: "Ignores your brand",
        body: "Phrases that show up on most pages, like your blog's name, are filtered out so they don't create false matches.",
      },
      {
        title: "A winner for every group",
        body: "Pages chasing the same keyword are grouped, and the strongest one (best score, most internal links) is marked to keep.",
      },
      {
        title: "Keyword stuffing check",
        body: "Pages where the main keyword is more than 3% of the text are flagged as possible keyword stuffing.",
      },
    ],
    steps: [
      "Paste your blog's address and choose how many posts to read.",
      "We crawl your posts and work out each one's main keyword.",
      "Review each group of competing posts. The one marked “Keep” is the strongest candidate.",
      "Merge, redirect or re-angle the others, then run it again to confirm.",
    ],
    faqs: [
      {
        q: "How is this different from Search Console data?",
        a: "Search Console shows which pages Google actually ranks for each query. We read your content to find pages targeting the same keyword, ideally before they start competing. The two work well together.",
      },
      {
        q: "Do you show search volumes?",
        a: "No, and we never invent them. Keywords come from your own pages: titles, headings, URLs and the words you use most. Real search volumes need a paid tool or Google Ads data, which you can check for the groups we find.",
      },
      {
        q: "What should I do with cannibalizing pages?",
        a: "Keep the strongest page, which we mark for you. Then either merge the useful parts of the others into it and 301-redirect them, or rewrite them to target clearly different angles, such as a beginner guide and a troubleshooting post.",
      },
    ],
    guides: ["keyword-cannibalization", "keyword-placement", "keyword-stuffing", "duplicate-title-tags"],
  },
  {
    slug: "geo-aeo-checker",
    keyword: "geo aeo checker",
    metaTitle: "Free GEO & AEO Checker: Is Your Page Ready for AI Search?",
    metaDescription:
      "A free GEO and AEO checker that scores any page for AI search readiness: direct answers, question headings, facts, FAQs and markup that AI tools quote.",
    eyebrow: "Free GEO & AEO checker",
    h1: "Free GEO and AEO checker for any blog post",
    answer:
      "That One Crawler's GEO and AEO checker scores any page from 0 to 100 for AI search readiness: how easily Google AI Overviews, ChatGPT and Perplexity can lift and quote an answer from it. It checks for a direct answer up top, answers under question headings, specific facts, lists, an FAQ, structured data and a clear author and date.",
    mode: "page",
    summary: "Scores one post for AI search readiness in seconds, with a seven-point checklist and AI fixes.",
    action: "Check AI readiness",
    placeholder: "myblog.com/my-best-post",
    features: [
      {
        title: "One post, instant answer",
        body: "Paste any post and get its score in seconds. When you're ready, the full audit scores every page on your site.",
      },
      {
        title: "A checklist, not a black box",
        body: "See exactly which of the seven readiness checks the page passes, and what to change for the ones it doesn't.",
      },
      {
        title: "AI fixes that fit free tiers",
        body: "One click drafts a quick-answer intro or an FAQ with markup, using only facts already on your page.",
      },
      {
        title: "Prompt-injection detection",
        body: "We flag hidden text that tries to give instructions to AI assistants, which can get a page treated as manipulative.",
      },
    ],
    steps: [
      "Paste the address of one post or page.",
      "Read its score and the seven-point readiness checklist.",
      "Use the AI tools to draft a quick-answer intro or an FAQ for what's missing.",
      "Run the full audit to score every page on your site.",
    ],
    faqs: [
      {
        q: "What is GEO?",
        a: "Generative engine optimization (GEO) is structuring content so AI systems like ChatGPT, Perplexity and Google AI Overviews can understand, trust and cite it. In practice that means direct answers, clear headings, specific facts, and a visible author and date.",
      },
      {
        q: "What is AEO?",
        a: "Answer engine optimization (AEO) focuses on short, direct answers that search features, AI assistants and voice assistants can lift word for word. It overlaps heavily with GEO, and the same page changes usually help with both, as well as with classic SEO.",
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
      "A free meta tag checker: inspect any page's title, description, canonical and Open Graph tags, and preview exactly how it looks in Google and when shared.",
    eyebrow: "Free meta tag checker",
    h1: "Free meta tag checker with Google and social previews",
    answer:
      "That One Crawler's meta tag checker reads any page's title tag, meta description, canonical, robots and Open Graph tags in seconds. It measures the title in pixels the way Google does, previews the page as a Google result and a social share card, and can suggest a better title and description with AI.",
    mode: "page",
    summary: "Inspects one page's title, description, canonical, robots and social tags, with Google and share previews.",
    action: "Check meta tags",
    placeholder: "myblog.com/my-best-post",
    features: [
      {
        title: "Pixel-accurate Google preview",
        body: "Titles are measured in pixels against Google's roughly 600-pixel limit, not just counted in characters.",
      },
      {
        title: "Every tag that matters",
        body: "Title, description, canonical, robots, language, Open Graph and Twitter tags, each marked good, warning or missing.",
      },
      {
        title: "Social share cards",
        body: "See how the page looks when shared on social media and in chat apps, and which tags are missing.",
      },
      {
        title: "AI rewrites with a diff",
        body: "Get a better title and description, see exactly what changed, and preview it in Google before you copy it.",
      },
    ],
    steps: [
      "Paste the address of any page.",
      "Check each tag's status, length and the Google and social previews.",
      "Ask the AI for a better title and description, and compare the two.",
      "Run the full audit to find missing and duplicate tags across your whole site.",
    ],
    faqs: [
      {
        q: "How long should a title tag be?",
        a: "About 30–60 characters, or roughly 600 pixels, so Google shows it in full. Put the main keyword near the start and your brand name at the end, if it fits. Google often rewrites titles that are much shorter or longer than that.",
      },
      {
        q: "How long should a meta description be?",
        a: "About 120–160 characters. Shorter ones waste space in search results and longer ones get cut off mid-sentence. Google sometimes writes its own snippet anyway, but a clear, specific description is still the one it shows most often.",
      },
      {
        q: "Can I check every page at once?",
        a: "Yes. The full audit checks every page's tags and groups duplicate titles and descriptions, which a single-page check can't see.",
      },
    ],
    guides: ["title-tag-length", "meta-description-length", "duplicate-title-tags", "open-graph-tags"],
  },
];

/** "Free broken link checker" → "Broken link checker". */
export function toolName(tool: ToolPage): string {
  const name = tool.eyebrow.replace(/^Free /, "");
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function toolFor(slug: string): ToolPage {
  const tool = TOOLS.find((t) => t.slug === slug);
  if (!tool) throw new Error(`Unknown tool page: ${slug}`);
  return tool;
}
