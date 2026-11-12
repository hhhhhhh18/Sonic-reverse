import { TtlCache } from "./cache";
import { readMusicConfig, type MusicConfig } from "./config";
import { MAX_QUERY_LENGTH, MIN_QUERY_LENGTH } from "./limits";
import { RateLimiter } from "./rate-limit";
import type { MusicErrorCode, MusicSearchOutcome, MusicSearchResponse } from "./types";
import { searchYouTube, YouTubeApiError } from "./youtube";

const QUOTA_BLOCK_MS = 10 * 60 * 1000;
const PAGE_TOKEN = /^[A-Za-z0-9_-]{1,100}$/;

type Validated = { ok: true; query: string } | { ok: false; message: string };

/** Trim, strip control characters, collapse whitespace, enforce length (in code points). */
export function validateQuery(raw: unknown): Validated {
  if (typeof raw !== "string") return { ok: false, message: "A search query is required." };
  const query = raw.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  const length = Array.from(query).length;
  if (length < MIN_QUERY_LENGTH) {
    return { ok: false, message: `Type at least ${MIN_QUERY_LENGTH} characters to search.` };
  }
  if (length > MAX_QUERY_LENGTH) {
    return { ok: false, message: `Search is limited to ${MAX_QUERY_LENGTH} characters.` };
  }
  return { ok: true, query };
}

function fail(code: MusicErrorCode, message: string, retryAfterSec?: number): MusicSearchOutcome {
  return { ok: false, error: { code, message, ...(retryAfterSec ? { retryAfterSec } : {}) } };
}

/** YouTube quota resets at midnight Pacific time, so the daily budget follows that clock. */
function pacificDay(ms: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

export interface MusicServiceDeps {
  readConfig?: () => MusicConfig;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

export function createMusicSearchService(deps: MusicServiceDeps = {}) {
  const readConfig = deps.readConfig ?? (() => readMusicConfig());
  const now = deps.now ?? Date.now;
  const initial = readConfig();

  const cache = new TtlCache<MusicSearchResponse>(200, initial.cacheTtlMs, now);
  const limiter = new RateLimiter(initial.rateLimitPerMinute, 60_000, now);
  const inflight = new Map<string, Promise<MusicSearchOutcome>>();
  const budget = { day: "", used: 0 };
  let quotaBlockedUntil = 0;

  async function search(
    rawQuery: string,
    options: { pageToken?: string; clientId?: string } = {},
  ): Promise<MusicSearchOutcome> {
    const valid = validateQuery(rawQuery);
    if (!valid.ok) return fail("invalid_query", valid.message);
    const query = valid.query;

    const pageToken = options.pageToken;
    if (pageToken !== undefined && !PAGE_TOKEN.test(pageToken)) {
      return fail("invalid_query", "Invalid page token.");
    }

    const config = readConfig();
    if (!config.apiKey) {
      return fail("not_configured", config.disabledReason ?? "Real music search isn't configured.");
    }
    const apiKey = config.apiKey;

    const cacheKey = `${config.regionCode}|${query.normalize("NFC").toLowerCase()}|${pageToken ?? ""}`;
    const hit = cache.get(cacheKey);
    if (hit) return { ok: true, data: { ...hit, cached: true } };

    if (now() < quotaBlockedUntil) {
      return fail("quota_exceeded", "YouTube search is paused because the daily quota was reached.");
    }

    const pending = inflight.get(cacheKey);
    if (pending) return pending;

    const gate = limiter.check(options.clientId ?? "local");
    if (!gate.allowed) {
      return fail("rate_limited", "Too many searches. Please wait a moment.", gate.retryAfterSec);
    }

    const today = pacificDay(now());
    if (budget.day !== today) {
      budget.day = today;
      budget.used = 0;
    }
    if (config.dailyBudget > 0 && budget.used >= config.dailyBudget) {
      return fail("quota_exceeded", "The daily search budget has been used up. It resets at midnight Pacific time.");
    }
    budget.used += 1;

    const run = (async (): Promise<MusicSearchOutcome> => {
      try {
        const result = await searchYouTube({
          query,
          pageToken,
          regionCode: config.regionCode,
          apiKey,
          baseUrl: config.baseUrl,
          keyInQuery: config.keyInQuery,
          fetchImpl: deps.fetchImpl,
        });
        const data: MusicSearchResponse = {
          query,
          tracks: result.tracks,
          nextPageToken: result.nextPageToken,
          cached: false,
        };
        cache.set(cacheKey, data);
        return { ok: true, data };
      } catch (error) {
        if (error instanceof YouTubeApiError) {
          if (error.code === "quota_exceeded") quotaBlockedUntil = now() + QUOTA_BLOCK_MS;
          return fail(error.code, error.message);
        }
        return fail("upstream_error", "Search failed unexpectedly.");
      } finally {
        inflight.delete(cacheKey);
      }
    })();

    inflight.set(cacheKey, run);
    return run;
  }

  return { search };
}

type MusicSearchService = ReturnType<typeof createMusicSearchService>;
const SERVICE_KEY = Symbol.for("web-player-clone.music-search-service");

/** Process-wide singleton; stored on globalThis so dev hot-reloads don't reset cache/limits. */
export function getMusicSearchService(): MusicSearchService {
  const store = globalThis as unknown as Record<symbol, MusicSearchService | undefined>;
  return (store[SERVICE_KEY] ??= createMusicSearchService());
}

export function searchMusic(
  rawQuery: string,
  options?: { pageToken?: string; clientId?: string },
): Promise<MusicSearchOutcome> {
  return getMusicSearchService().search(rawQuery, options);
}
