import type { Metadata } from "next";
import { ArticleLayout, ContentShell, FaqSection, JsonLd, PageIntro, Section } from "@/components/content/ContentKit";
import type { Faq } from "@/lib/content/guides";
import { abs, breadcrumbs, faqPage, graph } from "@/lib/content/structured-data";

const PATH = "/bot";
const TITLE = "ThatOneCrawler Bot: What It Is and How to Control It";
const DESCRIPTION =
  "ThatOneCrawler visits pages only when someone runs an SEO scan. Learn how it behaves, how gently it crawls, and how to block it with robots.txt.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH },
};

const FAQS: Faq[] = [
  {
    q: "Why did ThatOneCrawler visit my site?",
    a: "Someone entered your site's address into That One Crawler to run an SEO audit. The bot never crawls on its own schedule; every visit is triggered by a person's scan.",
  },
  {
    q: "How do I block ThatOneCrawler?",
    a: "Add a group for it to your robots.txt, for example “User-agent: ThatOneCrawler” followed by “Disallow: /”. We obey rules written for our user agent, and skip the URLs they disallow.",
  },
  {
    q: "Does it obey general robots.txt rules?",
    a: "Rules for all bots (User-agent: *) are reported as findings in the audit, because site owners usually want to know which pages search engines can't reach. Rules naming ThatOneCrawler are always obeyed.",
  },
];

const BEHAVIOR = [
  "Visits only when someone runs a scan; there's no background crawling or indexing.",
  "Fetches about six pages at a time and stops at the page limit the person chose (1,000 at most).",
  "Reads your robots.txt and sitemap first, and only follows links within your site.",
  "Checks outgoing links and images with lightweight HEAD requests, and only retries with a tiny GET when a server refuses HEAD.",
  "Never submits forms, logs in, or fetches private or internal network addresses.",
  "Results are stored in the scanning person's browser, not on our servers.",
];

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
        answer="ThatOneCrawler is the user agent That One Crawler uses to read public pages when someone runs an SEO audit. It only visits when a person starts a scan, fetches a few pages at a time, never logs in or submits forms, and obeys robots.txt rules written for it."
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
