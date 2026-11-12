import type { MusicTrack } from "./types";

export interface DerivedGroup {
  name: string;
  tracks: MusicTrack[];
}

function groupBy(tracks: MusicTrack[], namesOf: (track: MusicTrack) => string[], limit: number) {
  const groups = new Map<string, DerivedGroup>();
  for (const track of tracks) {
    for (const name of namesOf(track)) {
      const key = name.normalize("NFC").toLowerCase();
      const group = groups.get(key) ?? { name, tracks: [] };
      group.tracks.push(track);
      groups.set(key, group);
    }
  }
  // Most-represented first; ties keep their first-seen order (sort is stable).
  return Array.from(groups.values())
    .sort((a, b) => b.tracks.length - a.tracks.length)
    .slice(0, limit);
}

/** Artists found in the result set. Free: no extra API calls. */
export function deriveArtists(tracks: MusicTrack[], limit = 12): DerivedGroup[] {
  return groupBy(tracks, (t) => t.artists, limit);
}

/** Albums/movies found in the result set. Free: no extra API calls. */
export function deriveAlbums(tracks: MusicTrack[], limit = 12): DerivedGroup[] {
  return groupBy(tracks, (t) => (t.album ? [t.album] : []), limit);
}
