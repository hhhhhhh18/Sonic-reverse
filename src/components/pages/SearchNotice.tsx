import type { MusicSearchError } from "@/lib/music/types";

/** Explains why demo results are showing instead of real ones. Never silent. */
export function SearchNotice({ error }: { error: MusicSearchError }) {
  let detail = error.message;
  if (error.code === "not_configured") detail += " Real music search needs a YouTube API key (see the README).";
  if (error.code === "rate_limited" && error.retryAfterSec) detail += ` Try again in ${error.retryAfterSec}s.`;

  return (
    <p role="note" className="mb-6 rounded-md bg-elevated px-4 py-3 text-sm text-subtle">
      <span className="font-bold text-white">Showing demo results. </span>
      {detail}
    </p>
  );
}
