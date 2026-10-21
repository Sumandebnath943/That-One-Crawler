import { NextResponse, type NextRequest } from "next/server";
import { GUIDES } from "@/lib/content/guides";

const SLUGS = new Set(GUIDES.map((g) => g.slug));

/**
 * Unknown /checks/<slug> URLs get a real 404 status. (Streamed pages can only send a "soft"
 * 404 with noindex once rendering has started; search engines prefer the real thing.)
 */
export function proxy(request: NextRequest) {
  const slug = request.nextUrl.pathname.split("/")[2] ?? "";
  if (SLUGS.has(slug)) return NextResponse.next();
  return NextResponse.rewrite(new URL("/__not-found", request.url), { status: 404 });
}

export const config = {
  matcher: "/checks/:slug",
};
