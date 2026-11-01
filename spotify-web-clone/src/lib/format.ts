/** 187 -> "3:07". Non-finite or negative input renders as "0:00". */
export function formatDuration(totalSeconds: number): string {
  const s = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

/** Decode a URL path segment without throwing on malformed input. */
export function safeDecode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
