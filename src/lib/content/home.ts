import type { Faq } from "./guides";

// The homepage's words, shared by the page (components/landing/Sections.tsx) and its Markdown twin.

export const HERO = {
  h1: "Your blog has issues. This free SEO audit finds every single one.",
  intro:
    "That One Crawler reads every page on your blog and reports back like that one brutally honest friend: missing H1s, thin content, broken links, posts fighting over the same keyword, and whether AI search will ever quote you.",
};

export const JUDGED = [
  {
    tag: "<title>",
    title: "Titles & meta descriptions",
    body: "Too long, too short, missing, cut off or copy-pasted across 47 posts. Measured in pixels, the way Google does.",
    href: "/meta-tag-checker",
  },
  {
    tag: "<h1>",
    title: "Headings & readability",
    body: "A page without an H1 is just a vibe. We also catch skipped heading levels, walls of text and sentences that never end.",
    href: "/checks/missing-h1-tag",
  },
  {
    tag: "×2",
    title: "Keywords & cannibalization",
    body: "Each page's main keyword, where it's missing, and which of your posts are fighting each other for the same search.",
    href: "/keyword-cannibalization-checker",
  },
  {
    tag: "404",
    title: "Broken links & orphans",
    body: "Dead links, redirect chains, pages nobody links to and posts buried ten clicks deep. The haunted wing of your blog.",
    href: "/broken-link-checker",
  },
  {
    tag: "✦ GEO",
    title: "AI search & AI agents",
    body: "Will ChatGPT, Perplexity and Google AI Overviews quote you, and can their agents even get in? Answers, facts, llms.txt, Markdown and bot walls.",
    href: "/ai-agent-readiness-checker",
  },
  {
    tag: "noindex",
    title: "Indexability",
    body: "noindex tags, robots.txt rules and wrong canonicals quietly hiding your best work from search engines. Rude.",
    href: "/checks/noindex-tag",
  },
  {
    tag: "{ }",
    title: "Structured data & sharing",
    body: "Broken JSON-LD, half-filled Article markup and missing Open Graph tags that make shared links look like ransom notes.",
    href: "/checks/structured-data",
  },
  {
    tag: "2019",
    title: "Freshness & speed",
    body: "Posts nobody's touched in a year, images heavier than your excuses, and Google's PageSpeed and Core Web Vitals.",
    href: "/page-speed-test",
  },
];

export const STEPS = [
  { title: "Paste a URL", body: "Any blog. Yours, ideally. Snooping on competitors is also allowed." },
  {
    title: "We read everything",
    body: "Sitemap first, newest posts first. No sitemap? We follow links like a nosy neighbor, a few pages at a time so your server barely notices.",
  },
  {
    title: "You get the verdict",
    body: "An SEO score, an AI-readiness score, a prioritized to-do list and a mild existential crisis. Export to CSV for crying in a spreadsheet.",
  },
];

export const FAQ_HOME: Faq[] = [
  {
    q: "Is That One Crawler really a free SEO audit tool?",
    a: 'Yes. It runs on a hobby plan and pure spite. No signup, no email, no "book a demo". The AI tools include 20 free actions a day, then you can plug in your own free Gemini key.',
  },
  {
    q: "Will scanning my blog slow it down?",
    a: "No. We crawl politely, about six pages at a time, and only read public pages. Your server will barely notice. Your ego might.",
  },
  {
    q: "Where do my results go?",
    a: "Into your own browser. Scans are saved on your device, not on our servers. We don't have a database. We barely have a server.",
  },
  {
    q: "How many pages can it check?",
    a: "Up to 1,000 per scan (300 by default). We read your sitemap first, newest posts first, and check posts before tag and category archives.",
  },
  {
    q: "What's the difference between SEO, GEO and AEO?",
    a: "SEO gets you ranked in search results. GEO (generative engine optimization) and AEO (answer engine optimization) get you quoted in AI answers from ChatGPT, Perplexity and Google AI Overviews. We check for all three.",
  },
  {
    q: "My site is built with JavaScript and the results look empty.",
    a: "We read the HTML your server sends, the way most crawlers do on their first pass. If the content only shows up after JavaScript runs, we flag it, because search engines and AI tools may struggle with it too.",
  },
  {
    q: "What happened to Crawl Daddy?",
    a: "He retired. This is his more responsible younger sibling: same instincts, faster legs, and no longer needs to be republished every 30 days to stay alive.",
  },
];

/** The homepage's explanatory sections, as plain text for the Markdown twin. */
export const HOME_SECTIONS: { title: string; body: string[] }[] = [
  { title: "Your blog has issues", body: [HERO.intro] },
  {
    title: "What is a blog SEO audit?",
    body: [
      "A blog SEO audit checks every page of your blog for the problems that stop posts from ranking: missing or duplicate titles, thin content, broken links, pages search engines can't index, and slow, heavy pages. That One Crawler runs the whole audit for free in a couple of minutes and ranks the fixes by impact.",
      "Most free tools stop at one page or a hundred URLs. We read your sitemap and check up to 1,000 pages, then give each one an SEO score out of 100 with a plain-English explanation of every issue. Not sure where to start? Follow the [blog SEO checklist](/blog-seo-checklist).",
    ],
  },
  {
    title: "SEO, GEO and AEO in one scan",
    body: [
      "Search is no longer just ten blue links. Google AI Overviews, ChatGPT and Perplexity answer questions directly and quote the pages that answer best. We score every page for AI search readiness (GEO and AEO) alongside classic SEO, so you can rank and get cited.",
      [
        "- **For search engines:** titles, headings, canonicals, indexing, links and structured data.",
        "- **For AI answer engines:** direct answers, question headings, specific facts and FAQs.",
        "- **For readers:** readability, freshness, broken links and page speed.",
      ].join("\n"),
    ],
  },
  {
    title: "Things we will absolutely judge",
    body: [
      "Over 50 checks on every page, plus 24 on whether AI agents can use your site, each ranked from \"fix this today\" to \"whenever you get a sec\", with a guide explaining how to fix it. [See every check explained](/checks).",
      JUDGED.map((j) => `- **[${j.title}](${j.href}):** ${j.body}`).join("\n"),
    ],
  },
  {
    title: "How the free SEO audit works",
    body: [STEPS.map((step, i) => `${i + 1}. **${step.title}.** ${step.body}`).join("\n")],
  },
];
