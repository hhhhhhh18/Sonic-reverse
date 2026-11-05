import { describe, expect, it } from "vitest";
import { filterFromSegment, normalize, searchCatalog, searchHref } from "./search";

describe("normalize", () => {
  it("lowercases, strips diacritics and collapses whitespace", () => {
    expect(normalize("  Tomás   REYES ")).toBe("tomas reyes");
  });
});

describe("searchCatalog", () => {
  it("returns nothing for an empty or whitespace query", () => {
    expect(searchCatalog("").total).toBe(0);
    expect(searchCatalog("   ").topResult).toBeNull();
  });

  it("finds results across every section for 'hello'", () => {
    const r = searchCatalog("hello");
    expect(r.tracks.length).toBeGreaterThan(0);
    expect(r.artists.length).toBeGreaterThan(0);
    expect(r.albums.length).toBeGreaterThan(0);
    expect(r.playlists.length).toBeGreaterThan(0);
    expect(r.shows.length).toBeGreaterThan(0);
    expect(r.episodes.length).toBeGreaterThan(0);
    expect(r.profiles.length).toBeGreaterThan(0);
    expect(r.topResult).not.toBeNull();
  });

  it("ranks an exact title above a partial one", () => {
    const r = searchCatalog("slow weather");
    expect(r.tracks[0].id).toBe("slow-weather");
  });

  it("matches ignoring case and diacritics", () => {
    expect(searchCatalog("TOMAS").artists.map((a) => a.id)).toContain("tomas-reyes");
  });

  it("matches artist names for tracks", () => {
    expect(searchCatalog("lumen choir").tracks.map((t) => t.id)).toContain("night-bus-hymn");
  });

  it("returns no results for gibberish", () => {
    const r = searchCatalog("zzzzqq");
    expect(r.total).toBe(0);
    expect(r.topResult).toBeNull();
  });
});

describe("search filters and URLs", () => {
  it("maps URL segments to filters", () => {
    expect(filterFromSegment(undefined)).toBe("all");
    expect(filterFromSegment("tracks")).toBe("tracks");
    expect(filterFromSegment("podcastAndEpisodes")).toBe("podcastAndEpisodes");
    expect(filterFromSegment("users")).toBe("users");
    expect(filterFromSegment("nope")).toBeNull();
  });

  it("builds the observed URL shapes and encodes the query", () => {
    expect(searchHref("hello", "all")).toBe("/search/hello");
    expect(searchHref("hello", "tracks")).toBe("/search/hello/tracks");
    expect(searchHref("a b/c", "albums")).toBe("/search/a%20b%2Fc/albums");
  });
});
