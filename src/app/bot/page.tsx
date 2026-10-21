import type { Metadata } from "next";
import { Breadcrumbs, ContentShell, FaqSection, JsonLd, PageIntro, Section } from "@/components/content/ContentKit";
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
      >
        <div className="mt-6">
          <Breadcrumbs items={crumbs} />
        </div>
      </PageIntro>
      <div className="mx-auto max-w-3xl space-y-12 px-4 py-14 sm:px-6">
        <Section title="How it identifies itself">
          <p>Requests carry this user agent:</p>
          <pre className="overflow-x-auto rounded-xl bg-ink p-4 font-mono text-sm text-paper">
            Mozilla/5.0 (compatible; ThatOneCrawler/1.0; +{abs(PATH)})
          </pre>
        </Section>
        <Section title="How it behaves">
          <ul className="list-disc space-y-2 pl-6">
            <li>Visits only when someone runs a scan; there&apos;s no background crawling or indexing.</li>
            <li>Fetches about six pages at a time and stops at the page limit the person chose (1,000 at most).</li>
            <li>Reads your robots.txt and sitemap first, and only follows links within your site.</li>
            <li>Checks outgoing links and images with lightweight HEAD requests where possible.</li>
            <li>Never submits forms, logs in, or fetches private or internal network addresses.</li>
            <li>Results are stored in the scanning person&apos;s browser, not on our servers.</li>
          </ul>
        </Section>
        <Section title="How to block or limit it">
          <p>Add this to your robots.txt to keep it out entirely:</p>
          <pre className="overflow-x-auto rounded-xl bg-ink p-4 font-mono text-sm text-paper">{"User-agent: ThatOneCrawler\nDisallow: /"}</pre>
          <p>Or disallow just the paths you want skipped. Scans of your site will then note that some URLs were skipped at your request.</p>
        </Section>
        <FaqSection faqs={FAQS} />
      </div>
    </ContentShell>
  );
}
