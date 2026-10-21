import { Mascot } from "@/components/Mascot";
import { ScanForm } from "@/components/ScanForm";
import { HeroMascot } from "./HeroMascot";

const FINDINGS: { tone: "crit" | "warn" | "note"; path: string; text: string }[] = [
  { tone: "crit", path: "/hello-world", text: "Missing H1" },
  { tone: "warn", path: "/about", text: "Title too long (94 chars)" },
  { tone: "warn", path: "/quick-update", text: "41 words. Forty-one." },
  { tone: "warn", path: "12 pages", text: 'All titled "Untitled"' },
  { tone: "crit", path: "/2020-goals", text: "404, much like the goals" },
  { tone: "warn", path: "/gallery", text: "212 images, 0 alt tags" },
  { tone: "crit", path: "/best-post-ever", text: "noindex. Nobody will ever know." },
  { tone: "note", path: "/old-url", text: "4 redirects deep" },
  { tone: "warn", path: "/recipes", text: 'Meta description is literally "meta description"' },
  { tone: "note", path: "/contact", text: "No Open Graph tags. Shares look like ransom notes." },
];

const TONE_DOT = { crit: "bg-crit", warn: "bg-warn", note: "bg-note" };

const JUDGED = [
  {
    tag: "<title>",
    title: "Titles & meta descriptions",
    body: "Too long, too short, missing, or copy-pasted across 47 posts. We count the characters so you don't have to.",
  },
  {
    tag: "<h1>",
    title: "Headings",
    body: "A page without an H1 is just a vibe. We will find every single vibe.",
  },
  {
    tag: "<300w",
    title: "Thin content",
    body: "Under 300 words isn't a blog post. It's a tweet with ambitions.",
  },
  {
    tag: "×12",
    title: "Duplicates",
    body: "Twelve pages with the same title? Google can't tell your children apart either.",
  },
  {
    tag: "404",
    title: "Broken pages & redirects",
    body: "Dead links, redirect chains and URLs that wander off to other websites. The haunted wing of your blog.",
  },
  {
    tag: "noindex",
    title: "Indexability",
    body: "noindex tags and robots.txt rules quietly hiding your best work from search engines. Rude.",
  },
  {
    tag: "og:",
    title: "Social & structured data",
    body: "Open Graph, Twitter cards and JSON-LD: the stuff that makes your shared links look like they have their life together.",
  },
  {
    tag: "✦ AI",
    title: "Speed & a second opinion",
    body: "PageSpeed scores if you want the numbers, plus one-click AI rewrites for titles and meta descriptions.",
  },
];

const STEPS = [
  { title: "Paste a URL", body: "Any blog. Yours, ideally. Snooping on competitors is also allowed." },
  {
    title: "We read everything",
    body: "Sitemap first. No sitemap? We follow links like a nosy neighbor, a few pages at a time so your server barely notices.",
  },
  {
    title: "You get the verdict",
    body: "A score, a prioritized to-do list and a mild existential crisis. Export to CSV for crying in a spreadsheet.",
  },
];

const REVIEWS = [
  { quote: "It found 212 images without alt text. I didn't know I had 212 images.", by: "A food blog, probably" },
  { quote: "Rude. Accurate. Five stars.", by: "A WordPress site with three plugins too many" },
  { quote: "I was noindexed for two years and nobody told me.", by: "/best-post-ever" },
  { quote: "Finally, someone who reads past the first paragraph.", by: "A 4,000-word listicle" },
];

const FAQ = [
  {
    q: "Will this break my site?",
    a: "No. We crawl politely, a few pages at a time, and only read public pages. Your server will barely notice. Your ego might.",
  },
  {
    q: "Is it really free?",
    a: 'Yes. It runs on a hobby plan and pure spite. No signup, no email, no "book a demo".',
  },
  {
    q: "Where do my results go?",
    a: "Into your own browser. Scans are saved on your device, not on our servers. We don't have a database. We barely have a server.",
  },
  {
    q: "How many pages can it check?",
    a: "Up to 1,000 per scan (300 by default). We read your sitemap first and check posts before tag and category archives.",
  },
  {
    q: "My site is built with JavaScript and the results look empty.",
    a: "We read the HTML your server sends, the way most crawlers do on their first pass. If the content only shows up after JavaScript runs, we flag it, because search engines may struggle with it too.",
  },
  {
    q: "What happened to Crawl Daddy?",
    a: "He retired. This is his more responsible younger sibling: same instincts, faster legs, and no longer needs to be republished every 30 days to stay alive.",
  },
];

export function Hero() {
  return (
    <section className="dots relative overflow-hidden border-b-2 border-ink">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.25fr_0.75fr] md:py-20">
        <div>
          <p className="mb-5 inline-block -rotate-1 rounded-full border-2 border-ink bg-lime px-3 py-1 text-sm font-bold text-lime-ink shadow-brutal-sm">
            Crawl Daddy, reprised ✦ now with fewer excuses
          </p>
          <h1 className="font-display text-5xl leading-[0.95] font-extrabold tracking-tight text-balance sm:text-6xl lg:text-7xl">
            Your blog has issues. <span className="highlight">We&apos;ll find every single one.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-ink-2 sm:text-xl">
            That One Crawler reads every page on your site and reports back like that one brutally honest friend:
            missing H1s, thin content, duplicate titles, broken pages, and that 2019 post with no meta description.
          </p>
          <div className="mt-8 max-w-2xl">
            <ScanForm />
          </div>
        </div>

        <HeroMascot />
      </div>
    </section>
  );
}

export function FindingsMarquee() {
  const items = [...FINDINGS, ...FINDINGS];
  return (
    <section aria-label="Example findings" className="border-b-2 border-ink bg-ink text-paper">
      <div className="marquee overflow-hidden py-3">
        <ul className="marquee-track flex w-max gap-8 font-mono text-sm whitespace-nowrap">
          {items.map((f, i) => (
            <li key={i} className="flex items-center gap-2" aria-hidden={i >= FINDINGS.length}>
              <span className={`size-2 rounded-full ${TONE_DOT[f.tone]}`} />
              <span className="font-bold text-lime">{f.path}</span>
              <span className="opacity-85">{f.text}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="sr-only">Example findings from a typical blog, for illustration.</p>
    </section>
  );
}

export function Judged() {
  return (
    <section id="judged" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20">
      <div className="mb-10 max-w-2xl">
        <h2 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
          Things we will absolutely judge
        </h2>
        <p className="mt-3 text-lg text-ink-2">
          Every page gets a score out of 100 and a list of what&apos;s wrong, ranked from &quot;fix this today&quot; to
          &quot;whenever you get a sec&quot;.
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {JUDGED.map((item, i) => (
          <li
            key={item.title}
            className={`rounded-2xl border-2 border-ink bg-card p-5 shadow-brutal transition hover:-translate-y-1 ${i % 2 ? "lg:translate-y-4 lg:hover:translate-y-3" : ""}`}
          >
            <span className="inline-block rounded-md border-2 border-ink bg-lime px-2 py-0.5 font-mono text-sm font-bold text-lime-ink">
              {item.tag}
            </span>
            <h3 className="mt-4 font-display text-xl font-extrabold">{item.title}</h3>
            <p className="mt-2 text-ink-2">{item.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section className="border-y-2 border-ink bg-card">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <h2 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">How it works</h2>
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative rounded-2xl border-2 border-dashed border-ink-3 p-6">
              <span className="absolute -top-5 left-5 grid size-10 place-items-center rounded-full border-2 border-ink bg-lime font-display text-lg font-extrabold text-lime-ink">
                {i + 1}
              </span>
              <h3 className="mt-2 font-display text-2xl font-extrabold">{step.title}</h3>
              <p className="mt-2 text-ink-2">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Reviews() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20" aria-labelledby="reviews-heading">
      <h2 id="reviews-heading" className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
        Reviews from the crawled
      </h2>
      <p className="mt-3 text-ink-2">Unverified. Unpaid. Mostly fictional. Emotionally true.</p>
      <ul className="mt-10 grid gap-5 md:grid-cols-2">
        {REVIEWS.map((review, i) => (
          <li
            key={review.by}
            className={`rounded-2xl border-2 border-ink bg-card p-6 shadow-brutal ${i % 2 ? "md:rotate-1" : "md:-rotate-1"}`}
          >
            <p className="text-amber-500" aria-label="Five stars">
              ★★★★★
            </p>
            <blockquote className="mt-2 font-display text-2xl leading-snug font-bold">“{review.quote}”</blockquote>
            <p className="mt-3 font-mono text-sm text-ink-3">— {review.by}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 border-t-2 border-ink bg-card">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
        <h2 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Questions, nervously asked</h2>
        <div className="mt-8 divide-y-2 divide-ink rounded-2xl border-2 border-ink bg-paper shadow-brutal">
          {FAQ.map((item) => (
            <details key={item.q} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-bold">
                {item.q}
                <span className="grid size-7 shrink-0 place-items-center rounded-full border-2 border-ink text-sm transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-ink-2">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="theme-light border-t-2 border-ink bg-lime text-lime-ink">
      <div className="mx-auto flex max-w-4xl flex-col items-center px-4 py-16 text-center sm:px-6">
        <Mascot pokeable className="size-24 -rotate-6" />
        <h2 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">
          Still scrolling? Your blog isn&apos;t going to judge itself.
        </h2>
        <div className="mt-8 w-full max-w-2xl text-left text-ink">
          <ScanForm compact />
        </div>
      </div>
    </section>
  );
}
