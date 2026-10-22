import { AUTHOR, REPO_URL } from "@/lib/site";
import type { Faq } from "./guides";
import { GUIDES } from "./guides";
import { TOOLS } from "./tools";

// Text for the About, Contact, Privacy and bot pages. Each page and its Markdown twin read the same
// strings, so they can't drift apart. Strings may use [links](/path) and **bold**; the pages
// render them with <Rich>, and the Markdown twins use them as they are.

export interface PageSection {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface PageCopy {
  path: string;
  /** <title>, 50–60 characters. */
  title: string;
  /** Meta description, 120–160 characters. */
  description: string;
  eyebrow: string;
  h1: string;
  /** The 40–60 word direct answer under the H1. */
  answer: string;
  sections: PageSection[];
  faqs: Faq[];
}

export const STATS = [
  { value: "1,000", label: "pages per scan" },
  { value: "50+", label: "checks on every page" },
  { value: "24", label: "AI agent readiness checks" },
  { value: String(GUIDES.length), label: "fix-it guides" },
  { value: String(TOOLS.length), label: "free focused tools" },
  { value: "0", label: "signups, paywalls or databases" },
];

export const ABOUT: PageCopy = {
  path: "/about",
  title: "About That One Crawler: The Free Blog SEO Audit Tool",
  description:
    "That One Crawler is a free SEO, GEO and AI agent readiness audit tool for blogs, built by Suman Debnath. Who makes it, why it exists and how it stays honest.",
  eyebrow: "About",
  h1: "About That One Crawler",
  answer:
    "That One Crawler is a free SEO, GEO and AEO audit tool for blogs, made by independent developer Suman Debnath. It crawls up to 1,000 pages, scores each one for Google and for AI answers, checks whether AI agents can use the site, and explains every fix in plain English. No signup, no paywall.",
  sections: [
    {
      id: "what-it-does",
      title: "What That One Crawler does",
      paragraphs: [
        "Paste a blog's address and That One Crawler reads its sitemap (or follows its links), fetches up to 1,000 pages a few at a time, and checks every one for the problems that stop posts from ranking or being quoted: missing or duplicate titles, thin content, broken links, keyword cannibalization, pages search engines can't index, missing structured data and slow, heavy pages.",
        "Each page gets an **SEO score** and an **AI search readiness score** out of 100, and the site gets an **AI agent readiness score** from 24 checks on whether assistants like ChatGPT, Claude and Perplexity can reach and read it. Every finding links to a [guide that explains the fix](/checks), and the whole list can be copied as one prompt for an AI coding agent.",
      ],
    },
    {
      id: "who-makes-it",
      title: "Who makes it",
      paragraphs: [
        `That One Crawler is designed, built and run by [${AUTHOR.name}](${AUTHOR.url}), an independent developer who builds AI and web tools. There's no company, investor or sales team behind it: one person, a Vercel hobby plan and a strong opinion that SEO tools shouldn't hide the useful parts behind a login.`,
        `The code is public on [GitHub](${REPO_URL}), so you can see exactly what it checks and how it scores.`,
      ],
    },
    {
      id: "why-it-exists",
      title: "Why it exists",
      paragraphs: [
        "It started as **Crawl Daddy**, a blog SEO scanner built with Python, Flask and a headless browser on Replit. It worked, but it had to be republished every 30 days to stay online.",
        "In October 2026 it was rebuilt from scratch as That One Crawler: faster, free to run, always online, and extended for how search works now. Google still matters, but so do AI Overviews, ChatGPT search, Perplexity and the agents that browse for people, so every scan checks for all of them.",
      ],
    },
    {
      id: "principles",
      title: "How we keep it honest",
      bullets: [
        "**Evidence for every finding.** Each issue says what we saw and where, so you can check it yourself.",
        "**Nothing invented.** No made-up search volumes or traffic estimates. Keywords come from your own pages.",
        "**AI that sticks to the facts.** AI rewrites only use facts found on your page, and say which model wrote them.",
        "**Your results stay yours.** Scans are saved in your browser, not on our servers. We don't have a database.",
        "**Polite crawling.** About six pages at a time, a clear [user agent](/bot), and robots.txt rules for our bot are obeyed.",
      ],
    },
    {
      id: "how-it-works",
      title: "How it works under the hood",
      paragraphs: [
        "Your browser runs the crawl and calls small, stateless server functions that fetch and analyze each page, so the tool can run free on serverless hosting without a queue or a database. It's built with Next.js and React on Vercel, parses HTML with cheerio, gets speed data from Google PageSpeed Insights and the Chrome UX Report, and uses the free tiers of Groq and Google Gemini for its optional AI rewrites.",
      ],
    },
  ],
  faqs: [
    {
      q: "Is That One Crawler really free?",
      a: "Yes. Every audit and tool is free with no signup. The optional AI rewrites include 20 free actions a day, after which you can add your own free Gemini key.",
    },
    {
      q: "Who is behind That One Crawler?",
      a: `${AUTHOR.name}, an independent developer. It's a personal project, not a company product, and it isn't funded by ads or by selling data.`,
    },
    {
      q: "Is That One Crawler open source?",
      a: "The code is public on GitHub, so you can read exactly how every check and score works.",
    },
    {
      q: "How is it different from other SEO audit tools?",
      a: "It's built for blogs, checks up to 1,000 pages free, and scores AI search and AI agent readiness alongside classic SEO, with a plain-English guide for every issue.",
    },
  ],
};

export const CONTACT: PageCopy = {
  path: "/contact",
  title: "Contact That One Crawler: Bugs, Ideas and Questions",
  description:
    "Contact the maker of That One Crawler: send a message with the form, report a bug or suggest a feature on GitHub, or ask about the crawler visiting your site.",
  eyebrow: "Contact",
  h1: "Get in touch",
  answer:
    "The quickest way to reach That One Crawler is the form on this page: your message goes straight to Suman Debnath, who builds and runs the site. Add your email if you'd like a reply, usually within a few days. Bugs and feature ideas can also go on GitHub.",
  sections: [
    {
      id: "other-ways",
      title: "Other ways to reach us",
      bullets: [
        `**Bugs and feature ideas:** open an issue on [GitHub](${REPO_URL}/issues). Include the address you scanned and what you expected to see.`,
        `**Anything else:** find more ways to reach ${AUTHOR.name} at [${AUTHOR.url.replace(/^https?:\/\//, "")}](${AUTHOR.url}).`,
        "**Our crawler visited your site?** Someone ran a scan of it. The [crawler bot page](/bot) explains what it does and how to block it with robots.txt.",
      ],
    },
    {
      id: "before-you-write",
      title: "Before you write",
      bullets: [
        "**A result looks wrong?** Each finding says what we saw. Rescan once, since sites change, and if it's still wrong, tell us the page and the finding.",
        "**AI tools out of actions?** The free AI allowance resets daily. You can add your own free Gemini key in the AI panel to keep going.",
        "**Want your data deleted?** Scans live only in your browser; clear this site's data to remove them. For anything else, see the [privacy policy](/privacy).",
      ],
    },
  ],
  faqs: [
    {
      q: "How quickly will I get a reply?",
      a: "Usually within a few days. It's a one-person project, so bug reports with the scanned address and the exact finding get fixed fastest.",
    },
    {
      q: "Do I need to give my email address?",
      a: "No. Leave it out and your message still arrives; you just won't get a reply. If you include it, it's used only to answer you.",
    },
    {
      q: "Can I request a feature?",
      a: "Yes, please. Send it with the form or open a GitHub issue. Requests that help bloggers rank or get cited by AI answers go to the top of the list.",
    },
  ],
};

export const CONTACT_TOPICS = ["Bug report", "Feature idea", "Question", "About your crawler visiting my site", "Something else"] as const;

export const PRIVACY_UPDATED = "2026-10-22";

/** analytics: whether Google Analytics is switched on for this deployment. */
export function privacyCopy(analytics: boolean): PageCopy {
  return {
    path: "/privacy",
    title: "Privacy Policy: How That One Crawler Handles Your Data",
    description:
      "How That One Crawler handles your data: scans stay in your browser, no accounts or database, what visit notifications include, and how to opt out in one click.",
    eyebrow: "Privacy",
    h1: "Privacy policy",
    answer:
      "That One Crawler has no accounts and no database: your scans are saved in your own browser. The site owner gets a private notification when someone visits, with the pages viewed and an approximate location, and you can switch that off for your browser in one click. Nothing is sold or used for ads.",
    sections: [
      {
        id: "short-version",
        title: "The short version",
        bullets: [
          "No signup, no accounts and no database. Scan results, history and settings are stored in your browser.",
          "To scan a site, our servers fetch its public pages. We don't keep copies.",
          "When you visit, the site owner gets a private notification about the visit (details below). You can turn it off for your browser at any time.",
          "AI rewrites send the page text to an AI provider to write the suggestion. Speed tests send the address to Google.",
          `We don't sell data, show ads or build profiles. Questions? [Contact us](/contact).`,
        ],
      },
      {
        id: "in-your-browser",
        title: "What stays in your browser",
        paragraphs: [
          "These are saved in your browser's local storage on your device. We can't see them, and clearing this site's data in your browser deletes them:",
        ],
        bullets: [
          "Your scans and their results, so you can reopen and compare them.",
          "Brand rules you set for a site, and your theme (light or dark).",
          "Your own Gemini API key, if you add one. It's sent with each AI request you make and never stored or logged by our server.",
          "A small visit counter (how many times this browser has visited, and when it was last here) used for the visit notifications below.",
        ],
      },
      {
        id: "scanning",
        title: "When you run a scan",
        paragraphs: [
          "Your browser asks our server to fetch the public pages of the site you entered, the way a search engine would, using the [ThatOneCrawler user agent](/bot). The server analyzes each page and sends the results back to your browser. It doesn't store the pages or the results.",
          "Like every website host, Vercel keeps short-lived technical request logs (such as IP address, time and URL) to run and protect the service.",
        ],
      },
      {
        id: "visit-notifications",
        title: "Visit notifications",
        paragraphs: [
          "To see how the site is used and spot problems quickly, the site owner receives a private message in Telegram when someone visits. It's sent from your browser to our server, which adds location details and forwards it. It includes:",
        ],
        bullets: [
          "The pages you open, how long you stay, how far you scroll, and the labels of buttons and links you click (not what you type).",
          "The sites you scan or check with our tools, with the resulting scores, and which AI actions you use.",
          "Your browser, operating system, screen size, language and time zone, and the page that linked you here.",
          "Your IP address and an approximate location (city, region and country) worked out from it by Vercel and, for the network name, by ipwho.is or ipapi.co.",
          "Whether the visit looks like a person or a bot, judged from the signals above.",
        ],
      },
      {
        id: "visit-notifications-limits",
        title: "What visit notifications don't do",
        bullets: [
          "They don't use cookies, and they don't follow you to other websites.",
          "They don't read form fields, passwords or anything you type into the scan box beyond the address you scan.",
          "They aren't stored in a database or shared with anyone. They stay in the owner's private chat.",
          "They respect your choice: use the switch on this page, or open any page with ?notrack=1 added to the address.",
        ],
      },
      ...(analytics
        ? [
            {
              id: "analytics",
              title: "Google Analytics",
              paragraphs: [
                "We use Google Analytics 4 to count visits and see which pages are popular, in aggregate. It sets cookies and sends usage data to Google, which processes it under Google's own privacy policy. Switching off visit notifications below switches off Google Analytics for your browser too.",
              ],
            },
          ]
        : []),
      {
        id: "ai-and-speed",
        title: "AI tools and speed tests",
        bullets: [
          "**AI rewrites** (optional) send the relevant text from the page you're working on to Groq or Google Gemini, which write the suggestion. If you add your own Gemini key, the request goes to Google with your key.",
          "A signed cookie called **toc_ai** counts how many free AI actions your browser used today, so the daily allowance works. It holds a count and a date, nothing else, and expires after two days.",
          "**Speed tests** send the page address to Google PageSpeed Insights and the Chrome UX Report.",
        ],
      },
      {
        id: "contact-form",
        title: "The contact form",
        paragraphs: [
          "Messages you send with the [contact form](/contact) go to the owner's private Telegram chat. Your email address is optional and is used only to reply to you.",
        ],
      },
      {
        id: "providers",
        title: "Services we rely on",
        bullets: [
          "**Vercel** hosts the site and serves every request.",
          "**Telegram** delivers visit notifications and contact messages to the owner.",
          `**Google** runs PageSpeed Insights, the Chrome UX Report and Gemini${analytics ? ", and Google Analytics" : ""}.`,
          "**Groq** runs the default AI model for short rewrites.",
          "**ipwho.is** and **ipapi.co** look up the network name and location for an IP address.",
        ],
      },
      {
        id: "your-choices",
        title: "Your choices",
        bullets: [
          "Switch off visit notifications for this browser with the switch near the top of this page. The choice is saved in your browser, so repeat it on each browser or device.",
          "Delete your saved scans and settings by clearing this site's data in your browser settings.",
          "Ask about, or ask us to delete, anything we might have about your visit by [contacting us](/contact).",
          "Don't want a site scanned? Site owners can block our crawler in robots.txt; see the [crawler bot page](/bot).",
        ],
      },
      {
        id: "changes",
        title: "Children and changes",
        paragraphs: [
          "That One Crawler is a tool for website owners and isn't directed at children under 13.",
          "If this policy changes, the date at the top changes with it. Material changes will be described here.",
        ],
      },
    ],
    faqs: [
      {
        q: "Does That One Crawler store my scans?",
        a: "No. Scans are saved only in your browser's local storage. Our server fetches and analyzes the pages, sends the results to your browser and keeps nothing.",
      },
      {
        q: "Does That One Crawler use cookies?",
        a: analytics
          ? "One functional cookie (toc_ai) counts free AI actions. Google Analytics also sets cookies unless you switch off tracking on this page."
          : "Just one functional cookie, toc_ai, which counts how many free AI actions your browser used today. There are no advertising or tracking cookies.",
      },
      {
        q: "How do I stop my visits being logged?",
        a: "Use the switch on this page, or open any page with ?notrack=1 added to the address. It's remembered in your browser until you clear its data or visit with ?notrack=0.",
      },
    ],
  };
}

export const BOT_PAGE = {
  path: "/bot",
  title: "ThatOneCrawler Bot: What It Is and How to Control It",
  description:
    "ThatOneCrawler visits pages only when someone runs an SEO scan. Learn how it behaves, how gently it crawls, and how to block it with robots.txt.",
  answer:
    "ThatOneCrawler is the user agent That One Crawler uses to read public pages when someone runs an SEO audit. It only visits when a person starts a scan, fetches a few pages at a time, never logs in or submits forms, and obeys robots.txt rules written for it.",
  behavior: [
    "Visits only when someone runs a scan; there's no background crawling or indexing.",
    "Fetches about six pages at a time and stops at the page limit the person chose (1,000 at most).",
    "Reads your robots.txt and sitemap first, and only follows links within your site.",
    "Checks outgoing links and images with lightweight HEAD requests, and only retries with a tiny GET when a server refuses HEAD.",
    "Never submits forms, logs in, or fetches private or internal network addresses.",
    "Results are stored in the scanning person's browser, not on our servers.",
  ],
  faqs: [
    {
      q: "Why did ThatOneCrawler visit my site?",
      a: "Someone entered your site's address into That One Crawler to run an SEO audit. The bot never crawls on its own schedule; every visit is triggered by a person's scan.",
    },
    {
      q: "How do I block ThatOneCrawler?",
      a: "Add a group for it to your robots.txt, for example “User-agent: ThatOneCrawler” followed by “Disallow: /”. We obey rules written for our user agent, and skip the URLs they disallow.",
    },
    {
      q: "Does it obey general robots.txt rules?",
      a: "Rules for all bots (User-agent: *) are reported as findings in the audit, because site owners usually want to know which pages search engines can't reach. Rules naming ThatOneCrawler are always obeyed.",
    },
  ] satisfies Faq[],
};
