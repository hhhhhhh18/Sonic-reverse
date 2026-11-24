import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";

/**
 * Runs before every page request.
 *
 * 1. Next.js answers 500 when a dynamic segment contains an undecodable
 *    percent-sequence (for example /search/%E0%A4%A). That can't come from the
 *    search box, which always encodes its input, but a hand-edited URL can, so
 *    send those requests to the normal not-found page (404) instead.
 * 2. Keeps the Supabase session fresh (and guards /account). It does nothing
 *    when Supabase isn't configured, and it never runs for /api/* so music search
 *    pays no extra latency.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const rawPath = new URL(request.url).pathname;
  try {
    decodeURIComponent(rawPath);
  } catch {
    return NextResponse.rewrite(new URL("/not-a-real-page", request.url));
  }
  if (pathname.startsWith("/api/")) return NextResponse.next();
  return updateSession(request);
}

export const config = {
  // Skip Next's own assets and static files; everything else is a page request.
  matcher: ["/((?!_next/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|woff2?)$).*)"],
};
