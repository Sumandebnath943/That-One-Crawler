import type { Metadata } from "next";
import { ArticleLayout, ContentShell, CopySection, FaqSection, JsonLd, PageIntro, Rich } from "@/components/content/ContentKit";
import { TrackingOptOut } from "@/components/content/TrackingOptOut";
import { markdownUrl } from "@/lib/content/negotiate";
import { privacyCopy, PRIVACY_UPDATED } from "@/lib/content/pages";
import { breadcrumbs, faqPage, graph, webPage } from "@/lib/content/structured-data";
import { GA_ID } from "@/lib/site";

// Google Analytics is only described when this deployment actually runs it.
const PAGE = privacyCopy(Boolean(GA_ID));

export const metadata: Metadata = {
  title: { absolute: PAGE.title },
  description: PAGE.description,
  alternates: { canonical: PAGE.path, types: { "text/markdown": markdownUrl(PAGE.path) } },
  openGraph: { title: PAGE.title, description: PAGE.description, url: PAGE.path, type: "website" },
};

const effective = new Date(`${PRIVACY_UPDATED}T00:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

export default function PrivacyPage() {
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Privacy", path: PAGE.path },
  ];
  const [summary, ...rest] = PAGE.sections;
  return (
    <ContentShell>
      <JsonLd
        data={graph(
          webPage("WebPage", { name: PAGE.title, description: PAGE.description, path: PAGE.path, extra: { datePublished: PRIVACY_UPDATED } }),
          faqPage(PAGE.faqs, PAGE.path),
          breadcrumbs(crumbs),
        )}
      />
      <PageIntro eyebrow={PAGE.eyebrow} title={PAGE.h1} answer={PAGE.answer} crumbs={crumbs} mood="cool">
        <p className="mt-4 inline-flex rounded-full border-2 border-ink bg-card px-3 py-1 text-sm font-semibold">
          Effective <time dateTime={PRIVACY_UPDATED} className="ml-1">{effective}</time>
        </p>
      </PageIntro>

      <ArticleLayout toc={[...PAGE.sections.map((s) => ({ id: s.id, label: s.title })), { id: "faq", label: "FAQ" }]}>
        <section id={summary.id} className="scroll-mt-24 rounded-2xl border-2 border-ink bg-card p-5 shadow-brutal sm:p-6">
          <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            <a href={`#${summary.id}`} className="decoration-line underline-offset-4 hover:underline">
              {summary.title}
            </a>
          </h2>
          <ul className="mt-4 space-y-3 text-[1.0625rem] leading-relaxed text-ink-2">
            {summary.bullets!.map((b, i) => (
              <li key={b} className="flex gap-3">
                <span aria-hidden className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-2 border-ink bg-lime font-mono text-xs font-bold text-lime-ink">
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <Rich text={b} />
                </span>
              </li>
            ))}
          </ul>
        </section>

        <TrackingOptOut />

        {rest.map((s) => (
          <CopySection key={s.id} section={s} />
        ))}
        <FaqSection faqs={PAGE.faqs} />
      </ArticleLayout>
    </ContentShell>
  );
}
