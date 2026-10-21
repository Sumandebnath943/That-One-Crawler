import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { ScanWorkspace } from "@/components/scan/ScanWorkspace";

export const metadata: Metadata = {
  title: "Scan",
  robots: { index: false },
};

function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="h-32 animate-pulse rounded-2xl border-2 border-line bg-card" />
    </div>
  );
}

export default function ScanPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Suspense fallback={<Loading />}>
          <ScanWorkspace />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
