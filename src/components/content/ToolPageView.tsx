import type { Metadata } from "next";
import { toolFor } from "@/lib/content/tools";
import { breadcrumbs, faqPage, graph, webApplication } from "@/lib/content/structured-data";
import { ScanForm } from "../ScanForm";
import { Breadcrumbs, ContentShell, FaqSection, JsonLd, PageIntro, RelatedGuides, ScanCta, Section, Steps } from "./ContentKit";

export function toolMetadata(slug: string): Metadata {
  const tool = toolFor(slug);
  const path = `/${tool.slug}`;
  return {
    title: { absolute: tool.metaTitle },
    description: tool.metaDescription,
    alternates: { canonical: path },
    openGraph: { title: tool.metaTitle, description: tool.metaDescription, url: path, type: "website" },
  };
}

/** A keyword-targeted landing page for one of the things That One Crawler does. */
export function ToolPageView({ slug }: { slug: string }) {
  const tool = toolFor(slug);
  const path = `/${tool.slug}`;
  const crumbs = [
    { name: "Home", path: "/" },
    { name: tool.eyebrow, path },
  ];
  return (
    <ContentShell>
      <JsonLd
        data={graph(
          webApplication(tool.eyebrow, path, tool.metaDescription, tool.features.map((f) => f.title)),
          faqPage(tool.faqs, path),
          breadcrumbs(crumbs),
        )}
      />
      <PageIntro eyebrow={tool.eyebrow} title={tool.h1} answer={tool.answer} mood="happy">
        <div className="mt-6 max-w-2xl">
          <ScanForm />
        </div>
        <div className="mt-6">
          <Breadcrumbs items={crumbs} />
        </div>
      </PageIntro>
      <div className="mx-auto max-w-5xl space-y-14 px-4 py-14 sm:px-6">
        <Section title="What it checks">
          <ul className="grid gap-4 sm:grid-cols-2">
            {tool.features.map((feature) => (
              <li key={feature.title} className="rounded-2xl border-2 border-ink bg-card p-5 shadow-brutal">
                <h3 className="font-display text-xl font-extrabold text-ink">{feature.title}</h3>
                <p className="mt-2 text-base">{feature.body}</p>
              </li>
            ))}
          </ul>
        </Section>
        <Section title="How to use it">
          <Steps steps={tool.steps} />
        </Section>
        <FaqSection faqs={tool.faqs} />
        <ScanCta />
        <RelatedGuides slugs={tool.guides} title="Learn how to fix what it finds" />
      </div>
    </ContentShell>
  );
}
