import { RecentScans } from "@/components/RecentScans";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { Faq, FinalCta, FindingsMarquee, Hero, HowItWorks, Judged, Reviews } from "@/components/landing/Sections";

export default function Home() {
  return (
    <>
      <SiteHeader landing />
      <main className="flex-1">
        <Hero />
        <FindingsMarquee />
        <RecentScans />
        <Judged />
        <HowItWorks />
        <Reviews />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
