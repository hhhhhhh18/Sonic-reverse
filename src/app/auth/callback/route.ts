import { NextResponse, type NextRequest } from "next/server";
import { resolveOrigin } from "@/lib/auth/origin";
import { safeNextPath } from "@/lib/auth/redirect";
import { getSupabaseConfig, readEnv } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Where Supabase sends the browser after Google sign-in and after an email confirmation
 * link (PKCE flow). Exchanges the one-time `code` for a session cookie, then redirects
 * to a sanitized `next` path.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const origin = resolveOrigin({
    siteUrl: readEnv("NEXT_PUBLIC_SITE_URL"),
    forwardedHost: request.headers.get("x-forwarded-host"),
    forwardedProto: request.headers.get("x-forwarded-proto"),
    host: request.headers.get("host"),
    fallback: request.nextUrl.origin,
  });
  const to = (path: string) => {
    const response = NextResponse.redirect(new URL(path, origin));
    response.headers.set("Cache-Control", "no-store");
    return response;
  };

  if (searchParams.get("error")) return to("/login?error=oauth"); // e.g. the user denied access
  const code = searchParams.get("code");
  const config = getSupabaseConfig();
  if (!config.ok || !code) return to("/login?error=callback");

  const supabase = await createSupabaseServerClient(config.config);
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return to("/login?error=callback");
  return to(safeNextPath(searchParams.get("next"), "/"));
}
