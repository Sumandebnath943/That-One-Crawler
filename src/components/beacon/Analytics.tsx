"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { applyOptOutParam, isOptedOut } from "@/lib/client/beacon-events";
import { GA_ID } from "@/lib/site";

// Google Analytics 4 (GA_ID in lib/site.ts). It honours the same opt-out as the
// visitor beacon (the Privacy page switch, or ?notrack=1), and stays off on localhost.

export function Analytics() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!GA_ID || !/^G-[A-Z0-9]{4,20}$/.test(GA_ID)) return;
    applyOptOutParam();
    if (isOptedOut() || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) return;
    // A tick later, so the decision above doesn't render during the effect itself.
    const timer = setTimeout(() => setEnabled(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!enabled || !GA_ID) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga4" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag("js",new Date());gtag("config","${GA_ID}");`}
      </Script>
    </>
  );
}
