/** A song-like result from YouTube, normalized for the UI. Only videoId/title are guaranteed. */
export interface MusicTrack {
  videoId: string;
  title: string;
  /** Credited names parsed from the title/description. May be empty (never guessed). */
  artists: string[];
  /** Album or movie name when the metadata states one. */
  album: string | null;
  channelTitle: string;
  thumbnailUrl: string | null;
  durationSec: number;
}

export interface MusicSearchResponse {
  query: string;
  tracks: MusicTrack[];
  nextPageToken: string | null;
  /** True when served from the server-side cache (no YouTube quota used). */
  cached: boolean;
}

export type MusicErrorCode =
  | "invalid_query"
  | "not_configured"
  | "rate_limited"
  | "quota_exceeded"
  | "upstream_error";

export interface MusicSearchError {
  code: MusicErrorCode;
  /** Safe to show to users; never contains keys, URLs or upstream bodies. */
  message: string;
  retryAfterSec?: number;
}

export type MusicSearchOutcome =
  | { ok: true; data: MusicSearchResponse }
  | { ok: false; error: MusicSearchError };
