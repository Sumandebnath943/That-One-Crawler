import type { Metadata } from "next";
import { JsonLd } from "@/components/content/ContentKit";
import { RecentScans } from "@/components/RecentScans";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import {
  Faq,
  FinalCta,
  FindingsMarquee,
  FreeTools,
  Hero,
  HowItWorks,
  Judged,
  LANDING_FAQ,
  Reviews,
  WhatIsIt,
} from "@/components/landing/Sections";
import { faqPage, graph, webApplication } from "@/lib/content/structured-data";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <>
      <JsonLd
        data={graph(
          webApplication(SITE_NAME, "/", SITE_DESCRIPTION, [
            "Whole-site SEO audit (up to 1,000 pages)",
            "Broken link and image checker",
            "Keyword cannibalization checker",
            "AI search readiness (GEO/AEO) score",
            "Title and meta description checker with Google preview",
            "Structured data, freshness and readability checks",
            "AI rewrites for titles, sections, headings, intros and FAQs",
          ]),
          faqPage(LANDING_FAQ, "/"),
        )}
      />
      <SiteHeader landing />
      <main className="flex-1">
        <Hero />
        <FindingsMarquee />
        <RecentScans />
        <WhatIsIt />
        <Judged />
        <FreeTools />
        <HowItWorks />
        <Reviews />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
