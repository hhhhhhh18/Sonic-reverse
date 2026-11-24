import { connection } from "next/server";
import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { SIGNED_OUT, type AuthState, type Profile } from "@/lib/auth/types";
import { getSupabaseConfig, type SupabaseConfig } from "./config";
import { createSupabaseServerClient } from "./server";

type ProfileSummary = Pick<Profile, "username" | "display_name" | "avatar_url">;

/**
 * Who is signed in, for rendering navigation. Cached per request.
 *
 * Uses getClaims() (signature-verified; local with asymmetric signing keys). It fails
 * closed: any Supabase problem means "signed out", so a Supabase outage can never break
 * the music app itself.
 */
export const getAuthState = cache(async (): Promise<AuthState> => {
  // Render per request. Supabase settings are read at runtime and the header depends on the visitor's
  // cookies, so this must never be frozen into a page prerendered at build time.
  await connection();
  const config = getSupabaseConfig();
  if (!config.ok) return SIGNED_OUT;
  const browser = { url: config.config.url, key: config.config.key };

  try {
    const supabase = await createSupabaseServerClient(config.config);
    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims;
    if (!claims?.sub) return { enabled: true, user: null, browser };

    const { data: row } = await supabase
      .from("profiles")
      .select("username, display_name, avatar_url")
      .eq("id", claims.sub)
      .maybeSingle();
    const profile = row as ProfileSummary | null;
    const email = typeof claims.email === "string" ? claims.email : null;
    return {
      enabled: true,
      browser,
      user: {
        id: claims.sub,
        email,
        username: profile?.username ?? null,
        displayName: profile?.display_name || profile?.username || email?.split("@")[0] || "Account",
        avatarUrl: profile?.avatar_url ?? null,
      },
    };
  } catch {
    return { enabled: true, user: null, browser };
  }
});

export type VerifiedUser =
  | { configured: false }
  | { configured: true; config: SupabaseConfig; user: User | null; supabase: Awaited<ReturnType<typeof createSupabaseServerClient>> };

/**
 * For pages and actions that act on the user's behalf. Unlike getAuthState() this asks
 * the Supabase Auth server to validate the session (getUser()), so a revoked session
 * is rejected immediately.
 */
export async function getVerifiedUser(): Promise<VerifiedUser> {
  const config = getSupabaseConfig();
  if (!config.ok) return { configured: false };
  const supabase = await createSupabaseServerClient(config.config);
  try {
    const { data } = await supabase.auth.getUser();
    return { configured: true, config: config.config, supabase, user: data.user };
  } catch {
    return { configured: true, config: config.config, supabase, user: null };
  }
}
