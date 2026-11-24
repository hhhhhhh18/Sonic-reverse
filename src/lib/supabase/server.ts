import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { isSecureRequest } from "@/lib/auth/origin";
import type { SupabaseConfig } from "./config";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * Create a NEW one per request: it is bound to that request's cookies and must
 * not be shared or cached across requests.
 */
export async function createSupabaseServerClient(config: SupabaseConfig) {
  const cookieStore = await cookies();
  const requestHeaders = await headers();
  return createServerClient(config.url, config.key, {
    cookieOptions: {
      secure: isSecureRequest({
        forwardedProto: requestHeaders.get("x-forwarded-proto"),
        origin: requestHeaders.get("origin"),
      }),
    },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component, where cookies are read-only. That is fine:
          // proxy.ts refreshes the session and writes the cookies on every request.
        }
      },
    },
  });
}
