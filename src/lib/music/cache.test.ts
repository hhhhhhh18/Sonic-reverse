import { describe, expect, it } from "vitest";
import { TtlCache } from "./cache";
import { RateLimiter } from "./rate-limit";

describe("TtlCache", () => {
  it("expires entries after the TTL", () => {
    let t = 0;
    const cache = new TtlCache<string>(10, 1000, () => t);
    cache.set("a", "1");
    expect(cache.get("a")).toBe("1");
    t = 999;
    expect(cache.get("a")).toBe("1");
    t = 1000;
    expect(cache.get("a")).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it("evicts the least recently used entry beyond its limit", () => {
    const cache = new TtlCache<number>(2, 1000, () => 0);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.get("a"); // a is now more recent than b
    cache.set("c", 3);
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBe(1);
    expect(cache.get("c")).toBe(3);
  });

  it("supports a per-entry TTL", () => {
    let t = 0;
    const cache = new TtlCache<string>(5, 10_000, () => t);
    cache.set("short", "x", 100);
    t = 101;
    expect(cache.get("short")).toBeUndefined();
  });
});

describe("RateLimiter", () => {
  it("allows up to the limit per window, then reports when to retry", () => {
    let t = 0;
    const limiter = new RateLimiter(2, 60_000, () => t);
    expect(limiter.check("ip").allowed).toBe(true);
    t = 1000;
    expect(limiter.check("ip").allowed).toBe(true);
    t = 2000;
    const blocked = limiter.check("ip");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBe(58); // first hit leaves the window at t=60000
    t = 60_001;
    expect(limiter.check("ip").allowed).toBe(true);
  });

  it("tracks clients independently", () => {
    const limiter = new RateLimiter(1, 60_000, () => 0);
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(false);
    expect(limiter.check("b").allowed).toBe(true);
  });
});
