import { describe, expect, it } from "vitest";
import { deriveAlbums, deriveArtists } from "./derive";
import { musicTrackByline, musicTrackToPlayable } from "./playable";
import type { MusicTrack } from "./types";

const track = (n: string, artists: string[], album: string | null, thumb: string | null = null): MusicTrack => ({
  videoId: n.repeat(11),
  title: `Song ${n}`,
  artists,
  album,
  channelTitle: "Some Label",
  thumbnailUrl: thumb,
  durationSec: 200,
});

const tracks = [
  track("a", ["Anirudh"], "Movie One"),
  track("b", ["Sid Sriram", "Anirudh"], "Movie Two"),
  track("c", ["anirudh"], "Movie One"),
  track("d", [], null),
];

describe("deriveArtists / deriveAlbums", () => {
  it("groups case-insensitively and orders by how many songs each has", () => {
    const artists = deriveArtists(tracks);
    expect(artists.map((g) => [g.name, g.tracks.length])).toEqual([["Anirudh", 3], ["Sid Sriram", 1]]);
    const albums = deriveAlbums(tracks);
    expect(albums.map((g) => [g.name, g.tracks.length])).toEqual([["Movie One", 2], ["Movie Two", 1]]);
  });

  it("skips songs with no artist or album, and respects the limit", () => {
    expect(deriveArtists([track("d", [], null)])).toEqual([]);
    expect(deriveAlbums([track("d", [], null)])).toEqual([]);
    expect(deriveArtists(tracks, 1)).toHaveLength(1);
  });
});

describe("musicTrackToPlayable", () => {
  it("builds a YouTube playable with artwork and a stable id", () => {
    const item = musicTrackToPlayable(track("a", ["Anirudh"], null, "https://i.ytimg.com/vi/a/mqdefault.jpg"));
    expect(item).toMatchObject({
      id: `yt:${"a".repeat(11)}`,
      videoId: "a".repeat(11),
      byline: "Anirudh",
      artworkUrl: "https://i.ytimg.com/vi/a/mqdefault.jpg",
      kind: "track",
      durationSec: 200,
    });
  });

  it("falls back to the channel name, and omits artwork when there is none", () => {
    const t = track("d", [], null);
    expect(musicTrackByline(t)).toBe("Some Label");
    expect("artworkUrl" in musicTrackToPlayable(t)).toBe(false);
  });
});
