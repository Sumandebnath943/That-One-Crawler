import Link from "next/link";
import { Mascot } from "@/components/Mascot";
import { ScanForm } from "@/components/ScanForm";
import { FAQ_HOME as LANDING_FAQ, HERO, JUDGED, STEPS } from "@/lib/content/home";
import { MODE_LABEL, TOOLS } from "@/lib/content/tools";
import { HeroMascot } from "./HeroMascot";

export { LANDING_FAQ };

const FINDINGS: { tone: "crit" | "warn" | "note"; path: string; text: string }[] = [
  { tone: "crit", path: "/hello-world", text: "Missing H1" },
  { tone: "warn", path: "/about", text: "Title too long (94 chars)" },
  { tone: "warn", path: "/quick-update", text: "41 words. Forty-one." },
  { tone: "warn", path: "12 pages", text: 'All titled "Untitled"' },
  { tone: "crit", path: "/2020-goals", text: "404, much like the goals" },
  { tone: "warn", path: "/gallery", text: "212 images, 0 alt tags" },
  { tone: "crit", path: "/best-post-ever", text: "noindex. Nobody will ever know." },
  { tone: "warn", path: "/sourdough-1 + /sourdough-2", text: "Fighting over the same keyword" },
  { tone: "note", path: "/old-url", text: "4 redirects deep" },
  { tone: "note", path: "/2019-guide", text: "Last updated when phones had buttons" },
  { tone: "warn", path: "/recipes", text: 'Meta description is literally "meta description"' },
  { tone: "note", path: "/contact", text: "No Open Graph tags. Shares look like ransom notes." },
];

const TONE_DOT = { crit: "bg-crit", warn: "bg-warn", note: "bg-note" };

const REVIEWS = [
  { quote: "It found 212 images without alt text. I didn't know I had 212 images.", by: "A food blog, probably" },
  { quote: "Rude. Accurate. Five stars.", by: "A WordPress site with three plugins too many" },
  { quote: "I was noindexed for two years and nobody told me.", by: "/best-post-ever" },
  { quote: "Finally, someone who reads past the first paragraph.", by: "A 4,000-word listicle" },
];

export function Hero() {
  return (
    <section className="dots relative overflow-hidden border-b-2 border-ink">
      <div className="shell grid items-center gap-10 py-14 md:grid-cols-[1.25fr_0.75fr] md:py-20">
        <div>
          <p className="mb-5 inline-block -rotate-1 rounded-full border-2 border-ink bg-lime px-3 py-1 text-sm font-bold text-lime-ink shadow-brutal-sm">
            Crawl Daddy, reprised ✦ now with fewer excuses
          </p>
          <h1 className="font-display text-5xl leading-[0.95] font-extrabold tracking-tight text-balance sm:text-6xl lg:text-7xl">
            Your blog has issues. <span className="highlight">This free SEO audit finds every single one.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-ink-2 sm:text-xl">{HERO.intro}</p>
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

/** Plain answers to "what is this?", written for people and for answer engines alike. */
export function WhatIsIt() {
  return (
    <section className="shell pt-16 sm:pt-20" aria-labelledby="what-heading">
      <div className="grid gap-10 md:grid-cols-2">
        <div>
          <h2 id="what-heading" className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            What is a blog SEO audit?
          </h2>
          <p className="mt-4 text-lg text-ink-2">
            A blog SEO audit checks every page of your blog for the problems that stop posts from ranking: missing or
            duplicate titles, thin content, broken links, pages search engines can&apos;t index, and slow, heavy pages.
            That One Crawler runs the whole audit for free in a couple of minutes and ranks the fixes by impact.
          </p>
          <p className="mt-4 text-ink-2">
            Most free tools stop at one page or a hundred URLs. We read your sitemap and check up to 1,000 pages, then
            give each one an SEO score out of 100 with a plain-English explanation of every issue. Not sure where to
            start? Follow the{" "}
            <Link href="/blog-seo-checklist" className="font-semibold text-ink underline underline-offset-2">
              blog SEO checklist
            </Link>
            .
          </p>
        </div>
        <div>
          <h2 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">SEO, GEO and AEO in one scan</h2>
          <p className="mt-4 text-lg text-ink-2">
            Search is no longer just ten blue links. Google AI Overviews, ChatGPT and Perplexity answer questions
            directly and quote the pages that answer best. We score every page for AI search readiness (GEO and AEO)
            alongside classic SEO, so you can rank and get cited.
          </p>
          <ul className="mt-5 space-y-2 text-ink-2">
            <li>
              <b className="text-ink">For search engines:</b> titles, headings, canonicals, indexing, links and structured data.
            </li>
            <li>
              <b className="text-ink">For AI answer engines:</b> direct answers, question headings, specific facts and FAQs.
            </li>
            <li>
              <b className="text-ink">For readers:</b> readability, freshness, broken links and page speed.
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

export function Judged() {
  return (
    <section id="judged" className="shell scroll-mt-20 py-16 sm:py-20">
      <div className="mb-10 max-w-2xl">
        <h2 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Things we will absolutely judge</h2>
        <p className="mt-3 text-lg text-ink-2">
          Over 50 checks on every page, plus 24 on whether AI agents can use your site, each ranked from &quot;fix this
          today&quot; to &quot;whenever you get a sec&quot;, with a guide explaining how to fix it.{" "}
          <Link href="/checks" className="font-semibold text-ink underline underline-offset-2">
            See every check explained
          </Link>
          .
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {JUDGED.map((item, i) => (
          <li key={item.title} className={i % 2 ? "lg:translate-y-4" : ""}>
            <Link
              href={item.href}
              className="block h-full rounded-2xl border-2 border-ink bg-card p-5 shadow-brutal transition hover:-translate-y-1"
            >
              <span className="inline-block rounded-md border-2 border-ink bg-lime px-2 py-0.5 font-mono text-sm font-bold text-lime-ink">
                {item.tag}
              </span>
              <h3 className="mt-4 font-display text-xl font-extrabold">{item.title}</h3>
              <p className="mt-2 text-ink-2">{item.body}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function FreeTools() {
  return (
    <section id="tools" className="scroll-mt-20 border-y-2 border-ink bg-card">
      <div className="shell py-16 sm:py-20">
        <h2 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Six free tools, one job each</h2>
        <p className="mt-3 max-w-2xl text-lg text-ink-2">
          Need one answer fast? Each tool does a single job well. Some check one page in seconds, one checks whether AI
          agents can get into your whole site, and two crawl it for one kind of problem. Want everything at once? Run
          the full audit up top.
        </p>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool) => (
            <li key={tool.slug}>
              <Link
                href={`/${tool.slug}`}
                className="group flex h-full flex-col rounded-2xl border-2 border-ink bg-paper p-5 shadow-brutal transition hover:-translate-y-1"
              >
                <span className="self-start rounded-full border-2 border-ink bg-card px-2.5 py-0.5 text-xs font-bold">{MODE_LABEL[tool.mode]}</span>
                <h3 className="mt-3 font-display text-2xl font-extrabold">{tool.eyebrow}</h3>
                <p className="mt-2 flex-1 text-ink-2">{tool.summary}</p>
                <span className="mt-4 font-semibold underline underline-offset-4">
                  {tool.action} <span className="inline-block transition group-hover:translate-x-0.5">→</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section className="shell py-16 sm:py-20">
      <h2 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">How the free SEO audit works</h2>
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
    </section>
  );
}

export function Reviews() {
  return (
    <section className="border-t-2 border-ink bg-card" aria-labelledby="reviews-heading">
      <div className="shell py-16 sm:py-20">
        <h2 id="reviews-heading" className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
          Reviews from the crawled
        </h2>
        <p className="mt-3 text-ink-2">Unverified. Unpaid. Mostly fictional. Emotionally true.</p>
        <ul className="mt-10 grid gap-5 md:grid-cols-2">
          {REVIEWS.map((review, i) => (
            <li
              key={review.by}
              className={`rounded-2xl border-2 border-ink bg-paper p-6 shadow-brutal ${i % 2 ? "md:rotate-1" : "md:-rotate-1"}`}
            >
              <p className="text-amber-500" aria-label="Five stars">
                ★★★★★
              </p>
              <blockquote className="mt-2 font-display text-2xl leading-snug font-bold">“{review.quote}”</blockquote>
              <p className="mt-3 font-mono text-sm text-ink-3">— {review.by}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 border-t-2 border-ink">
      <div className="shell grid gap-10 py-16 sm:py-20 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:gap-14">
        <div>
          <h2 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Questions, nervously asked</h2>
          <p className="mt-4 text-lg text-ink-2">
            Everything people ask before letting a spider loose on their blog. Still curious?{" "}
            <Link href="/bot" className="font-semibold text-ink underline underline-offset-2">
              Meet the bot
            </Link>
            .
          </p>
          <div className="mt-8 hidden md:block">
            <Mascot pokeable mood="happy" className="size-28" />
          </div>
        </div>
        <div className="divide-y-2 divide-ink self-start rounded-2xl border-2 border-ink bg-card shadow-brutal">
          {LANDING_FAQ.map((item) => (
            <details key={item.q} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <h3 className="font-display text-lg font-bold">{item.q}</h3>
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
