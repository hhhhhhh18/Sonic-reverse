import { describe, expect, it } from "vitest";
import { searchYouTube, YouTubeApiError, type SearchYouTubeParams } from "./youtube";

const KEY = "TESTKEY-not-a-real-key";
const ID = { a: "aaaaaaaaaaa", b: "bbbbbbbbbbb", c: "ccccccccccc", d: "ddddddddddd" };
const thumb = { medium: { url: "https://i.ytimg.com/vi/x/mqdefault.jpg" } };

const searchBody = {
  nextPageToken: "NEXTPAGE",
  items: Object.values(ID).map((videoId) => ({ id: { videoId } })),
};
const videosBody = {
  items: [
    {
      id: ID.a,
      snippet: { title: "Butta Bomma Full Video Song | Ala Vaikunthapurramuloo | Allu Arjun | Thaman S", channelTitle: "Aditya Music", thumbnails: thumb },
      contentDetails: { duration: "PT3M28S" },
      status: { embeddable: true },
    },
    { id: ID.b, snippet: { title: "Blocked", channelTitle: "X", thumbnails: thumb }, contentDetails: { duration: "PT3M" }, status: { embeddable: false } },
    { id: ID.c, snippet: { title: "Telugu Hit Songs Jukebox", channelTitle: "X", thumbnails: thumb }, contentDetails: { duration: "PT1H5M" }, status: { embeddable: true } },
    {
      id: ID.d,
      snippet: { title: "Rock &amp; Roll", channelTitle: "Band - Topic", thumbnails: { medium: { url: "https://evil.example/t.jpg" } } },
      contentDetails: { duration: "PT2M" },
      status: { embeddable: true },
    },
  ],
};

type MockResponse = { status?: number; body?: unknown; raw?: string } | Error;

function mockFetch(responses: MockResponse[]) {
  const calls: Array<{ url: URL; headers: Record<string, string> }> = [];
  const fetchImpl = (async (input: URL | string, init?: RequestInit) => {
    calls.push({ url: new URL(String(input)), headers: (init?.headers ?? {}) as Record<string, string> });
    const next = responses[calls.length - 1];
    if (!next) throw new Error("unexpected extra request");
    if (next instanceof Error) throw next;
    return new Response(next.raw ?? JSON.stringify(next.body), { status: next.status ?? 200 });
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

const base = (fetchImpl: typeof fetch, extra: Partial<SearchYouTubeParams> = {}): SearchYouTubeParams => ({
  query: "butta bomma",
  regionCode: "IN",
  apiKey: KEY,
  baseUrl: "http://localhost:1/v3",
  fetchImpl,
  ...extra,
});

describe("searchYouTube", () => {
  it("searches music videos, then enriches them with one videos.list call", async () => {
    const { fetchImpl, calls } = mockFetch([{ body: searchBody }, { body: videosBody }]);
    const result = await searchYouTube(base(fetchImpl));

    expect(calls).toHaveLength(2);
    const search = calls[0].url;
    expect(search.pathname).toBe("/v3/search");
    expect(Object.fromEntries(search.searchParams)).toMatchObject({
      part: "snippet",
      type: "video",
      videoCategoryId: "10",
      videoEmbeddable: "true",
      regionCode: "IN",
      q: "butta bomma",
      maxResults: "20",
    });
    expect(search.searchParams.has("relevanceLanguage")).toBe(false);
    const videos = calls[1].url;
    expect(videos.pathname).toBe("/v3/videos");
    expect(videos.searchParams.get("id")).toBe(Object.values(ID).join(","));
    expect(videos.searchParams.get("part")).toBe("snippet,contentDetails,status");

    expect(result.nextPageToken).toBe("NEXTPAGE");
    expect(result.tracks.map((t) => t.videoId)).toEqual([ID.a, ID.d]); // b not embeddable, c is a jukebox
    expect(result.tracks[0]).toEqual({
      videoId: ID.a,
      title: "Butta Bomma",
      artists: ["Allu Arjun", "Thaman S"],
      album: "Ala Vaikunthapurramuloo",
      channelTitle: "Aditya Music",
      thumbnailUrl: "https://i.ytimg.com/vi/x/mqdefault.jpg",
      durationSec: 208,
    });
    expect(result.tracks[1]).toMatchObject({ title: "Rock & Roll", artists: ["Band"], thumbnailUrl: null });
  });

  it("sends the key in a header, never in the URL", async () => {
    const { fetchImpl, calls } = mockFetch([{ body: searchBody }, { body: videosBody }]);
    await searchYouTube(base(fetchImpl));
    for (const call of calls) {
      expect(call.headers["x-goog-api-key"]).toBe(KEY);
      expect(call.url.toString()).not.toContain(KEY);
      expect(call.url.searchParams.has("key")).toBe(false);
    }
  });

  it("can send the key as ?key= for troubleshooting", async () => {
    const { fetchImpl, calls } = mockFetch([{ body: searchBody }, { body: videosBody }]);
    await searchYouTube(base(fetchImpl, { keyInQuery: true }));
    expect(calls[0].url.searchParams.get("key")).toBe(KEY);
    expect(calls[0].headers["x-goog-api-key"]).toBeUndefined();
  });

  it("adds a language hint for Indic-script queries and forwards the page token", async () => {
    const { fetchImpl, calls } = mockFetch([{ body: { items: [] } }]);
    const result = await searchYouTube(base(fetchImpl, { query: "బుట్ట బొమ్మ", pageToken: "TOKEN_1", maxResults: 99 }));
    expect(calls[0].url.searchParams.get("relevanceLanguage")).toBe("te");
    expect(calls[0].url.searchParams.get("pageToken")).toBe("TOKEN_1");
    expect(calls[0].url.searchParams.get("maxResults")).toBe("25"); // clamped
    expect(result.tracks).toEqual([]);
    expect(calls).toHaveLength(1); // no videos.list when there is nothing to enrich
  });

  it("falls back to unfiltered embeddable hits rather than returning nothing", async () => {
    const { fetchImpl } = mockFetch([
      { body: { items: [{ id: { videoId: ID.c } }] } },
      { body: { items: [videosBody.items[2]] } },
    ]);
    const result = await searchYouTube(base(fetchImpl));
    expect(result.tracks.map((t) => t.videoId)).toEqual([ID.c]);
  });

  it("ignores malformed video ids from upstream", async () => {
    const { fetchImpl, calls } = mockFetch([{ body: { items: [{ id: { videoId: '"><script>' } }] } }]);
    const result = await searchYouTube(base(fetchImpl));
    expect(result.tracks).toEqual([]);
    expect(calls).toHaveLength(1);
  });
});

describe("searchYouTube error handling", () => {
  const attempt = async (response: MockResponse) => {
    const { fetchImpl } = mockFetch([response]);
    try {
      await searchYouTube(base(fetchImpl));
    } catch (e) {
      return e as YouTubeApiError;
    }
    throw new Error("expected a rejection");
  };

  it("classifies quota errors", async () => {
    const err = await attempt({ status: 403, body: { error: { errors: [{ reason: "quotaExceeded" }] } } });
    expect(err).toBeInstanceOf(YouTubeApiError);
    expect(err.code).toBe("quota_exceeded");
  });

  it("classifies key/config errors, including newer detail-style reasons", async () => {
    expect((await attempt({ status: 400, body: { error: { errors: [{ reason: "keyInvalid" }] } } })).code).toBe("not_configured");
    expect((await attempt({ status: 400, body: { error: { details: [{ reason: "API_KEY_INVALID" }] } } })).code).toBe("not_configured");
    expect((await attempt({ status: 403, body: { error: { errors: [{ reason: "accessNotConfigured" }] } } })).code).toBe("not_configured");
  });

  it("treats everything else as an upstream error", async () => {
    expect((await attempt({ status: 500, body: { error: {} } })).code).toBe("upstream_error");
    expect((await attempt(new Error("socket hang up"))).code).toBe("upstream_error");
    expect((await attempt({ status: 200, raw: "<html>not json at all</html>" })).code).toBe("upstream_error");
  });

  it("never leaks the key, URLs or upstream text in error messages", async () => {
    const leaky = { error: { message: `bad key ${KEY} at http://x/?key=${KEY}`, errors: [{ reason: "keyInvalid" }] } };
    for (const response of [{ status: 400, body: leaky }, new Error(`failed ${KEY}`)]) {
      const err = await attempt(response);
      expect(err.message).not.toContain(KEY);
      expect(err.message).not.toContain("http");
    }
  });
});
