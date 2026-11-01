import {
  albums,
  artists,
  episodes,
  playlists,
  profiles,
  shows,
  tracks,
} from "@/data/catalog";
import type {
  Album,
  Artist,
  Episode,
  PlayableItem,
  Playlist,
  Profile,
  Show,
  Track,
} from "@/data/types";

function indexById<T extends { id: string }>(list: T[]): Map<string, T> {
  return new Map(list.map((item) => [item.id, item]));
}

const artistMap = indexById(artists);
const albumMap = indexById(albums);
const trackMap = indexById(tracks);
const showMap = indexById(shows);

export function getArtist(id: string): Artist {
  const found = artistMap.get(id);
  if (!found) throw new Error(`Unknown artist id: ${id}`);
  return found;
}
export function getAlbum(id: string): Album {
  const found = albumMap.get(id);
  if (!found) throw new Error(`Unknown album id: ${id}`);
  return found;
}
export function getTrack(id: string): Track {
  const found = trackMap.get(id);
  if (!found) throw new Error(`Unknown track id: ${id}`);
  return found;
}
export function getShow(id: string): Show {
  const found = showMap.get(id);
  if (!found) throw new Error(`Unknown show id: ${id}`);
  return found;
}

export function artistNames(ids: string[]): string {
  return ids.map((id) => getArtist(id).name).join(", ");
}

/** Placeholder-artwork seeds. Tracks share their album's artwork. */
export const coverSeed = {
  artist: (id: string) => `artist:${id}`,
  album: (id: string) => `album:${id}`,
  track: (t: Track) => `album:${t.albumId}`,
  playlist: (id: string) => `playlist:${id}`,
  show: (id: string) => `show:${id}`,
  profile: (id: string) => `profile:${id}`,
};

export function trackToPlayable(track: Track): PlayableItem {
  return {
    id: track.id,
    title: track.title,
    byline: artistNames(track.artistIds),
    durationSec: track.durationSec,
    coverSeed: coverSeed.track(track),
    kind: "track",
  };
}

export function episodeToPlayable(episode: Episode): PlayableItem {
  const show = getShow(episode.showId);
  return {
    id: episode.id,
    title: episode.title,
    byline: show.title,
    durationSec: episode.durationSec,
    coverSeed: coverSeed.show(show.id),
    kind: "episode",
  };
}

/** Play queues for the "play" button on each kind of card. */
export const queues = {
  album: (id: string): PlayableItem[] =>
    tracks.filter((t) => t.albumId === id).map(trackToPlayable),
  artist: (id: string): PlayableItem[] =>
    tracks.filter((t) => t.artistIds.includes(id)).map(trackToPlayable),
  playlist: (pl: Playlist): PlayableItem[] =>
    pl.trackIds.map((id) => trackToPlayable(getTrack(id))),
  show: (id: string): PlayableItem[] =>
    episodes.filter((e) => e.showId === id).map(episodeToPlayable),
};

export const profileList: Profile[] = profiles;
export { albums, artists, episodes, playlists, shows, tracks };
