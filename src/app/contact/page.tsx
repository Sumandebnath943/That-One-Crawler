import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/content/ContactForm";
import { ContentShell, CopySection, FaqSection, JsonLd, PageIntro } from "@/components/content/ContentKit";
import { markdownUrl } from "@/lib/content/negotiate";
import { CONTACT } from "@/lib/content/pages";
import { breadcrumbs, faqPage, graph, webPage } from "@/lib/content/structured-data";
import { AUTHOR, REPO_URL, SITE_URL } from "@/lib/site";

const PAGE = CONTACT;

export const metadata: Metadata = {
  title: { absolute: PAGE.title },
  description: PAGE.description,
  alternates: { canonical: PAGE.path, types: { "text/markdown": markdownUrl(PAGE.path) } },
  openGraph: { title: PAGE.title, description: PAGE.description, url: PAGE.path, type: "website" },
};

const CHANNELS = [
  { icon: "🐛", title: "Bugs & feature ideas", body: "Open an issue on GitHub. Include the address you scanned.", href: `${REPO_URL}/issues`, label: "GitHub issues ↗" },
  { icon: "👋", title: "The maker", body: `More ways to reach ${AUTHOR.name}.`, href: AUTHOR.url, label: "Personal site ↗" },
  { icon: "🕷", title: "Our bot visited you?", body: "What it does, and how to block it in robots.txt.", href: "/bot", label: "Meet the bot →" },
];

export default function ContactPage() {
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Contact", path: PAGE.path },
  ];
  return (
    <ContentShell>
      <JsonLd
        data={graph(
          webPage("ContactPage", {
            name: PAGE.title,
            description: PAGE.description,
            path: PAGE.path,
            extra: { mainEntity: { "@id": `${SITE_URL}/#author` } },
          }),
          faqPage(PAGE.faqs, PAGE.path),
          breadcrumbs(crumbs),
        )}
      />
      <PageIntro eyebrow={PAGE.eyebrow} title={PAGE.h1} answer={PAGE.answer} crumbs={crumbs} mood="happy" />

      <div className="shell grid gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14 lg:py-16">
        <section aria-labelledby="form-heading" className="min-w-0">
          <h2 id="form-heading" className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            Send a message
          </h2>
          <p className="mt-2 mb-5 text-ink-2">Bug, idea, question or compliment. All of them get read.</p>
          <ContactForm />
        </section>

        <aside aria-label="Other ways to reach us">
          <ul className="space-y-3">
            {CHANNELS.map((c) => {
              const external = c.href.startsWith("http");
              const className = "group block rounded-2xl border-2 border-ink bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-brutal-sm";
              const inner = (
                <>
                  <span aria-hidden className="grid size-10 place-items-center rounded-xl border-2 border-ink bg-lime text-lg">
                    {c.icon}
                  </span>
                  <span className="mt-3 block font-display text-lg font-extrabold text-ink">{c.title}</span>
                  <span className="mt-1 block text-sm text-ink-2">{c.body}</span>
                  <span className="mt-2 block text-sm font-bold text-ink underline decoration-line underline-offset-4 group-hover:decoration-ink">{c.label}</span>
                </>
              );
              return (
                <li key={c.title}>
                  {external ? (
                    <a href={c.href} className={className}>
                      {inner}
                    </a>
                  ) : (
                    <Link href={c.href} className={className}>
                      {inner}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </aside>
      </div>

      <div className="shell pb-16">
        <div className="max-w-3xl space-y-14">
          {PAGE.sections.map((s) => (
            <CopySection key={s.id} section={s} />
          ))}
          <FaqSection faqs={PAGE.faqs} />
        </div>
      </div>
    </ContentShell>
  );
}
