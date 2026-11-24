import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSecureRequest } from "@/lib/auth/origin";
import { isProtectedPath, loginUrlFor } from "@/lib/auth/redirect";
import { getSupabaseConfig } from "./config";

const CACHE_HEADERS = ["cache-control", "expires", "pragma"];

/**
 * Runs on every page request (from proxy.ts):
 *  1. refreshes an expiring session and writes the new cookies to the response,
 *  2. optimistically redirects signed-out visitors away from protected pages.
 *
 * Step 2 is a convenience, not the security boundary: pages and the database
 * (Row Level Security) enforce access again.
 *
 * It uses getClaims(), which verifies the token's signature, rather than
 * getSession(), whose cookie contents must not be trusted on the server.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const config = getSupabaseConfig();
  if (!config.ok) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(config.config.url, config.config.key, {
    cookieOptions: {
      secure: isSecureRequest({
        protocol: request.nextUrl.protocol,
        forwardedProto: request.headers.get("x-forwarded-proto"),
      }),
    },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        // Make refreshed tokens visible to the rest of this request, then to the browser.
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        // Responses that set auth cookies must never be cached by a CDN.
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      },
    },
  });

  let signedIn = false;
  try {
    const { data } = await supabase.auth.getClaims();
    signedIn = Boolean(data?.claims?.sub);
  } catch {
    signedIn = false; // Supabase unreachable: treat as signed out, never crash the page.
  }

  const { pathname, search } = request.nextUrl;
  if (!signedIn && isProtectedPath(pathname)) {
    const redirect = NextResponse.redirect(new URL(loginUrlFor(pathname + search), request.url));
    // Keep any cookie changes (e.g. clearing an invalid session) on the redirect too.
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    for (const name of CACHE_HEADERS) {
      const value = response.headers.get(name);
      if (value) redirect.headers.set(name, value);
    }
    return redirect;
  }
  return response;
}
