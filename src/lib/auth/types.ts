/** The signed-in user as the UI needs it. Contains no tokens or secrets. */
export interface AuthUser {
  id: string;
  email: string | null;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
}

/** A row of public.profiles. */
export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

/** What the root layout hands to the client: public config only. */
export interface AuthState {
  /** False when Supabase isn't configured: the app then behaves exactly as before accounts existed. */
  enabled: boolean;
  user: AuthUser | null;
  /** Public project URL + publishable/anon key for the browser client, or null if disabled. */
  browser: { url: string; key: string } | null;
}

export const SIGNED_OUT: AuthState = { enabled: false, user: null, browser: null };
