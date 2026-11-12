import { describe, expect, it } from "vitest";
import { clientIdFromHeaders } from "./client-id";
import { DEFAULT_YOUTUBE_BASE_URL, readMusicConfig } from "./config";

describe("readMusicConfig", () => {
  it("is disabled without a key, with a placeholder key, or in mock mode", () => {
    expect(readMusicConfig({}).apiKey).toBeNull();
    expect(readMusicConfig({ YOUTUBE_API_KEY: "  " }).apiKey).toBeNull();
    expect(readMusicConfig({ YOUTUBE_API_KEY: "your_api_key_here" }).apiKey).toBeNull();
    const mock = readMusicConfig({ YOUTUBE_API_KEY: "abc123", MUSIC_PROVIDER: "mock" });
    expect(mock.apiKey).toBeNull();
    expect(mock.disabledReason).toMatch(/MUSIC_PROVIDER=mock/);
  });

  it("accepts a real-looking key and applies defaults", () => {
    const c = readMusicConfig({ YOUTUBE_API_KEY: " abc123 " });
    expect(c.apiKey).toBe("abc123");
    expect(c).toMatchObject({
      regionCode: "IN",
      cacheTtlMs: 21_600_000,
      rateLimitPerMinute: 20,
      dailyBudget: 90,
      keyInQuery: false,
      baseUrl: DEFAULT_YOUTUBE_BASE_URL,
    });
  });

  it("clamps numeric settings and validates the region", () => {
    const c = readMusicConfig({
      YOUTUBE_API_KEY: "k",
      MUSIC_CACHE_TTL_SECONDS: "1",
      MUSIC_RATE_LIMIT_PER_MIN: "99999",
      MUSIC_DAILY_SEARCH_BUDGET: "nope",
      YOUTUBE_REGION_CODE: "zzz",
    });
    expect(c.cacheTtlMs).toBe(60_000);
    expect(c.rateLimitPerMinute).toBe(600);
    expect(c.dailyBudget).toBe(90);
    expect(c.regionCode).toBe("IN");
    expect(readMusicConfig({ YOUTUBE_API_KEY: "k", YOUTUBE_REGION_CODE: "us" }).regionCode).toBe("US");
  });

  it("only lets loopback URLs override the API host, so the key can't be redirected", () => {
    const local = readMusicConfig({ YOUTUBE_API_KEY: "k", YOUTUBE_API_BASE_URL: "http://localhost:4010/v3/" });
    expect(local.baseUrl).toBe("http://localhost:4010/v3");
    for (const evil of ["https://evil.example/v3", "http://169.254.169.254/", "not a url"]) {
      expect(readMusicConfig({ YOUTUBE_API_KEY: "k", YOUTUBE_API_BASE_URL: evil }).baseUrl).toBe(
        DEFAULT_YOUTUBE_BASE_URL,
      );
    }
  });
});

describe("clientIdFromHeaders", () => {
  const headers = (h: Record<string, string>) => ({ get: (n: string) => h[n] ?? null });
  it("uses the first forwarded address, then x-real-ip, then 'local'", () => {
    expect(clientIdFromHeaders(headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe("1.2.3.4");
    expect(clientIdFromHeaders(headers({ "x-real-ip": "9.9.9.9" }))).toBe("9.9.9.9");
    expect(clientIdFromHeaders(headers({}))).toBe("local");
  });
});
