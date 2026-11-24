"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "./AuthProvider";

/**
 * Keeps this tab's header in step when the account changes elsewhere (for example,
 * signing out in another tab). Best effort: browsers only tell us when the tab regains
 * focus, so a stale tab may need that nudge. It only refreshes the page; it never
 * handles credentials. The session itself is managed by cookies and proxy.ts.
 */
export function AuthListener() {
  const { enabled, browser, user } = useAuth();
  const router = useRouter();
  const knownUserId = useRef<string | null>(user?.id ?? null);
  const url = browser?.url;
  const key = browser?.key;

  useEffect(() => {
    knownUserId.current = user?.id ?? null;
  });

  useEffect(() => {
    if (!enabled || !url || !key) return;
    const supabase = createSupabaseBrowserClient({ url, key });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") return;
      if ((session?.user.id ?? null) !== knownUserId.current) router.refresh();
    });
    return () => data.subscription.unsubscribe();
  }, [enabled, url, key, router]);

  return null;
}
