export interface MusicConfig {
  /** null when search is unavailable; see disabledReason. */
  apiKey: string | null;
  disabledReason: string | null;
  regionCode: string;
  cacheTtlMs: number;
  rateLimitPerMinute: number;
  /** Max upstream searches per Pacific day (YouTube quota resets at midnight PT). 0 = no guard. */
  dailyBudget: number;
  baseUrl: string;
  /** Troubleshooting only: send the key as ?key= instead of the x-goog-api-key header. */
  keyInQuery: boolean;
}

export const DEFAULT_YOUTUBE_BASE_URL = "https://www.googleapis.com/youtube/v3";
const PLACEHOLDER_KEY = /^(?:your|change[-_ ]?me|replace|todo|xxx|<)/i;

function intFromEnv(raw: string | undefined, fallback: number, min: number, max: number): number {
  const n = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

/** Only loopback URLs may override the API host (used by tests), so the key can't be redirected off-machine. */
function resolveBaseUrl(raw: string | undefined): string {
  if (!raw) return DEFAULT_YOUTUBE_BASE_URL;
  try {
    const url = new URL(raw);
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    return loopback && (url.protocol === "http:" || url.protocol === "https:")
      ? raw.replace(/\/+$/, "")
      : DEFAULT_YOUTUBE_BASE_URL;
  } catch {
    return DEFAULT_YOUTUBE_BASE_URL;
  }
}

export function readMusicConfig(
  env: Record<string, string | undefined> = process.env,
): MusicConfig {
  const provider = (env.MUSIC_PROVIDER ?? "youtube").trim().toLowerCase();
  const rawKey = (env.YOUTUBE_API_KEY ?? "").trim();

  let apiKey: string | null = null;
  let disabledReason: string | null = null;
  if (provider === "mock") disabledReason = "Real music search is turned off (MUSIC_PROVIDER=mock).";
  else if (!rawKey || PLACEHOLDER_KEY.test(rawKey)) disabledReason = "YOUTUBE_API_KEY isn't set.";
  else apiKey = rawKey;

  const region = (env.YOUTUBE_REGION_CODE ?? "IN").trim().toUpperCase();
  return {
    apiKey,
    disabledReason,
    regionCode: /^[A-Z]{2}$/.test(region) ? region : "IN",
    cacheTtlMs: intFromEnv(env.MUSIC_CACHE_TTL_SECONDS, 21600, 60, 604800) * 1000,
    rateLimitPerMinute: intFromEnv(env.MUSIC_RATE_LIMIT_PER_MIN, 20, 1, 600),
    dailyBudget: intFromEnv(env.MUSIC_DAILY_SEARCH_BUDGET, 90, 0, 100000),
    baseUrl: resolveBaseUrl(env.YOUTUBE_API_BASE_URL),
    keyInQuery: (env.YOUTUBE_KEY_TRANSPORT ?? "").trim().toLowerCase() === "query",
  };
}
