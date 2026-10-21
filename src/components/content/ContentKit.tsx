import Link from "next/link";
import type { ReactNode } from "react";
import { guideFor, type Faq } from "@/lib/content/guides";
import { CONTENT_UPDATED } from "@/lib/content/structured-data";
import { WORDS_PER_MINUTE } from "@/lib/seo/issues";
import { countWords } from "@/lib/seo/text";
import { AUTHOR } from "@/lib/site";
import { Mascot } from "../Mascot";
import { ScanForm } from "../ScanForm";
import { SiteFooter, SiteHeader } from "../SiteChrome";
import { ArticleToc, type TocItem } from "./ArticleToc";

export type { TocItem };

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
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => (
          <li key={item.path} className="flex items-center gap-1.5">
            {i > 0 && (
              <span aria-hidden className="text-line">
                /
              </span>
            )}
            {i === items.length - 1 ? (
              <span aria-current="page" className="font-semibold text-ink-2">
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

/** Minutes to read some text, at least one. */
export function readingTime(...texts: string[]): number {
  return Math.max(1, Math.round(countWords(texts.join(" ")) / WORDS_PER_MINUTE));
}

function Byline({ minutes }: { minutes?: number }) {
  const initials = AUTHOR.name
    .split(" ")
    .map((part) => part[0])
    .join("");
  return (
    <div className="mt-6 flex items-center gap-3 text-sm">
      <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full border-2 border-ink bg-lime font-display font-extrabold text-lime-ink">
        {initials}
      </span>
      <p className="leading-tight">
        By{" "}
        <a href={AUTHOR.url} rel="author" className="font-semibold text-ink underline-offset-2 hover:underline">
          {AUTHOR.name}
        </a>
        <span className="block text-ink-3">
          Updated <time dateTime={CONTENT_UPDATED}>{updatedLabel}</time>
          {minutes ? ` · ${minutes} min read` : ""}
        </span>
      </p>
    </div>
  );
}

/** Breadcrumbs, eyebrow, H1 and the 40–60 word direct answer that answer engines quote. */
export function PageIntro({
  eyebrow,
  title,
  answer,
  crumbs,
  minutes,
  mood = "smirk",
  overlap = false,
  children,
}: {
  eyebrow: string;
  title: string;
  answer: string;
  crumbs?: { name: string; path: string }[];
  minutes?: number;
  mood?: "smirk" | "happy" | "cool";
  /** Leave room at the bottom for a card that overlaps the intro (the tool pages' workbench). */
  overlap?: boolean;
  children?: ReactNode;
}) {
  return (
    <header className="dots border-b-2 border-ink">
      <div
        className={`shell grid gap-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-center ${overlap ? "pt-10 pb-20 md:pt-14 md:pb-24" : "py-10 md:py-14"}`}
      >
        <div className="max-w-3xl">
          {crumbs && <Breadcrumbs items={crumbs} />}
          <p
            className={`${crumbs ? "mt-6" : ""} inline-block -rotate-1 rounded-full border-2 border-ink bg-lime px-3 py-1 text-sm font-bold text-lime-ink shadow-brutal-sm`}
          >
            {eyebrow}
          </p>
          <h1 className="mt-4 font-display text-4xl leading-[1.04] font-extrabold tracking-tight text-balance sm:text-5xl">{title}</h1>
          <p className="mt-5 text-lg leading-relaxed text-ink-2 sm:text-xl">{answer}</p>
          <Byline minutes={minutes} />
          {children}
        </div>
        {/* The wrapper owns visibility: the mascot sets its own display. */}
        <div className="hidden justify-self-center md:block">
          <Mascot pokeable mood={mood} className="size-40 lg:size-48" />
        </div>
      </div>
    </header>
  );
}

/** Body column plus a sticky "On this page" sidebar on wide screens. Every edge lines up with the header. */
export function ArticleLayout({ toc, aside, children }: { toc: TocItem[]; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="shell grid gap-12 py-12 lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-16 lg:py-16">
      <article className="min-w-0 max-w-3xl space-y-14">{children}</article>
      <aside className="hidden lg:block">
        <div className="sticky top-24 space-y-6">
          <ArticleToc items={toc} />
          {aside}
        </div>
      </aside>
    </div>
  );
}

/** A small "go do it" card for the article sidebar. */
export function SideCta({ title, body, href, label }: { title: string; body: string; href: string; label: string }) {
  return (
    <div className="rounded-2xl border-2 border-ink bg-card p-4 shadow-brutal-sm">
      <Mascot mood="happy" follow={false} className="size-10" />
      <p className="mt-2 font-display text-lg leading-tight font-extrabold">{title}</p>
      <p className="mt-1 text-sm text-ink-2">{body}</p>
      <Link
        href={href}
        className="mt-3 inline-flex rounded-xl border-2 border-ink bg-lime px-3 py-1.5 text-sm font-bold text-lime-ink transition hover:-translate-y-0.5 hover:shadow-brutal-sm"
      >
        {label}
      </Link>
    </div>
  );
}

export function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      {/* Decorations are CSS-only so crawlers (ours included) read the heading text exactly. */}
      <h2 className="group font-display text-2xl font-extrabold tracking-tight after:ml-2 after:text-ink-3 after:opacity-0 after:transition after:content-['#'] hover:after:opacity-100 sm:text-3xl">
        <a href={`#${id}`} className="decoration-line underline-offset-4 hover:underline">
          {title}
        </a>
      </h2>
      <div className="mt-5 space-y-4 text-[1.0625rem] leading-relaxed text-ink-2">{children}</div>
    </section>
  );
}

/** Numbered steps on a timeline (numbers come from a CSS counter, not the text). */
export function Steps({ steps }: { steps: string[] }) {
  return (
    <ol className="relative space-y-4 [counter-reset:step] before:absolute before:top-4 before:bottom-4 before:left-4 before:w-0.5 before:-translate-x-1/2 before:bg-line">
      {steps.map((step) => (
        <li
          key={step}
          className="relative flex items-start gap-4 [counter-increment:step] before:z-10 before:grid before:size-8 before:shrink-0 before:place-items-center before:rounded-full before:border-2 before:border-ink before:bg-lime before:font-display before:text-sm before:font-extrabold before:text-lime-ink before:content-[counter(step)]"
        >
          <p className="min-w-0 flex-1 rounded-xl border-2 border-line bg-card px-4 py-3 text-base text-ink">{step}</p>
        </li>
      ))}
    </ol>
  );
}

/** Visible questions as H3s with their answers, mirrored by FAQPage markup. */
export function FaqSection({ faqs, title = "Frequently asked questions" }: { faqs: Faq[]; title?: string }) {
  return (
    <Section id="faq" title={title}>
      <div className="space-y-3">
        {faqs.map((faq) => (
          <div key={faq.q} className="rounded-2xl border-2 border-ink bg-card p-5 shadow-brutal-sm">
            <h3 className="flex gap-3 font-display text-lg leading-snug font-bold text-ink before:grid before:size-7 before:shrink-0 before:place-items-center before:rounded-lg before:bg-lime before:text-sm before:font-extrabold before:text-lime-ink before:content-['Q']">
              {faq.q}
            </h3>
            <p className="mt-2 text-base leading-relaxed text-ink-2 sm:pl-10">{faq.a}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function RelatedGuides({ slugs, title = "Related checks", id = "related" }: { slugs: string[]; title?: string; id?: string }) {
  const guides = slugs.map(guideFor).filter((g) => g !== undefined);
  if (!guides.length) return null;
  return (
    <Section id={id} title={title}>
      <ul className="grid gap-3 sm:grid-cols-2">
        {guides.map((g) => (
          <li key={g.slug}>
            <Link
              href={`/checks/${g.slug}`}
              className="group flex h-full flex-col rounded-2xl border-2 border-ink bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-brutal-sm"
            >
              <span className="text-xs font-bold tracking-wider text-ink-3 uppercase">{g.category}</span>
              <span className="mt-1 font-display text-lg leading-snug font-bold text-ink">{g.metaTitle.split(":")[0]}</span>
              <span className="mt-1 flex-1 text-sm text-ink-2">{g.metaDescription}</span>
              <span className="mt-3 text-sm font-bold text-ink">
                Read the guide <span className="inline-block transition group-hover:translate-x-0.5">→</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/** Previous / next links at the end of a series. */
export function PrevNext({
  prev,
  next,
}: {
  prev?: { href: string; title: string };
  next?: { href: string; title: string };
}) {
  if (!prev && !next) return null;
  return (
    <nav aria-label="More guides" className="grid gap-3 border-t-2 border-dashed border-line pt-8 sm:grid-cols-2">
      {prev ? (
        <Link href={prev.href} className="rounded-2xl border-2 border-line p-4 transition hover:border-ink">
          <span className="text-xs font-bold tracking-wider text-ink-3 uppercase">← Previous</span>
          <span className="mt-1 block font-display font-bold text-ink">{prev.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link href={next.href} className="rounded-2xl border-2 border-line p-4 text-right transition hover:border-ink">
          <span className="text-xs font-bold tracking-wider text-ink-3 uppercase">Next →</span>
          <span className="mt-1 block font-display font-bold text-ink">{next.title}</span>
        </Link>
      )}
    </nav>
  );
}

export function ScanCta({ title = "Check your own blog now" }: { title?: string }) {
  return (
    <section className="theme-light relative overflow-hidden rounded-2xl border-2 border-ink bg-lime p-6 text-lime-ink shadow-brutal sm:p-8">
      <div aria-hidden className="absolute -right-3 -bottom-5 hidden rotate-12 sm:block">
        <Mascot mood="cool" follow={false} className="size-28" />
      </div>
      <div className="relative sm:pr-24">
        <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h2>
        <p className="mt-2 text-ink-2">Free, no signup, results in a couple of minutes. Your scans stay in your browser.</p>
        <div className="mt-5 text-ink">
          <ScanForm compact />
        </div>
      </div>
    </section>
  );
}
