import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ArticleLayout,
  ContentShell,
  FaqSection,
  JsonLd,
  PageIntro,
  PrevNext,
  readingTime,
  RelatedGuides,
  ScanCta,
  Section,
  SideCta,
  Steps,
} from "@/components/content/ContentKit";
import { GUIDES, guideFor, type Guide } from "@/lib/content/guides";
import { article, breadcrumbs, faqPage, graph } from "@/lib/content/structured-data";
import { ISSUES, SEVERITY_ORDER, type IssueCategory } from "@/lib/seo/issues";

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

const SEVERITY_STYLE = {
  critical: { label: "Critical", chip: "bg-crit/12 text-crit", edge: "border-l-crit" },
  warning: { label: "Warning", chip: "bg-warn/14 text-warn", edge: "border-l-warn" },
  notice: { label: "Notice", chip: "bg-note/12 text-note", edge: "border-l-note" },
} as const;

/** The focused tool that finds this kind of problem, for the sidebar. */
const TOOL_FOR: Partial<Record<IssueCategory, { href: string; label: string }>> = {
  Links: { href: "/broken-link-checker", label: "Open the link checker" },
  Keywords: { href: "/keyword-cannibalization-checker", label: "Open the keyword checker" },
  "Search appearance": { href: "/meta-tag-checker", label: "Open the meta tag checker" },
  "AI search": { href: "/geo-aeo-checker", label: "Open the GEO checker" },
};

const shortTitle = (guide: Guide) => guide.metaTitle.split(":")[0];

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const guide = guideFor((await params).slug);
  if (!guide) notFound();
  const path = `/checks/${guide.slug}`;
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Checks explained", path: "/checks" },
    { name: shortTitle(guide), path },
  ];
  const checks = [...guide.codes].sort((a, b) => SEVERITY_ORDER[ISSUES[a].severity] - SEVERITY_ORDER[ISSUES[b].severity]);
  const index = GUIDES.indexOf(guide);
  const prev = GUIDES[index - 1];
  const next = GUIDES[index + 1];
  const tool = TOOL_FOR[guide.category] ?? { href: "/", label: "Scan my blog" };
  const minutes = readingTime(guide.answer, guide.why, ...guide.steps, ...guide.faqs.flatMap((f) => [f.q, f.a]));

  return (
    <ContentShell>
      <JsonLd
        data={graph(
          article({ headline: guide.title, description: guide.metaDescription, path, about: guide.keyword }),
          faqPage(guide.faqs, path),
          breadcrumbs(crumbs),
        )}
      />
      <PageIntro eyebrow={`${guide.category} check`} title={guide.title} answer={guide.answer} crumbs={crumbs} minutes={minutes} />
      <ArticleLayout
        toc={[
          { id: "why", label: "Why it matters" },
          { id: "fix", label: "How to fix it" },
          { id: "how-we-check", label: "How we check it" },
          { id: "faq", label: "FAQ" },
          { id: "related", label: "Related checks" },
        ]}
        aside={
          <SideCta
            title="Find every page with this problem"
            body="Scan your blog free. Results in a couple of minutes."
            href={tool.href}
            label={`${tool.label} →`}
          />
        }
      >
        <Section id="why" title="Why it matters">
          <p>{guide.why}</p>
        </Section>

        <Section id="fix" title="How to fix it">
          <Steps steps={guide.steps} />
        </Section>

        <Section id="how-we-check" title="How That One Crawler checks it">
          <ul className="space-y-3">
            {checks.map((code) => {
              const info = ISSUES[code];
              const style = SEVERITY_STYLE[info.severity];
              return (
                <li key={code} className={`rounded-xl border-2 border-l-[6px] border-line bg-card p-4 ${style.edge}`}>
                  <p className="flex flex-wrap items-center gap-2 font-display text-lg font-bold text-ink">
                    {info.label}
                    <span className={`rounded-full px-2 py-0.5 font-sans text-xs font-bold ${style.chip}`}>{style.label}</span>
                  </p>
                  <p className="mt-1 text-base text-ink-2">{info.why}</p>
                  <p className="mt-2 text-base text-ink">
                    <b>Fix:</b> {info.fix}
                  </p>
                </li>
              );
            })}
          </ul>
        </Section>

        <FaqSection faqs={guide.faqs} />
        <ScanCta title="Find every page with this problem" />
        <RelatedGuides slugs={guide.related} />
        <PrevNext
          prev={prev && { href: `/checks/${prev.slug}`, title: shortTitle(prev) }}
          next={next && { href: `/checks/${next.slug}`, title: shortTitle(next) }}
        />
      </ArticleLayout>
    </ContentShell>
  );
}
