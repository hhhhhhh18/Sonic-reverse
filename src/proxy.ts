import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js answers 500 when a dynamic segment contains an undecodable
 * percent-sequence (for example /search/%E0%A4%A). That can't come from the
 * search box, which always encodes its input, but a hand-edited URL can, so
 * send those requests to the normal not-found page (404) instead.
 */
export function proxy(request: NextRequest) {
  const rawPath = new URL(request.url).pathname;
  try {
    decodeURIComponent(rawPath);
  } catch {
    return NextResponse.rewrite(new URL("/not-a-real-page", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Skip Next's own assets; everything else is a page request.
  matcher: ["/((?!_next/|favicon.ico).*)"],
};
