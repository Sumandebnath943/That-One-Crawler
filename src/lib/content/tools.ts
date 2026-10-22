import type { Faq } from "./guides";

// Keyword-targeted landing pages, each with its own focused tool. Single-page tools answer in
// seconds; site tools run a crawl tuned for one job. Each opens with a direct answer and links to
// the matching "checks explained" guides.

export type ToolMode = "page" | "site" | "probe";

export const MODE_LABEL: Record<ToolMode, string> = {
  page: "One page · seconds",
  site: "Whole site · crawl",
  probe: "Whole site · seconds",
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
  {
    slug: "ai-agent-readiness-checker",
    keyword: "ai agent readiness checker",
    metaTitle: "Free AI Agent Readiness Checker for Any Website",
    metaDescription:
      "Check whether ChatGPT, Claude and Perplexity can reach and read your site: robots.txt, bot walls, Markdown, llms.txt, real 404s and identity, with fixes.",
    eyebrow: "Free AI agent readiness checker",
    h1: "Free AI agent readiness checker for your website",
    answer:
      "That One Crawler's AI agent readiness checker tests whether assistants like ChatGPT, Claude and Perplexity can reach your site, read it without a browser and find their way around. It checks robots.txt, firewalls, Markdown versions, llms.txt, real 404s, structured identity and trust pages, then scores the site out of 100 with the evidence for every result.",
    mode: "probe",
    summary: "Tests whether AI agents can get into your site and read it: robots.txt, bot walls, Markdown, llms.txt and more.",
    action: "Check agent access",
    placeholder: "myblog.com",
    features: [
      {
        title: "Knocks like the real agents",
        body: "We read your robots.txt rules for six AI agents and load your homepage as ChatGPT-User, OAI-SearchBot, Claude-User and PerplexityBot to catch firewall walls.",
      },
      {
        title: "Evidence for every check",
        body: "Each result says exactly what we saw: the status code, the header, the file size, the page we sampled. No black-box score.",
      },
      {
        title: "Essentials first",
        body: "Access problems that lock agents out count most. Emerging conventions like llms-full.txt or Link headers are bonus points that never cost you.",
      },
      {
        title: "A prompt to fix it",
        body: "Copy one prompt with every failed check, its evidence and the fix, and paste it into your AI coding agent.",
      },
    ],
    steps: [
      "Paste your site's address.",
      "We check robots.txt, firewalls, Markdown, llms.txt, 404s, structured data and sample pages in about 15 seconds.",
      "Read the essentials first: anything failed there locks agents out.",
      "Copy the improvement prompt into your coding agent, then check again.",
    ],
    faqs: [
      {
        q: "What is AI agent readiness?",
        a: "It's how easily AI assistants that browse for people, and AI search crawlers, can reach your site, read it without running JavaScript and understand who runs it. A site can rank well in Google and still turn agents away with a firewall or a JavaScript-only page.",
      },
      {
        q: "How is this different from the GEO checker?",
        a: "The GEO and AEO checker scores one page's content: direct answers, facts and FAQs that answer engines quote. This checker tests the whole site's access: whether agents get in at all. You need both.",
      },
      {
        q: "Does blocking GPTBot or CCBot lower my score?",
        a: "No. Blocking training crawlers is your choice, and we only report it. The score counts agents that fetch pages for a person or for AI search, such as ChatGPT-User, OAI-SearchBot, Claude-User and PerplexityBot.",
      },
    ],
    guides: ["ai-search-readiness", "blocked-by-robots-txt", "javascript-rendering", "hidden-ai-instructions"],
  },
  {
    slug: "page-speed-test",
    keyword: "page speed test",
    metaTitle: "Free Page Speed Test: Core Web Vitals and Lighthouse",
    metaDescription:
      "A free page speed test powered by Google PageSpeed Insights: real-user Core Web Vitals, Lighthouse scores and every fix, on mobile and desktop.",
    eyebrow: "Free page speed test",
    h1: "Free page speed test with Core Web Vitals",
    answer:
      "That One Crawler's page speed test runs Google PageSpeed Insights on any page, on mobile and desktop. It shows real-user Core Web Vitals from the Chrome UX Report, the four Lighthouse scores for performance, accessibility, best practices and SEO, and every audit that failed, with the files to fix and the time each fix could save.",
    mode: "page",
    summary: "Runs Google PageSpeed Insights on one page, mobile and desktop: Core Web Vitals, Lighthouse scores and every fix.",
    action: "Test page speed",
    placeholder: "myblog.com/my-best-post",
    features: [
      {
        title: "Google's own engine",
        body: "Results come straight from the PageSpeed Insights API and Lighthouse, so the scores match what Google's tool reports.",
      },
      {
        title: "Real users first",
        body: "Core Web Vitals from real Chrome visitors (LCP, INP and CLS) with the pass or fail assessment Google uses, when it has the data.",
      },
      {
        title: "Every failed audit",
        body: "Each audit that didn't pass, with the files or elements behind it and how much time fixing it could save.",
      },
      {
        title: "Mobile and desktop",
        body: "Both tests run at once, and you can copy every fix as one prompt for your AI coding agent.",
      },
    ],
    steps: [
      "Paste the address of any page.",
      "Wait 20–40 seconds while Google runs Lighthouse on mobile and desktop.",
      "Check the real-user Core Web Vitals first, then the lab scores and failed audits.",
      "Copy the improvement prompt, fix the biggest savings first, and test again.",
    ],
    faqs: [
      {
        q: "Is this the same as Google PageSpeed Insights?",
        a: "It uses the same PageSpeed Insights API and the same Lighthouse version, so the scores match. We lay out the results for fixing: every failed audit in one list, with a prompt you can hand to a coding agent.",
      },
      {
        q: "Why does my score change between runs?",
        a: "Lab tests run on real servers and networks, so performance scores often move a few points from run to run. Real-user data from the Chrome UX Report is steadier, and it's what Google uses for rankings.",
      },
      {
        q: "What's a good PageSpeed score?",
        a: "90 or more is good, 50 to 89 needs improvement and under 50 is poor. Passing Core Web Vitals for real users matters more than a perfect lab score.",
      },
    ],
    guides: ["slow-pages", "image-optimization", "javascript-rendering", "mixed-content"],
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
