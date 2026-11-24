/**
 * Sanitizes a post-login "next" destination so it can only ever be a path on
 * this site (prevents open redirects such as ?next=//evil.example or ?next=https://evil.example).
 */
export function safeNextPath(raw: unknown, fallback = "/"): string {
  if (typeof raw !== "string") return fallback;
  const value = raw.trim();
  if (value.length === 0 || value.length > 512) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return fallback;
  try {
    const parsed = new URL(value, "http://localhost");
    if (parsed.origin !== "http://localhost") return fallback;
    // Look at what the path means once decoded, too: %0d%0a, %5c and %2f%2f are the same tricks in disguise.
    let decoded: string;
    try {
      decoded = decodeURIComponent(parsed.pathname);
    } catch {
      return fallback;
    }
    if (/[\u0000-\u001f\u007f\\]/.test(decoded) || decoded.startsWith("//")) return fallback;
    const path = parsed.pathname + parsed.search + parsed.hash;
    // Avoid bouncing between the auth pages themselves.
    if (/^\/(?:login|register)(?:[/?#]|$)/.test(path)) return fallback;
    return path;
  } catch {
    return fallback;
  }
}

/** Paths that require a signed-in user. */
export function isProtectedPath(pathname: string): boolean {
  return pathname === "/account" || pathname.startsWith("/account/");
}

/** Builds /login?next=... for a protected path. */
export function loginUrlFor(pathWithSearch: string): string {
  return `/login?next=${encodeURIComponent(safeNextPath(pathWithSearch, "/account"))}`;
}
