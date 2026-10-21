import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Breadcrumbs,
  ContentShell,
  FaqSection,
  JsonLd,
  PageIntro,
  RelatedGuides,
  ScanCta,
  Section,
  Steps,
} from "@/components/content/ContentKit";
import { GUIDES, guideFor } from "@/lib/content/guides";
import { article, breadcrumbs, faqPage, graph } from "@/lib/content/structured-data";
import { ISSUES, SEVERITY_ORDER } from "@/lib/seo/issues";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const guide = guideFor((await params).slug);
  if (!guide) return {};
  const path = `/checks/${guide.slug}`;
  return {
    title: { absolute: guide.metaTitle },
    description: guide.metaDescription,
    alternates: { canonical: path },
    openGraph: { title: guide.metaTitle, description: guide.metaDescription, url: path, type: "article" },
  };
}

const SEVERITY_WORD = { critical: "Critical", warning: "Warning", notice: "Notice" } as const;

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const guide = guideFor((await params).slug);
  if (!guide) notFound();
  const path = `/checks/${guide.slug}`;
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Checks explained", path: "/checks" },
    { name: guide.metaTitle.split(":")[0], path },
  ];
  const checks = [...guide.codes].sort((a, b) => SEVERITY_ORDER[ISSUES[a].severity] - SEVERITY_ORDER[ISSUES[b].severity]);

  return (
    <ContentShell>
      <JsonLd
        data={graph(
          article({ headline: guide.title, description: guide.metaDescription, path, about: guide.keyword }),
          faqPage(guide.faqs, path),
          breadcrumbs(crumbs),
        )}
      />
      <PageIntro eyebrow={`${guide.category} check`} title={guide.title} answer={guide.answer}>
        <div className="mt-6">
          <Breadcrumbs items={crumbs} />
        </div>
      </PageIntro>
      <article className="mx-auto max-w-3xl space-y-12 px-4 py-14 sm:px-6">
        <Section title="Why it matters">
          <p>{guide.why}</p>
        </Section>

        <Section title="How to fix it">
          <Steps steps={guide.steps} />
        </Section>

        <Section title="How That One Crawler checks it">
          <ul className="space-y-3">
            {checks.map((code) => (
              <li key={code} className="rounded-xl border-2 border-line bg-card p-4">
                <p className="font-display text-lg font-bold text-ink">
                  {ISSUES[code].label}{" "}
                  <span className="ml-1 rounded-full bg-sunk px-2 py-0.5 align-middle font-sans text-xs font-semibold text-ink-2">
                    {SEVERITY_WORD[ISSUES[code].severity]}
                  </span>
                </p>
                <p className="mt-1 text-base">{ISSUES[code].why}</p>
              </li>
            ))}
          </ul>
        </Section>

        <FaqSection faqs={guide.faqs} />
        <ScanCta title={`Find every page with this problem`} />
        <RelatedGuides slugs={guide.related} />
      </article>
    </ContentShell>
  );
}
