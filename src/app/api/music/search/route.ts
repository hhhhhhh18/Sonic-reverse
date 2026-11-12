import { NextResponse, type NextRequest } from "next/server";
import { clientIdFromHeaders } from "@/lib/music/client-id";
import { searchMusic } from "@/lib/music/search-service";
import type { MusicErrorCode } from "@/lib/music/types";

export const dynamic = "force-dynamic";

const STATUS: Record<MusicErrorCode, number> = {
  invalid_query: 400,
  not_configured: 503,
  rate_limited: 429,
  quota_exceeded: 503,
  upstream_error: 502,
};

/** GET /api/music/search?q=<query>[&pageToken=<token>] -> normalized song results. */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const outcome = await searchMusic(searchParams.get("q") ?? "", {
    pageToken: searchParams.get("pageToken") ?? undefined,
    clientId: clientIdFromHeaders(request.headers),
  });

  if (outcome.ok) {
    return NextResponse.json(outcome.data, { headers: { "Cache-Control": "private, max-age=60" } });
  }
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (outcome.error.retryAfterSec) headers["Retry-After"] = String(outcome.error.retryAfterSec);
  return NextResponse.json({ error: outcome.error }, { status: STATUS[outcome.error.code], headers });
}
