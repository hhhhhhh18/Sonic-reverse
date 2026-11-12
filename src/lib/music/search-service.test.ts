import { describe, expect, it } from "vitest";
import type { MusicConfig } from "./config";
import { createMusicSearchService, validateQuery } from "./search-service";

const KEY = "TESTKEY-not-a-real-key";
const DAY = 24 * 60 * 60 * 1000;

const config = (over: Partial<MusicConfig> = {}): MusicConfig => ({
  apiKey: KEY,
  disabledReason: null,
  regionCode: "IN",
  cacheTtlMs: 60_000,
  rateLimitPerMinute: 100,
  dailyBudget: 0,
  baseUrl: "http://localhost:1/v3",
  keyInQuery: false,
  ...over,
});

const searchJson = { items: [{ id: { videoId: "aaaaaaaaaaa" } }] };
const videosJson = {
  items: [
    {
      id: "aaaaaaaaaaa",
      snippet: { title: "Song Title", channelTitle: "Artist - Topic", thumbnails: { medium: { url: "https://i.ytimg.com/vi/a/mqdefault.jpg" } } },
      contentDetails: { duration: "PT3M" },
      status: { embeddable: true },
    },
  ],
};

function setup(over: Partial<MusicConfig> = {}, startAt = Date.UTC(2026, 10, 7, 12)) {
  let t = startAt;
  let failWith: { status: number; body: unknown } | null = null;
  let delayMs = 0;
  const calls: string[] = [];
  const cfg = config(over);
  const fetchImpl = (async (input: URL | string) => {
    const url = new URL(String(input));
    calls.push(url.pathname);
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
    if (failWith) return new Response(JSON.stringify(failWith.body), { status: failWith.status });
    return new Response(JSON.stringify(url.pathname.endsWith("/search") ? searchJson : videosJson), { status: 200 });
  }) as unknown as typeof fetch;
  const service = createMusicSearchService({ readConfig: () => cfg, fetchImpl, now: () => t });
  return {
    service,
    calls,
    cfg,
    advance: (ms: number) => (t += ms),
    failWith: (v: typeof failWith) => (failWith = v),
    delay: (ms: number) => (delayMs = ms),
  };
}

describe("validateQuery", () => {
  it("normalizes whitespace and strips control characters", () => {
    expect(validateQuery("  butta\u0000  bomma\n")).toEqual({ ok: true, query: "butta bomma" });
  });
  it("enforces 3..100 characters, counting code points", () => {
    expect(validateQuery("ab").ok).toBe(false);
    expect(validateQuery("abc").ok).toBe(true);
    expect(validateQuery("తెలు").ok).toBe(true);
    expect(validateQuery("x".repeat(100)).ok).toBe(true);
    expect(validateQuery("x".repeat(101)).ok).toBe(false);
    expect(validateQuery(42 as unknown as string).ok).toBe(false);
  });
});

describe("music search service", () => {
  it("rejects invalid queries and page tokens without calling YouTube", async () => {
    const s = setup();
    expect(await s.service.search("ab")).toMatchObject({ ok: false, error: { code: "invalid_query" } });
    expect(await s.service.search("valid query", { pageToken: "bad token!" })).toMatchObject({ ok: false, error: { code: "invalid_query" } });
    expect(s.calls).toHaveLength(0);
  });

  it("reports not_configured with the reason when there is no key", async () => {
    const s = setup({ apiKey: null, disabledReason: "YOUTUBE_API_KEY isn't set." });
    const out = await s.service.search("some song");
    expect(out).toMatchObject({ ok: false, error: { code: "not_configured", message: "YOUTUBE_API_KEY isn't set." } });
    expect(s.calls).toHaveLength(0);
  });

  it("caches results, ignoring case and whitespace differences", async () => {
    const s = setup();
    const first = await s.service.search("Butta Bomma");
    expect(first).toMatchObject({ ok: true, data: { cached: false, query: "Butta Bomma" } });
    expect(s.calls).toHaveLength(2); // search + videos
    const second = await s.service.search("  butta   BOMMA ");
    expect(second).toMatchObject({ ok: true, data: { cached: true } });
    expect(s.calls).toHaveLength(2);
    s.advance(61_000); // TTL elapsed
    await s.service.search("butta bomma");
    expect(s.calls).toHaveLength(4);
  });

  it("rate limits per client, but cache hits and other clients are unaffected", async () => {
    const s = setup({ rateLimitPerMinute: 2 });
    await s.service.search("song one", { clientId: "1.1.1.1" });
    await s.service.search("song two", { clientId: "1.1.1.1" });
    const blocked = await s.service.search("song three", { clientId: "1.1.1.1" });
    expect(blocked).toMatchObject({ ok: false, error: { code: "rate_limited" } });
    expect(blocked.ok === false && blocked.error.retryAfterSec).toBeGreaterThan(0);
    expect((await s.service.search("song one", { clientId: "1.1.1.1" })).ok).toBe(true); // cached
    expect((await s.service.search("song three", { clientId: "2.2.2.2" })).ok).toBe(true);
  });

  it("stops at the daily budget and resets on the next Pacific day", async () => {
    const s = setup({ dailyBudget: 1 });
    expect((await s.service.search("first query")).ok).toBe(true);
    const over = await s.service.search("second query");
    expect(over).toMatchObject({ ok: false, error: { code: "quota_exceeded" } });
    expect(s.calls).toHaveLength(2);
    s.advance(2 * DAY);
    expect((await s.service.search("second query")).ok).toBe(true);
  });

  it("pauses upstream calls for a while after YouTube reports the quota is exhausted", async () => {
    const s = setup();
    s.failWith({ status: 403, body: { error: { errors: [{ reason: "quotaExceeded" }] } } });
    expect(await s.service.search("first query")).toMatchObject({ ok: false, error: { code: "quota_exceeded" } });
    const callsAfterFailure = s.calls.length;
    s.failWith(null);
    expect(await s.service.search("another query")).toMatchObject({ ok: false, error: { code: "quota_exceeded" } });
    expect(s.calls).toHaveLength(callsAfterFailure); // not even attempted
    s.advance(11 * 60 * 1000);
    expect((await s.service.search("another query")).ok).toBe(true);
  });

  it("maps a rejected key to not_configured and other failures to upstream_error", async () => {
    const a = setup();
    a.failWith({ status: 400, body: { error: { errors: [{ reason: "keyInvalid" }] } } });
    expect(await a.service.search("some song")).toMatchObject({ ok: false, error: { code: "not_configured" } });
    const b = setup();
    b.failWith({ status: 500, body: {} });
    expect(await b.service.search("some song")).toMatchObject({ ok: false, error: { code: "upstream_error" } });
  });

  it("shares one upstream request between identical concurrent searches", async () => {
    const s = setup();
    s.delay(20);
    const [x, y] = await Promise.all([s.service.search("same query"), s.service.search("same query")]);
    expect(x.ok && y.ok).toBe(true);
    expect(s.calls).toHaveLength(2); // one search + one videos, not four
  });

  it("never includes the API key in any outcome", async () => {
    const s = setup();
    const outcomes = [await s.service.search("some song"), await s.service.search("ab")];
    s.failWith({ status: 400, body: { error: { message: KEY, errors: [{ reason: "keyInvalid" }] } } });
    outcomes.push(await s.service.search("another song"));
    expect(JSON.stringify(outcomes)).not.toContain(KEY);
  });
});
