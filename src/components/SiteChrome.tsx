import Link from "next/link";
import { Mascot } from "./Mascot";
import { ThemeToggle } from "./ThemeToggle";

const REPO_URL = "https://github.com/Sumandebnath943/That-One-Crawler";

export function SiteHeader({ landing = false }: { landing?: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b-2 border-ink bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2" aria-label="That One Crawler home">
          <Mascot className="size-10 transition group-hover:rotate-6" />
          <span className="font-display text-lg font-extrabold tracking-tight sm:text-xl">That One Crawler</span>
        </Link>
        <nav className="ml-auto flex items-center gap-1 text-sm font-semibold sm:gap-2">
          {landing ? (
            <>
              <a href="#judged" className="hidden rounded-full px-3 py-2 hover:bg-sunk md:block">
                What we judge
              </a>
              <a href="#faq" className="hidden rounded-full px-3 py-2 hover:bg-sunk md:block">
                FAQ
              </a>
            </>
          ) : (
            <Link href="/" className="rounded-full px-3 py-2 hover:bg-sunk">
              New scan
            </Link>
          )}
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="hidden rounded-full px-3 py-2 hover:bg-sunk sm:block"
          >
            GitHub
          </a>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t-2 border-ink bg-card">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-ink-2 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="font-semibold text-ink">Nothing escapes. Not even that one bad blog post from 2021.</p>
        <p>
          Crawl Daddy, reprised. Powered by spite and a Vercel hobby plan ·{" "}
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink">
            Source
          </a>
        </p>
      </div>
    </footer>
  );
}
