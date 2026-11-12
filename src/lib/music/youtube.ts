import {
  decodeHtmlEntities,
  detectRelevanceLanguage,
  isLikelySong,
  isValidVideoId,
  parseIsoDuration,
  parseTrackMetadata,
  pickThumbnail,
} from "./parse";
import type { MusicTrack } from "./types";

export type YouTubeErrorCode = "quota_exceeded" | "not_configured" | "upstream_error";

export class YouTubeApiError extends Error {
  code: YouTubeErrorCode;
  status?: number;

  constructor(code: YouTubeErrorCode, message: string, status?: number) {
    super(message);
    this.name = "YouTubeApiError";
    this.code = code;
    this.status = status;
  }
}

interface SearchListResponse {
  items?: Array<{ id?: { videoId?: string } }>;
  nextPageToken?: string;
}

interface VideoItem {
  id?: string;
  snippet?: {
    title?: string;
    description?: string;
    channelTitle?: string;
    liveBroadcastContent?: string;
    thumbnails?: Record<string, { url?: string } | undefined>;
  };
  contentDetails?: { duration?: string };
  status?: { embeddable?: boolean };
}

interface ErrorBody {
  error?: {
    status?: string;
    errors?: Array<{ reason?: string }>;
    details?: Array<{ reason?: string }>;
  };
}

export interface SearchYouTubeParams {
  query: string;
  pageToken?: string;
  maxResults?: number;
  regionCode: string;
  apiKey: string;
  baseUrl: string;
  keyInQuery?: boolean;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

const QUOTA_REASONS = new Set([
  "quotaExceeded",
  "dailyLimitExceeded",
  "rateLimitExceeded",
  "userRateLimitExceeded",
  "RESOURCE_EXHAUSTED",
]);
const CONFIG_REASONS = new Set([
  "keyInvalid",
  "keyExpired",
  "ipRefererBlocked",
  "accessNotConfigured",
  "forbidden",
  "API_KEY_INVALID",
  "PERMISSION_DENIED",
  "SERVICE_DISABLED",
]);

function classifyFailure(status: number, body: ErrorBody | null): YouTubeApiError {
  const reasons = [
    ...(body?.error?.errors ?? []).map((e) => e.reason),
    ...(body?.error?.details ?? []).map((d) => d.reason),
    body?.error?.status,
  ].filter((r): r is string => typeof r === "string");

  // Messages are fixed strings on purpose: upstream bodies/URLs can echo request details.
  if (reasons.some((r) => QUOTA_REASONS.has(r))) {
    return new YouTubeApiError("quota_exceeded", "YouTube search quota has been reached.", status);
  }
  if (reasons.some((r) => CONFIG_REASONS.has(r))) {
    return new YouTubeApiError(
      "not_configured",
      "The YouTube API key was rejected, or the YouTube Data API isn't enabled for it.",
      status,
    );
  }
  return new YouTubeApiError("upstream_error", `YouTube returned an error (HTTP ${status}).`, status);
}

async function callApi<T>(
  path: string,
  query: Record<string, string>,
  p: SearchYouTubeParams,
): Promise<T> {
  const url = new URL(`${p.baseUrl}/${path}`);
  for (const [name, value] of Object.entries(query)) url.searchParams.set(name, value);

  const headers: Record<string, string> = { Accept: "application/json" };
  // Header by default so the key never lands in a URL (and so not in logs).
  if (p.keyInQuery) url.searchParams.set("key", p.apiKey);
  else headers["x-goog-api-key"] = p.apiKey;

  let response: Response;
  try {
    response = await (p.fetchImpl ?? fetch)(url, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(p.timeoutMs ?? 8000),
    });
  } catch {
    throw new YouTubeApiError("upstream_error", "Couldn't reach YouTube.");
  }

  if (!response.ok) {
    let body: ErrorBody | null = null;
    try {
      body = (await response.json()) as ErrorBody;
    } catch {
      /* non-JSON error body */
    }
    throw classifyFailure(response.status, body);
  }
  try {
    return (await response.json()) as T;
  } catch {
    throw new YouTubeApiError("upstream_error", "YouTube returned an unreadable response.");
  }
}

function toMusicTrack(item: VideoItem): MusicTrack | null {
  const videoId = item.id;
  const snippet = item.snippet;
  if (!isValidVideoId(videoId) || !snippet?.title) return null;
  if (item.status?.embeddable === false) return null; // can't be played in the IFrame player
  if (snippet.liveBroadcastContent && snippet.liveBroadcastContent !== "none") return null;

  const channelTitle = decodeHtmlEntities(snippet.channelTitle ?? "").trim();
  const meta = parseTrackMetadata({
    title: snippet.title,
    channelTitle,
    description: snippet.description,
  });
  return {
    videoId,
    title: meta.title,
    artists: meta.artists,
    album: meta.album,
    channelTitle,
    thumbnailUrl: pickThumbnail(snippet.thumbnails),
    durationSec: parseIsoDuration(item.contentDetails?.duration),
  };
}

/**
 * One search.list call (the expensive one) plus one videos.list call (1 unit,
 * up to 50 ids) for durations, the embeddable flag and full descriptions.
 */
export async function searchYouTube(
  p: SearchYouTubeParams,
): Promise<{ tracks: MusicTrack[]; nextPageToken: string | null }> {
  const maxResults = Math.min(25, Math.max(1, p.maxResults ?? 20));
  const language = detectRelevanceLanguage(p.query);

  const search = await callApi<SearchListResponse>(
    "search",
    {
      part: "snippet",
      type: "video",
      videoCategoryId: "10", // Music
      videoEmbeddable: "true",
      videoSyndicated: "true",
      maxResults: String(maxResults),
      q: p.query,
      regionCode: p.regionCode,
      ...(language ? { relevanceLanguage: language } : {}),
      ...(p.pageToken ? { pageToken: p.pageToken } : {}),
    },
    p,
  );

  const ids = Array.from(
    new Set((search.items ?? []).map((i) => i.id?.videoId).filter(isValidVideoId)),
  );
  const nextPageToken = search.nextPageToken ?? null;
  if (ids.length === 0) return { tracks: [], nextPageToken };

  const videos = await callApi<{ items?: VideoItem[] }>(
    "videos",
    { part: "snippet,contentDetails,status", id: ids.join(","), maxResults: "50" },
    p,
  );

  const byId = new Map((videos.items ?? []).map((v) => [v.id, v]));
  const mapped = ids
    .map((id) => byId.get(id))
    .map((v) => (v ? toMusicTrack(v) : null))
    .filter((t): t is MusicTrack => t !== null);

  // Drop jukeboxes/reactions/trailers, but never return an empty list if there were embeddable hits.
  const songs = mapped.filter((t) => isLikelySong(t.title, t.durationSec));
  return { tracks: songs.length > 0 ? songs : mapped, nextPageToken };
}
