import type { Metadata } from "next";
import Link from "next/link";
import { MODE_LABEL, TOOLS, toolFor, toolName } from "@/lib/content/tools";
import { breadcrumbs, faqPage, graph, webApplication } from "@/lib/content/structured-data";
import { ToolWorkbench, type ToolSlug } from "../tools/ToolWorkbench";
import { ContentShell, FaqSection, JsonLd, PageIntro, RelatedGuides, ScanCta, Section, Steps } from "./ContentKit";

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

/** Cards for the other focused tools. */
export function OtherTools({ current }: { current?: string }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {TOOLS.filter((t) => t.slug !== current).map((tool) => (
        <li key={tool.slug}>
          <Link
            href={`/${tool.slug}`}
            className="group flex h-full flex-col rounded-2xl border-2 border-ink bg-card p-5 transition hover:-translate-y-1 hover:shadow-brutal"
          >
            <span className="self-start rounded-full bg-sunk px-2 py-0.5 text-[11px] font-bold text-ink-2">{MODE_LABEL[tool.mode]}</span>
            <span className="mt-3 font-display text-xl leading-snug font-extrabold">{toolName(tool)}</span>
            <span className="mt-2 flex-1 text-sm text-ink-2">{tool.summary}</span>
            <span className="mt-4 text-sm font-bold">
              Open it <span className="inline-block transition group-hover:translate-x-0.5">→</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** A keyword-targeted landing page with its own working tool. */
export function ToolPageView({ slug }: { slug: ToolSlug }) {
  const tool = toolFor(slug);
  const path = `/${tool.slug}`;
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Free tools", path: "/#tools" },
    { name: toolName(tool), path },
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
      <PageIntro eyebrow={tool.eyebrow} title={tool.h1} answer={tool.answer} crumbs={crumbs} mood="happy" overlap />
      <ToolWorkbench slug={slug} name={toolName(tool)} mode={tool.mode} action={tool.action} placeholder={tool.placeholder} />
      <div className="shell space-y-16 py-14 lg:py-20">
        <Section id="features" title="What it checks">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {tool.features.map((feature) => (
              <li key={feature.title} className="rounded-2xl border-2 border-ink bg-card p-5 shadow-brutal-sm">
                <h3 className="font-display text-lg leading-snug font-extrabold text-ink">{feature.title}</h3>
                <p className="mt-2 text-base">{feature.body}</p>
              </li>
            ))}
          </ul>
        </Section>
        <div className="grid gap-14 lg:grid-cols-2 lg:gap-12">
          <Section id="how" title="How to use it">
            <Steps steps={tool.steps} />
          </Section>
          <FaqSection faqs={tool.faqs} />
        </div>
        <ScanCta title="Want everything? Run the full audit" />
        <RelatedGuides slugs={tool.guides} title="Learn how to fix what it finds" />
        <Section id="more-tools" title="More free tools">
          <OtherTools current={tool.slug} />
        </Section>
      </div>
    </ContentShell>
  );
}
