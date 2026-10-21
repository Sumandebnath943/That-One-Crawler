import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { GlobalQuirks } from "@/components/quirks/GlobalQuirks";
import { AUTHOR, HOME_TITLE, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"] });

export const metadata: Metadata = {
  // Canonical URLs and social images always point at the production domain.
  metadataBase: new URL(SITE_URL),
  title: { default: HOME_TITLE, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: AUTHOR.name, url: AUTHOR.url }],
  creator: AUTHOR.name,
  publisher: AUTHOR.name,
  category: "technology",
  keywords: [
    "free SEO audit tool",
    "blog SEO checker",
    "website SEO audit",
    "SEO crawler",
    "broken link checker",
    "keyword cannibalization checker",
    "GEO checker",
    "AEO checker",
    "AI search readiness",
    "meta tag checker",
  ],
  // Let search engines and AI tools show full snippets and large image previews.
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large", "max-video-preview": -1 },
  },
  openGraph: {
    title: HOME_TITLE,
    description: "Your blog has issues. This free SEO audit finds every single one, for Google and for AI search.",
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    url: "/",
  },
  twitter: { card: "summary_large_image", title: HOME_TITLE, description: SITE_DESCRIPTION },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f1e6" },
    { media: "(prefers-color-scheme: dark)", color: "#12110e" },
  ],
};

// Runs before paint so dark-mode visitors don't get flashed with paper-white,
// and Crawl Daddy mode (an easter egg) survives page loads within the visit.
const themeScript = `(function(){try{var t=localStorage.getItem("toc-theme");var d=t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d);if(sessionStorage.getItem("toc-daddy")==="1")document.documentElement.classList.add("daddy")}catch(e){}})()`;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col bg-paper font-sans text-ink">
        {children}
        <GlobalQuirks />
      </body>
    </html>
  );
}
