import type { EntityKind, Episode, Album, Artist, Playlist, Profile, Show, Track } from "@/data/types";
import {
  albums,
  artistNames,
  artists,
  episodes,
  getAlbum,
  getShow,
  playlists,
  shows,
  tracks,
} from "@/lib/catalog";
import { profileList } from "@/lib/catalog";

export type TopResult =
  | { kind: "artist"; item: Artist }
  | { kind: "track"; item: Track }
  | { kind: "album"; item: Album }
  | { kind: "playlist"; item: Playlist }
  | { kind: "show"; item: Show };

export interface SearchResults {
  query: string;
  topResult: TopResult | null;
  tracks: Track[];
  artists: Artist[];
  albums: Album[];
  playlists: Playlist[];
  shows: Show[];
  episodes: Episode[];
  profiles: Profile[];
  total: number;
}

/** Lowercase, strip diacritics, collapse whitespace. */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** 0 = no match; higher is a better textual match. */
function scoreText(text: string, q: string): number {
  const t = normalize(text);
  if (!t || !q) return 0;
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.split(/[^a-z0-9]+/).some((word) => word.startsWith(q))) return 60;
  if (t.includes(q)) return 40;
  const tokens = q.split(" ");
  if (tokens.length > 1 && tokens.every((tok) => t.includes(tok))) return 30;
  return 0;
}

function rank<T>(items: T[], score: (item: T) => number): T[] {
  return items
    .map((item, order) => ({ item, order, s: score(item) }))
    .filter((entry) => entry.s > 0)
    .sort((a, b) => b.s - a.s || a.order - b.order)
    .map((entry) => entry.item);
}

// How much each kind of "top result" is preferred when text scores tie.
const TOP_BONUS: Record<TopResult["kind"], number> = {
  artist: 4,
  show: 3,
  album: 2,
  playlist: 1,
  track: 0,
};

/**
 * Pure, local search over the mock catalog. The ranking rules here are this
 * project's own; they are not a reconstruction of Spotify's ranking.
 */
export function searchCatalog(rawQuery: string): SearchResults {
  const query = rawQuery.trim();
  const q = normalize(query);

  const empty: SearchResults = {
    query,
    topResult: null,
    tracks: [],
    artists: [],
    albums: [],
    playlists: [],
    shows: [],
    episodes: [],
    profiles: [],
    total: 0,
  };
  if (!q) return empty;

  const trackScore = (t: Track) =>
    Math.max(
      scoreText(t.title, q),
      scoreText(artistNames(t.artistIds), q) * 0.5,
      scoreText(getAlbum(t.albumId).title, q) * 0.4,
    );
  const albumScore = (a: Album) =>
    Math.max(scoreText(a.title, q), scoreText(artistNames(a.artistIds), q) * 0.5);
  const showScore = (s: Show) =>
    Math.max(scoreText(s.title, q), scoreText(s.publisher, q) * 0.5);

  const result: SearchResults = {
    ...empty,
    tracks: rank(tracks, trackScore),
    artists: rank(artists, (a) => scoreText(a.name, q)),
    albums: rank(albums, albumScore),
    playlists: rank(playlists, (p) =>
      Math.max(scoreText(p.title, q), scoreText(p.owner, q) * 0.3),
    ),
    shows: rank(shows, showScore),
    episodes: rank(episodes, (e) =>
      Math.max(scoreText(e.title, q), scoreText(getShow(e.showId).title, q) * 0.4),
    ),
    profiles: rank(profileList, (p) => scoreText(p.name, q)),
  };

  result.total =
    result.tracks.length +
    result.artists.length +
    result.albums.length +
    result.playlists.length +
    result.shows.length +
    result.episodes.length +
    result.profiles.length;

  const candidates: Array<{ top: TopResult; score: number }> = [];
  const best = <T,>(list: T[], score: (x: T) => number, make: (x: T) => TopResult) => {
    const first = list[0];
    if (first !== undefined) candidates.push({ top: make(first), score: score(first) });
  };
  best(result.artists, (a) => scoreText(a.name, q), (item) => ({ kind: "artist", item }));
  best(result.shows, showScore, (item) => ({ kind: "show", item }));
  best(result.albums, albumScore, (item) => ({ kind: "album", item }));
  best(
    result.playlists,
    (p) => Math.max(scoreText(p.title, q), scoreText(p.owner, q) * 0.3),
    (item) => ({ kind: "playlist", item }),
  );
  best(result.tracks, trackScore, (item) => ({ kind: "track", item }));

  candidates.sort(
    (a, b) => b.score + TOP_BONUS[b.top.kind] - (a.score + TOP_BONUS[a.top.kind]),
  );
  result.topResult = candidates[0]?.top ?? null;
  return result;
}

/** URL segment for each search filter, and its label. "all" has no segment. */
export const SEARCH_FILTERS = [
  { id: "all", segment: null, label: "All" },
  { id: "tracks", segment: "tracks", label: "Songs" },
  { id: "albums", segment: "albums", label: "Albums" },
  { id: "artists", segment: "artists", label: "Artists" },
  { id: "playlists", segment: "playlists", label: "Playlists" },
  { id: "podcastAndEpisodes", segment: "podcastAndEpisodes", label: "Podcasts & Shows" },
  { id: "users", segment: "users", label: "Profiles" },
] as const;

export type SearchFilterId = (typeof SEARCH_FILTERS)[number]["id"];

export function filterFromSegment(segment: string | undefined): SearchFilterId | null {
  if (segment === undefined) return "all";
  const found = SEARCH_FILTERS.find((f) => f.segment === segment);
  return found ? found.id : null;
}

export function searchHref(query: string, filter: SearchFilterId): string {
  const base = `/search/${encodeURIComponent(query)}`;
  const f = SEARCH_FILTERS.find((x) => x.id === filter);
  return f?.segment ? `${base}/${f.segment}` : base;
}

export type { EntityKind };
