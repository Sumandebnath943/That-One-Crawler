import type { Metadata } from "next";
import Link from "next/link";
import {
  ArticleLayout,
  ContentShell,
  FaqSection,
  JsonLd,
  PageIntro,
  readingTime,
  ScanCta,
  Section,
  SideCta,
} from "@/components/content/ContentKit";
import { CHECKLIST_ANSWER, CHECKLIST_DESCRIPTION as DESCRIPTION, CHECKLIST_FAQS as FAQS, CHECKLIST_PATH as PATH, CHECKLIST_STAGES as STAGES, CHECKLIST_TITLE as TITLE } from "@/lib/content/checklist";
import { markdownUrl } from "@/lib/content/negotiate";
import { article, breadcrumbs, faqPage, graph } from "@/lib/content/structured-data";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH, types: { "text/markdown": markdownUrl(PATH) } },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: "article" },
};

export default function ChecklistPage() {
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Blog SEO checklist", path: PATH },
  ];
  const total = STAGES.reduce((sum, s) => sum + s.items.length, 0);
  const minutes = readingTime(...STAGES.flatMap((s) => [s.answer, ...s.items.flatMap((i) => [i.title, i.body])]), ...FAQS.map((f) => f.a));
  // Where each stage's numbering starts, so items count 01–25 across the whole checklist.
  const firstNumber = STAGES.map((_, i) => STAGES.slice(0, i).reduce((sum, s) => sum + s.items.length, 1));
  return (
    <ContentShell>
      <JsonLd
        data={graph(
          article({ type: "Article", headline: TITLE, description: DESCRIPTION, path: PATH, about: "blog SEO checklist" }),
          faqPage(FAQS, PATH),
          breadcrumbs(crumbs),
        )}
      />
      <PageIntro
        eyebrow="Blog SEO checklist"
        title={`The blog SEO checklist: ${total} checks before (and after) you hit publish`}
        answer={CHECKLIST_ANSWER}
        crumbs={crumbs}
        minutes={minutes}
        mood="happy"
      />

      <ArticleLayout
        toc={[...STAGES.map((s) => ({ id: s.id, label: s.title })), { id: "faq", label: "FAQ" }]}
        aside={
          <SideCta
            title="Check all 25 automatically"
            body="One free scan runs this whole checklist on every post."
            href="/"
            label="Scan my blog →"
          />
        }
      >
        <nav aria-label="Checklist sections" className="rounded-2xl border-2 border-dashed border-line p-5 lg:hidden">
          <p className="text-xs font-bold tracking-wider text-ink-3 uppercase">In this checklist</p>
          <ol className="mt-3 grid gap-1 text-ink-2 sm:grid-cols-2">
            {STAGES.map((stage, i) => (
              <li key={stage.id}>
                <a href={`#${stage.id}`} className="underline-offset-2 hover:text-ink hover:underline">
                  {i + 1}. {stage.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {STAGES.map((stage, s) => (
          <Section key={stage.id} id={stage.id} title={stage.title}>
            <p>{stage.answer}</p>
            <ul className="space-y-3 pt-2">
              {stage.items.map((item, i) => {
                return (
                  <li key={item.title} className="flex gap-4 rounded-2xl border-2 border-line bg-card p-4 transition hover:border-ink">
                    <span
                      aria-hidden
                      className="grid size-8 shrink-0 place-items-center rounded-lg border-2 border-ink bg-lime font-mono text-xs font-bold text-lime-ink"
                    >
                      {String(firstNumber[s] + i).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-display text-lg leading-snug font-bold text-ink">{item.title}</h3>
                      <p className="mt-1 text-base text-ink-2">{item.body}</p>
                      {item.guide && (
                        <Link
                          href={`/checks/${item.guide}`}
                          className="mt-2 inline-block text-sm font-bold text-ink underline decoration-line underline-offset-4 hover:decoration-ink"
                        >
                          How to fix it →
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Section>
        ))}

        <ScanCta title="Run the whole checklist on your blog, free" />
        <FaqSection faqs={FAQS} />
      </ArticleLayout>
    </ContentShell>
  );
}
