/**
 * Supabase connection settings, read from environment variables.
 *
 * Only PUBLIC values belong here (project URL + publishable/anon key). The
 * service_role / secret key must never be configured in this app; if one is put
 * in a public variable by mistake it is rejected rather than used.
 */
export interface SupabaseConfig {
  url: string;
  key: string;
}

export type SupabaseConfigResult =
  | { ok: true; config: SupabaseConfig }
  | { ok: false; reason: "missing" | "invalid"; message: string };

const PLACEHOLDER = /^(?:your|change[-_ ]?me|replace|todo|xxx|<)/i;

/** The role claim of a JWT-style key, or null if it isn't a decodable JWT. */
function jwtRole(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const json = Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    const role = (JSON.parse(json) as { role?: unknown }).role;
    return typeof role === "string" ? role : null;
  } catch {
    return null;
  }
}

function isLoopback(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

/** Pure validation (no environment access) so it can be tested and reused. */
export function parseSupabaseConfig(input: {
  url?: string;
  publishableKey?: string;
  anonKey?: string;
}): SupabaseConfigResult {
  const rawUrl = (input.url ?? "").trim();
  // The new publishable key wins if both are set; the legacy anon key still works.
  const key = (input.publishableKey ?? "").trim() || (input.anonKey ?? "").trim();

  if (!rawUrl || PLACEHOLDER.test(rawUrl)) {
    return { ok: false, reason: "missing", message: "NEXT_PUBLIC_SUPABASE_URL isn't set." };
  }
  if (!key || PLACEHOLDER.test(key)) {
    return {
      ok: false,
      reason: "missing",
      message: "NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) isn't set.",
    };
  }

  let origin: string;
  try {
    const url = new URL(rawUrl);
    const ok = url.protocol === "https:" || (url.protocol === "http:" && isLoopback(url.hostname));
    if (!ok) throw new Error("scheme");
    origin = url.origin;
  } catch {
    return {
      ok: false,
      reason: "invalid",
      message: "NEXT_PUBLIC_SUPABASE_URL must be an https:// URL such as https://<project-ref>.supabase.co.",
    };
  }

  if (key.startsWith("sb_secret_") || jwtRole(key) === "service_role") {
    return {
      ok: false,
      reason: "invalid",
      message:
        "A secret/service_role key was found in a public variable. Use the publishable/anon key instead; the service_role key must never be used in this app.",
    };
  }
  if (key.length < 20) {
    return { ok: false, reason: "invalid", message: "The Supabase key looks too short to be valid." };
  }
  return { ok: true, config: { url: origin, key } };
}

/**
 * Reads an environment variable by a computed name. This is deliberate:
 * Next.js inlines static `process.env.NEXT_PUBLIC_*` reads at BUILD time, which
 * would freeze the values into the build. Reading by name keeps them runtime
 * settings, so changing `.env.local` only needs a server restart. The browser
 * receives the (public) values from the server as props instead.
 */
export function readEnv(name: string): string | undefined {
  return process.env[name];
}

export function getSupabaseConfig(): SupabaseConfigResult {
  return parseSupabaseConfig({
    url: readEnv("NEXT_PUBLIC_SUPABASE_URL"),
    publishableKey: readEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    anonKey: readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  });
}
