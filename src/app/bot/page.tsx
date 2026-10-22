import type { Metadata } from "next";
import { ArticleLayout, ContentShell, FaqSection, JsonLd, PageIntro, Section } from "@/components/content/ContentKit";
import { markdownUrl } from "@/lib/content/negotiate";
import { BOT_PAGE } from "@/lib/content/pages";
import { abs, breadcrumbs, faqPage, graph } from "@/lib/content/structured-data";

const PATH = BOT_PAGE.path;
const TITLE = BOT_PAGE.title;
const DESCRIPTION = BOT_PAGE.description;

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH, types: { "text/markdown": markdownUrl(PATH) } },
};

const FAQS = BOT_PAGE.faqs;
const BEHAVIOR = BOT_PAGE.behavior;

export default function BotPage() {
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "The crawler bot", path: PATH },
  ];
  return (
    <ContentShell>
      <JsonLd
        data={graph(
          { "@type": "WebPage", "@id": `${abs(PATH)}#page`, name: TITLE, description: DESCRIPTION, url: abs(PATH) },
          faqPage(FAQS, PATH),
          breadcrumbs(crumbs),
        )}
      />
      <PageIntro
        eyebrow="For site owners"
        title="Meet ThatOneCrawler, the bot behind the audits"
        answer={BOT_PAGE.answer}
        crumbs={crumbs}
      />
      <ArticleLayout
        toc={[
          { id: "user-agent", label: "How it identifies itself" },
          { id: "behavior", label: "How it behaves" },
          { id: "block", label: "How to block it" },
          { id: "faq", label: "FAQ" },
        ]}
      >
        <Section id="user-agent" title="How it identifies itself">
          <p>Requests carry this user agent:</p>
          <pre className="overflow-x-auto rounded-xl border-2 border-ink bg-sunk p-4 font-mono text-sm text-ink">
            Mozilla/5.0 (compatible; ThatOneCrawler/1.0; +{abs(PATH)})
          </pre>
        </Section>
        <Section id="behavior" title="How it behaves">
          <ul className="space-y-2">
            {BEHAVIOR.map((line) => (
              <li key={line} className="flex gap-3 rounded-xl border-2 border-line bg-card px-4 py-3 text-base text-ink">
                <span aria-hidden className="text-good">
                  ✓
                </span>
                {line}
              </li>
            ))}
          </ul>
        </Section>
        <Section id="block" title="How to block or limit it">
          <p>Add this to your robots.txt to keep it out entirely:</p>
          <pre className="overflow-x-auto rounded-xl border-2 border-ink bg-sunk p-4 font-mono text-sm text-ink">{"User-agent: ThatOneCrawler\nDisallow: /"}</pre>
          <p>Or disallow just the paths you want skipped. Scans of your site will then note that some URLs were skipped at your request.</p>
        </Section>
        <FaqSection faqs={FAQS} />
      </ArticleLayout>
    </ContentShell>
  );
}
