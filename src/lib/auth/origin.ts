/**
 * True when the browser reached us over HTTPS (directly, or through a proxy that says so).
 * Used to set the Secure flag on session cookies only where browsers will accept it.
 */
export function isSecureRequest(input: { protocol?: string | null; forwardedProto?: string | null; origin?: string | null }): boolean {
  if (input.protocol === "https:" || input.protocol === "https") return true;
  if (input.forwardedProto?.split(",")[0]?.trim() === "https") return true;
  return Boolean(input.origin?.startsWith("https://"));
}

function parseOrigin(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

/**
 * The public origin of this site, used for OAuth/email redirect URLs.
 * Order: explicit NEXT_PUBLIC_SITE_URL, the Origin header, forwarded headers, the Host header.
 * (Supabase still only honours URLs on your allow-list, so a spoofed header can't redirect elsewhere.)
 */
export function resolveOrigin(input: {
  siteUrl?: string | null;
  origin?: string | null;
  forwardedHost?: string | null;
  forwardedProto?: string | null;
  host?: string | null;
  fallback: string;
}): string {
  const explicit = parseOrigin(input.siteUrl);
  if (explicit) return explicit;
  const fromOrigin = parseOrigin(input.origin);
  if (fromOrigin) return fromOrigin;

  const host = input.forwardedHost?.split(",")[0]?.trim() || input.host?.trim();
  if (host) {
    const forwardedProto = input.forwardedProto?.split(",")[0]?.trim();
    const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
    const proto = forwardedProto === "http" || forwardedProto === "https" ? forwardedProto : local ? "http" : "https";
    const built = parseOrigin(`${proto}://${host}`);
    if (built) return built;
  }
  return parseOrigin(input.fallback) ?? "http://localhost:3000";
}
