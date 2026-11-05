export interface Artist {
  id: string;
  name: string;
}
export interface Album {
  id: string;
  title: string;
  artistIds: string[];
  year: number;
}
export interface Track {
  id: string;
  title: string;
  artistIds: string[];
  albumId: string;
  durationSec: number;
}
export interface Playlist {
  id: string;
  title: string;
  owner: string;
  trackIds: string[];
}
export interface Show {
  id: string;
  title: string;
  publisher: string;
}
export interface Episode {
  id: string;
  title: string;
  showId: string;
  dateLabel: string;
  durationSec: number;
  isNew?: boolean;
}
export interface Profile {
  id: string;
  name: string;
}

/** Anything the mock player can play (songs and podcast episodes). */
export interface PlayableItem {
  id: string;
  title: string;
  byline: string;
  durationSec: number;
  coverSeed: string;
  kind: "track" | "episode";
}

export type EntityKind = "artist" | "track" | "album" | "playlist" | "show" | "episode" | "profile";
