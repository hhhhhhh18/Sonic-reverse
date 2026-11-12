import { describe, expect, it } from "vitest";
import type { PlayableItem } from "@/data/types";
import {
  currentItem,
  effectiveDuration,
  initialPlayerState,
  playerReducer,
  type PlayerAction,
  type PlayerState,
} from "./player-reducer";

const yt = (n: string, durationSec = 200): PlayableItem => ({
  id: `yt:${n.repeat(11)}`,
  title: `Song ${n}`,
  byline: "Artist",
  durationSec,
  coverSeed: n,
  kind: "track",
  videoId: n.repeat(11),
});
const demo: PlayableItem = { id: "demo", title: "Demo", byline: "x", durationSec: 10, coverSeed: "d", kind: "track" };

const A = yt("a");
const B = yt("b");
const C = yt("c");

const run = (state: PlayerState, ...actions: PlayerAction[]) => actions.reduce(playerReducer, state);
const start = (item = A, queue = [A, B, C]) =>
  run(initialPlayerState, { type: "play-item", item, queue, seed: 1 });

describe("starting YouTube playback", () => {
  it("opens the video panel, clears any stale duration and requests a (re)start", () => {
    const s = start();
    expect(currentItem(s)?.videoId).toBe("a".repeat(11));
    expect(s).toMatchObject({ isPlaying: true, videoPanelOpen: true, liveDuration: null, playNonce: 1 });
  });

  it("does not open the panel for demo items", () => {
    const s = run(initialPlayerState, { type: "play-item", item: demo, queue: [demo], seed: 1 });
    expect(s.videoPanelOpen).toBe(false);
  });

  it("re-opens the panel when resuming a YouTube item", () => {
    const s = run(start(), { type: "close-video" }, { type: "toggle" });
    expect(s).toMatchObject({ isPlaying: true, videoPanelOpen: true });
  });
});

describe("engine clock", () => {
  it("ignores the simulated timer for YouTube items", () => {
    const s = start();
    expect(playerReducer(s, { type: "tick", dt: 5 })).toBe(s);
  });

  it("still simulates demo items", () => {
    const s = run(initialPlayerState, { type: "play-item", item: demo, queue: [demo], seed: 1 });
    expect(playerReducer(s, { type: "tick", dt: 5 }).position).toBe(5);
  });

  it("takes position and the real duration from the engine", () => {
    const s = run(start(), { type: "sync", position: 12.5, duration: 187 });
    expect(s.position).toBe(12.5);
    expect(s.liveDuration).toBe(187);
    expect(effectiveDuration(s)).toBe(187);
  });

  it("falls back to the catalogued duration until the engine reports one", () => {
    expect(effectiveDuration(start())).toBe(200);
  });

  it("ignores syncs for demo items and avoids no-op updates", () => {
    const d = run(initialPlayerState, { type: "play-item", item: demo, queue: [demo], seed: 1 });
    expect(playerReducer(d, { type: "sync", position: 4, duration: 99 })).toBe(d);
    const s = run(start(), { type: "sync", position: 10, duration: 180 });
    expect(playerReducer(s, { type: "sync", position: 10.01, duration: 180 })).toBe(s);
  });

  it("does not let a stale duration leak into the next song", () => {
    const s = run(start(), { type: "sync", position: 5, duration: 180 }, { type: "next" });
    expect(s.liveDuration).toBeNull();
    expect(effectiveDuration(s)).toBe(200);
  });
});

describe("seeking", () => {
  it("clamps to the real duration and asks the engine to move", () => {
    const s = run(start(), { type: "sync", position: 1, duration: 150 }, { type: "seek", position: 9999 });
    expect(s.position).toBe(150);
    expect(s.seekNonce).toBe(1);
    expect(run(s, { type: "seek", position: -5 }).position).toBe(0);
  });

  it("restarting with previous also asks the engine to seek", () => {
    const s = run(start(), { type: "sync", position: 30, duration: 200 }, { type: "prev" });
    expect(s.position).toBe(0);
    expect(s.seekNonce).toBe(1);
    expect(currentItem(s)?.id).toBe(A.id);
  });
});

describe("track end", () => {
  it("advances to the next song and requests a load", () => {
    const s = run(start(), { type: "ended" });
    expect(currentItem(s)?.id).toBe(B.id);
    expect(s).toMatchObject({ isPlaying: true, position: 0, playNonce: 2 });
  });

  it("stops at the end of the queue, rewound", () => {
    const s = run(start(C, [C]), { type: "sync", position: 190, duration: 200 }, { type: "ended" });
    expect(s).toMatchObject({ isPlaying: false, position: 0 });
  });

  it("restarts the same single song when repeat is on", () => {
    const s = run(start(C, [C]), { type: "toggle-repeat" });
    const after = playerReducer(s, { type: "ended" });
    expect(after.isPlaying).toBe(true);
    expect(after.playNonce).toBe(s.playNonce + 1); // forces the engine to reload the same video
  });
});

describe("playback failures", () => {
  it("skips to the next song", () => {
    expect(currentItem(run(start(), { type: "item-failed" }))?.id).toBe(B.id);
  });

  it("stops at the last song and never wraps, even with repeat on", () => {
    const s = run(start(C, [A, C]), { type: "toggle-repeat" }, { type: "item-failed" });
    expect(s.isPlaying).toBe(false);
    expect(currentItem(s)?.id).toBe(C.id);
  });

  it("does nothing when nothing is loaded", () => {
    expect(playerReducer(initialPlayerState, { type: "item-failed" })).toBe(initialPlayerState);
  });
});

describe("engine play state and the video panel", () => {
  it("mirrors play/pause done inside the YouTube player", () => {
    const s = start();
    expect(playerReducer(s, { type: "engine-playing", playing: true })).toBe(s);
    expect(playerReducer(s, { type: "engine-playing", playing: false }).isPlaying).toBe(false);
    expect(playerReducer(initialPlayerState, { type: "engine-playing", playing: true })).toBe(initialPlayerState);
  });

  it("closing the video pauses playback so nothing plays hidden", () => {
    const s = run(start(), { type: "close-video" });
    expect(s).toMatchObject({ videoPanelOpen: false, isPlaying: false });
  });

  it("open-video only applies to YouTube items", () => {
    const s = run(start(), { type: "close-video" }, { type: "open-video" });
    expect(s.videoPanelOpen).toBe(true);
    const d = run(initialPlayerState, { type: "play-item", item: demo, queue: [demo], seed: 1 });
    expect(playerReducer(d, { type: "open-video" })).toBe(d);
    expect(playerReducer(d, { type: "close-video" })).toBe(d);
  });
});
