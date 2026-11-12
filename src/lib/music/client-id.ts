/**
 * Best-effort client identifier for rate limiting. x-forwarded-for is only
 * trustworthy behind a proxy you control (Vercel etc.); otherwise it is spoofable.
 */
export function clientIdFromHeaders(headers: { get(name: string): string | null }): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || headers.get("x-real-ip")?.trim() || "local";
  return ip.slice(0, 64);
}
