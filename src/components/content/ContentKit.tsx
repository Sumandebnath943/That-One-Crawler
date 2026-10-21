import Link from "next/link";
import type { ReactNode } from "react";
import { guideFor, type Faq } from "@/lib/content/guides";
import { CONTENT_UPDATED } from "@/lib/content/structured-data";
import { AUTHOR } from "@/lib/site";
import { Mascot } from "../Mascot";
import { ScanForm } from "../ScanForm";
import { SiteFooter, SiteHeader } from "../SiteChrome";

export function JsonLd({ data }: { data: object }) {
  // "<" is escaped so page text inside the markup can never close the script tag.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export function ContentShell({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}

export function Breadcrumbs({ items }: { items: { name: string; path: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-ink-3">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, i) => (
          <li key={item.path} className="flex items-center gap-1">
            {i > 0 && <span aria-hidden>/</span>}
            {i === items.length - 1 ? (
              <span aria-current="page" className="text-ink-2">
                {item.name}
              </span>
            ) : (
              <Link href={item.path} className="underline-offset-2 hover:text-ink hover:underline">
                {item.name}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

const updatedLabel = new Date(`${CONTENT_UPDATED}T00:00:00Z`).toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

/** Eyebrow, H1 and the 40–60 word direct answer that answer engines quote. */
export function PageIntro({
  eyebrow,
  title,
  answer,
  mood = "smirk",
  children,
}: {
  eyebrow: string;
  title: string;
  answer: string;
  mood?: "smirk" | "happy" | "cool";
  children?: ReactNode;
}) {
  return (
    <header className="dots border-b-2 border-ink">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1fr_auto] md:items-center md:py-16">
        <div>
          <p className="mb-4 inline-block -rotate-1 rounded-full border-2 border-ink bg-lime px-3 py-1 text-sm font-bold text-lime-ink shadow-brutal-sm">
            {eyebrow}
          </p>
          <h1 className="font-display text-4xl leading-[1.02] font-extrabold tracking-tight text-balance sm:text-5xl">{title}</h1>
          <p className="mt-5 max-w-2xl text-lg text-ink-2">{answer}</p>
          <p className="mt-4 text-sm text-ink-3">
            Updated <time dateTime={CONTENT_UPDATED}>{updatedLabel}</time> · By{" "}
            <a href={AUTHOR.url} rel="author" className="font-semibold underline underline-offset-2 hover:text-ink">
              {AUTHOR.name}
            </a>
          </p>
          {children}
        </div>
        <Mascot pokeable mood={mood} className="mx-auto hidden size-40 md:block" />
      </div>
    </header>
  );
}

export function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="font-display text-3xl font-extrabold tracking-tight">{title}</h2>
      <div className="mt-4 space-y-4 text-lg text-ink-2">{children}</div>
    </section>
  );
}

export function Steps({ steps }: { steps: string[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((step, i) => (
        <li key={step} className="flex gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-ink bg-lime font-display font-extrabold text-lime-ink">
            {i + 1}
          </span>
          <span className="pt-0.5 text-ink">{step}</span>
        </li>
      ))}
    </ol>
  );
}

/** Visible questions as H3s with their answers, mirrored by FAQPage markup. */
export function FaqSection({ faqs, title = "Frequently asked questions" }: { faqs: Faq[]; title?: string }) {
  return (
    <Section id="faq" title={title}>
      <div className="divide-y-2 divide-dashed divide-line rounded-2xl border-2 border-ink bg-card px-5 shadow-brutal">
        {faqs.map((faq) => (
          <div key={faq.q} className="py-4">
            <h3 className="font-display text-lg font-bold text-ink">{faq.q}</h3>
            <p className="mt-1 text-base">{faq.a}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function RelatedGuides({ slugs, title = "Related checks" }: { slugs: string[]; title?: string }) {
  const guides = slugs.map(guideFor).filter((g) => g !== undefined);
  if (!guides.length) return null;
  return (
    <Section title={title}>
      <ul className="grid gap-3 sm:grid-cols-2">
        {guides.map((g) => (
          <li key={g.slug}>
            <Link
              href={`/checks/${g.slug}`}
              className="block h-full rounded-xl border-2 border-ink bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-brutal-sm"
            >
              <span className="block font-display text-lg font-bold text-ink">{g.metaTitle.split(":")[0]}</span>
              <span className="mt-1 block text-sm text-ink-2">{g.metaDescription}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function ScanCta({ title = "Check your own blog now" }: { title?: string }) {
  return (
    <section className="theme-light rounded-2xl border-2 border-ink bg-lime p-6 text-lime-ink shadow-brutal sm:p-8">
      <h2 className="font-display text-3xl font-extrabold tracking-tight">{title}</h2>
      <p className="mt-2 text-ink-2">Free, no signup, results in a couple of minutes. Your scans stay in your browser.</p>
      <div className="mt-5 text-ink">
        <ScanForm compact />
      </div>
    </section>
  );
}
