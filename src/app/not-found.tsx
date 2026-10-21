import Link from "next/link";
import { Mascot } from "@/components/Mascot";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="dots flex flex-1 items-center">
        <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-16 text-center sm:px-6">
          <Mascot pokeable mood="shocked" className="size-36" title="A very surprised crawler" />
          <p className="mt-6 font-mono text-sm font-bold text-crit">Broken page (404)</p>
          <h1 className="mt-2 font-display text-5xl font-extrabold tracking-tight text-balance sm:text-6xl">
            This page got crawled into oblivion.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-ink-2">
            We looked everywhere. Finding missing things is literally our job, and still nothing. If we were scanning
            ourselves, this would be a critical issue.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/"
              className="rounded-xl border-2 border-ink bg-lime px-5 py-2.5 font-display font-extrabold text-lime-ink shadow-brutal-sm transition hover:-translate-y-0.5"
            >
              Take me home
            </Link>
            <Link
              href="/scan"
              className="rounded-xl border-2 border-ink bg-card px-5 py-2.5 font-display font-extrabold shadow-brutal-sm transition hover:-translate-y-0.5"
            >
              Scan something that exists
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
