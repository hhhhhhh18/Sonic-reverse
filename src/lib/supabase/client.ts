import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseConfig } from "./config";

/**
 * Supabase client for the browser. Only used to listen for auth changes (for
 * example signing out in another tab). Sign-in itself happens in Server Actions.
 * The config contains only the public URL and publishable/anon key.
 */
export function createSupabaseBrowserClient(config: SupabaseConfig) {
  return createBrowserClient(config.url, config.key);
}
