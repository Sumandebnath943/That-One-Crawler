import type { Metadata } from "next";
import Link from "next/link";
import { ArticleLayout, ContentShell, CopySection, FaqSection, JsonLd, PageIntro, Rich, ScanCta, SideCta } from "@/components/content/ContentKit";
import { Mascot } from "@/components/Mascot";
import { markdownUrl } from "@/lib/content/negotiate";
import { ABOUT, STATS } from "@/lib/content/pages";
import { breadcrumbs, faqPage, graph, webPage } from "@/lib/content/structured-data";
import { AUTHOR, REPO_URL, SITE_URL } from "@/lib/site";

const PAGE = ABOUT;

export const metadata: Metadata = {
  title: { absolute: PAGE.title },
  description: PAGE.description,
  alternates: { canonical: PAGE.path, types: { "text/markdown": markdownUrl(PAGE.path) } },
  openGraph: { title: PAGE.title, description: PAGE.description, url: PAGE.path, type: "website" },
};

const section = (id: string) => PAGE.sections.find((s) => s.id === id)!;

const PROFILES = [
  { label: "Website", href: AUTHOR.url },
  { label: "GitHub", href: AUTHOR.sameAs.find((u) => u.includes("github.com"))! },
  { label: "LinkedIn", href: AUTHOR.sameAs.find((u) => u.includes("linkedin.com"))! },
  { label: "X", href: AUTHOR.sameAs.find((u) => u.includes("x.com"))! },
];

const TIMELINE = [
  { when: "Before", name: "Crawl Daddy", body: "Python, Flask and a headless browser on Replit. Worked well; had to be republished every 30 days to stay alive." },
  { when: "October 2026", name: "That One Crawler", body: "Rebuilt from scratch on Next.js and Vercel. Always online, free to run, and checks AI search and AI agents too." },
];

const PRINCIPLE_ICONS = ["🔍", "🚫", "✦", "🔒", "🐢"];

export default function AboutPage() {
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "About", path: PAGE.path },
  ];
  const principles = section("principles");
  return (
    <ContentShell>
      <JsonLd
        data={graph(
          webPage("AboutPage", { name: PAGE.title, description: PAGE.description, path: PAGE.path, extra: { mainEntity: { "@id": `${SITE_URL}/#author` } } }),
          faqPage(PAGE.faqs, PAGE.path),
          breadcrumbs(crumbs),
        )}
      />
      <PageIntro eyebrow={PAGE.eyebrow} title={PAGE.h1} answer={PAGE.answer} crumbs={crumbs} mood="happy" />

      {/* The numbers, as a strip between the intro and the story. */}
      <section aria-label="That One Crawler in numbers" className="border-b-2 border-ink bg-card">
        <dl className="shell grid grid-cols-2 gap-px py-8 sm:grid-cols-3 lg:grid-cols-6">
          {STATS.map((stat) => (
            <div key={stat.label} className="flex flex-col-reverse justify-end rounded-2xl px-4 py-3">
              <dt className="text-sm text-ink-2">{stat.label}</dt>
              <dd className="font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
                <span className="highlight">{stat.value}</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <ArticleLayout
        toc={[...PAGE.sections.map((s) => ({ id: s.id, label: s.title })), { id: "faq", label: "FAQ" }]}
        aside={<SideCta title="See it in action" body="Audit any blog in a couple of minutes. Free, no signup." href="/" label="Scan a blog →" />}
      >
        <CopySection section={section("what-it-does")} />

        <CopySection section={section("who-makes-it")}>
          <div className="flex flex-col gap-5 rounded-2xl border-2 border-ink bg-card p-5 shadow-brutal sm:flex-row sm:items-center">
            <span
              aria-hidden
              className="grid size-20 shrink-0 place-items-center rounded-2xl border-2 border-ink bg-lime font-display text-3xl font-extrabold text-lime-ink shadow-brutal-sm"
            >
              {AUTHOR.name
                .split(" ")
                .map((p) => p[0])
                .join("")}
            </span>
            <div className="min-w-0">
              <p className="font-display text-2xl font-extrabold text-ink">{AUTHOR.name}</p>
              <p className="text-ink-2">{AUTHOR.jobTitle} · maker of That One Crawler</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {PROFILES.map((p) => (
                  <li key={p.label}>
                    <a
                      href={p.href}
                      rel="me author"
                      className="inline-flex rounded-full border-2 border-ink bg-paper px-3 py-1 text-sm font-bold text-ink transition hover:-translate-y-0.5 hover:shadow-brutal-sm"
                    >
                      {p.label} ↗
                    </a>
                  </li>
                ))}
                <li>
                  <a
                    href={REPO_URL}
                    className="inline-flex rounded-full border-2 border-ink bg-lime px-3 py-1 text-sm font-bold text-lime-ink transition hover:-translate-y-0.5 hover:shadow-brutal-sm"
                  >
                    Source code ↗
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </CopySection>

        <CopySection section={section("why-it-exists")}>
          <ol className="relative grid gap-4 sm:grid-cols-2">
            {TIMELINE.map((step, i) => (
              <li key={step.name} className={`relative rounded-2xl border-2 border-ink p-5 ${i ? "bg-lime text-lime-ink shadow-brutal" : "bg-sunk text-ink"}`}>
                <p className="text-xs font-bold tracking-wider uppercase opacity-70">{step.when}</p>
                <p className="mt-1 font-display text-xl font-extrabold">{step.name}</p>
                <p className="mt-2 text-sm leading-relaxed opacity-90">{step.body}</p>
                {i === 0 && (
                  <span aria-hidden className="absolute top-1/2 -right-4 z-10 hidden -translate-y-1/2 font-display text-2xl font-extrabold text-ink sm:block">
                    →
                  </span>
                )}
              </li>
            ))}
          </ol>
        </CopySection>

        <section id={principles.id} className="scroll-mt-24">
          <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            <a href={`#${principles.id}`} className="decoration-line underline-offset-4 hover:underline">
              {principles.title}
            </a>
          </h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {principles.bullets!.map((b, i) => (
              <li key={b} className={`flex gap-3 rounded-2xl border-2 border-ink bg-card p-4 text-base text-ink-2 ${i === principles.bullets!.length - 1 ? "sm:col-span-2" : ""}`}>
                <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-xl border-2 border-ink bg-paper text-lg">
                  {PRINCIPLE_ICONS[i]}
                </span>
                <span className="min-w-0">
                  <Rich text={b} />
                </span>
              </li>
            ))}
          </ul>
        </section>

        <CopySection section={section("how-it-works")}>
          <div className="flex items-center gap-4 rounded-2xl border-2 border-dashed border-line p-4">
            <Mascot mood="cool" follow={false} className="size-14 shrink-0" />
            <p className="text-base text-ink-2">
              Curious what the crawler does on other people&apos;s sites? <Link href="/bot" className="font-semibold text-ink underline underline-offset-4">Meet the bot</Link>, or read{" "}
              <Link href="/privacy" className="font-semibold text-ink underline underline-offset-4">
                how we handle your data
              </Link>
              .
            </p>
          </div>
        </CopySection>

        <ScanCta title="Now point it at your own blog" />
        <FaqSection faqs={PAGE.faqs} />
      </ArticleLayout>
    </ContentShell>
  );
}
