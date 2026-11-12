import type { PlayableItem } from "@/data/types";
import type { MusicTrack } from "./types";

/** "Artist, Artist" when known, otherwise the uploading channel (never an invented artist). */
export function musicTrackByline(track: MusicTrack): string {
  return track.artists.length > 0 ? track.artists.join(", ") : track.channelTitle;
}

export function musicTrackToPlayable(track: MusicTrack): PlayableItem {
  return {
    id: `yt:${track.videoId}`,
    title: track.title,
    byline: musicTrackByline(track),
    durationSec: track.durationSec,
    coverSeed: `yt:${track.videoId}`,
    kind: "track",
    videoId: track.videoId,
    ...(track.thumbnailUrl ? { artworkUrl: track.thumbnailUrl } : {}),
  };
}
