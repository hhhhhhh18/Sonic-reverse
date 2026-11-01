import { describe, expect, it } from "vitest";
import { SECTIONS, albums, artists, episodes, playlists, profiles, shows, tracks } from "./catalog";

const ids = (list: { id: string }[]) => list.map((x) => x.id);

describe("mock catalog integrity", () => {
  it("has unique ids within each collection", () => {
    for (const list of [artists, albums, tracks, playlists, shows, episodes, profiles]) {
      expect(new Set(ids(list)).size).toBe(list.length);
    }
  });

  it("resolves every cross-reference", () => {
    const artistIds = new Set(ids(artists));
    const albumIds = new Set(ids(albums));
    const trackIds = new Set(ids(tracks));
    const showIds = new Set(ids(shows));
    for (const t of tracks) {
      expect(albumIds.has(t.albumId), `${t.id} album`).toBe(true);
      t.artistIds.forEach((a) => expect(artistIds.has(a), `${t.id} artist ${a}`).toBe(true));
      expect(t.durationSec).toBeGreaterThan(0);
    }
    for (const a of albums) a.artistIds.forEach((id) => expect(artistIds.has(id)).toBe(true));
    for (const p of playlists) p.trackIds.forEach((id) => expect(trackIds.has(id), `${p.id}/${id}`).toBe(true));
    for (const e of episodes) {
      expect(showIds.has(e.showId)).toBe(true);
      expect(e.durationSec).toBeGreaterThan(0);
    }
  });

  it("section ids point at real items of the declared kind", () => {
    const pools = { track: new Set(ids(tracks)), artist: new Set(ids(artists)), album: new Set(ids(albums)) };
    for (const section of Object.values(SECTIONS)) {
      expect(section.ids.length).toBeGreaterThan(0);
      for (const id of section.ids) expect(pools[section.kind].has(id)).toBe(true);
    }
  });
});
