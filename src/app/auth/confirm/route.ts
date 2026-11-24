import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { resolveOrigin } from "@/lib/auth/origin";
import { safeNextPath } from "@/lib/auth/redirect";
import { getSupabaseConfig, readEnv } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const OTP_TYPES: readonly EmailOtpType[] = ["signup", "email", "magiclink", "recovery", "invite", "email_change"];

/**
 * Optional alternative for email links: works even when the link is opened on a different
 * device or browser than the one that signed up (the PKCE code in /auth/callback can't).
 * To use it, point your Supabase email templates at
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/account
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

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const config = getSupabaseConfig();
  if (!config.ok || !tokenHash || !type || !OTP_TYPES.includes(type)) return to("/login?error=confirm");

  const supabase = await createSupabaseServerClient(config.config);
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) return to("/login?error=confirm");
  return to(safeNextPath(searchParams.get("next"), "/"));
}
