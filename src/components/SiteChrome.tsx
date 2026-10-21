import Link from "next/link";
import { AUTHOR } from "@/lib/site";
import { Mascot } from "./Mascot";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { href: "/#tools", label: "Free tools" },
  { href: "/checks", label: "Checks explained" },
  { href: "/blog-seo-checklist", label: "SEO checklist" },
];

export function SiteHeader({ landing = false }: { landing?: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b-2 border-ink bg-paper/90 backdrop-blur">
      <div className="shell flex h-16 items-center gap-3">
        <Link href="/" className="group flex items-center gap-2" aria-label="That One Crawler home">
          <Mascot className="size-10 transition group-hover:rotate-6" title="That One Crawler logo" />
          <span className="font-display text-base font-extrabold tracking-tight whitespace-nowrap min-[400px]:text-lg sm:text-xl">That One Crawler</span>
          <span className="daddy-only -rotate-3 rounded-full border-2 border-ink bg-lime px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-lime-ink uppercase">
            Daddy mode
          </span>
        </Link>
        <nav aria-label="Main" className="ml-auto flex items-center gap-1 text-sm font-semibold sm:gap-2">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="hidden rounded-full px-3 py-2 hover:bg-sunk lg:block">
              {item.label}
            </Link>
          ))}
          {!landing && (
            <Link href="/" className="rounded-full border-2 border-ink bg-lime px-3 py-1.5 whitespace-nowrap text-lime-ink hover:-translate-y-0.5">
              New scan
            </Link>
          )}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

const FOOTER_COLUMNS = [
  {
    title: "Free tools",
    links: [
      { href: "/", label: "Free SEO audit for blogs" },
      { href: "/broken-link-checker", label: "Broken link checker" },
      { href: "/keyword-cannibalization-checker", label: "Keyword cannibalization checker" },
      { href: "/geo-aeo-checker", label: "GEO & AEO checker" },
      { href: "/meta-tag-checker", label: "Meta tag checker" },
    ],
  },
  {
    title: "Learn",
    links: [
      { href: "/blog-seo-checklist", label: "Blog SEO checklist" },
      { href: "/checks", label: "Every SEO check, explained" },
      { href: "/checks/ai-search-readiness", label: "AI search readiness (GEO)" },
      { href: "/checks/keyword-cannibalization", label: "Keyword cannibalization" },
      { href: "/checks/title-tag-length", label: "Title tag length" },
    ],
  },
  {
    title: "About",
    links: [
      { href: "/bot", label: "Meet the crawler bot" },
      { href: "/llms.txt", label: "llms.txt" },
      { href: "/sitemap.xml", label: "Sitemap" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative mt-auto border-t-2 border-ink bg-card">
      {/* A spider peeking over the footer's edge. Hover and it pops up a little more. */}
      <div className="group absolute -top-7 right-8 h-7 overflow-hidden sm:right-16" aria-hidden>
        <Mascot className="size-14 translate-y-1 transition-transform duration-300 group-hover:-translate-y-1" />
      </div>
      <div className="shell grid gap-8 py-10 md:grid-cols-[1.3fr_1fr_1fr_0.8fr]">
        <div>
          <p className="font-display text-xl font-extrabold">That One Crawler</p>
          <p className="mt-2 max-w-xs text-sm text-ink-2">
            The free SEO audit tool for blogs. Crawls your whole site and tells you what to fix, for Google and for AI search.
          </p>
          <p className="mt-3 text-sm font-semibold">Nothing escapes. Not even that one bad blog post from 2021.</p>
        </div>
        {FOOTER_COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <p className="text-xs font-bold tracking-wider text-ink-3 uppercase">{column.title}</p>
            <ul className="mt-3 space-y-2 text-sm">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-ink-2 underline-offset-2 hover:text-ink hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t-2 border-dashed border-line">
        <div className="shell flex flex-col gap-1 py-4 text-sm text-ink-2 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Made with questionable amounts of caffeine by{" "}
            <a href={AUTHOR.url} rel="author" className="font-bold text-ink underline underline-offset-2 hover:text-ink-2">
              {AUTHOR.name}
            </a>
            .
          </p>
          <p>Crawl Daddy, reprised. Powered by spite and a Vercel hobby plan.</p>
        </div>
      </div>
    </footer>
  );
}
