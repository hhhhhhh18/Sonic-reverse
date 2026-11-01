import { describe, expect, it } from "vitest";
import type { PlayableItem } from "@/data/types";
import {
  currentItem,
  hasNext,
  initialPlayerState,
  makeOrder,
  mulberry32,
  playerReducer,
  type PlayerState,
} from "./player-reducer";

const item = (id: string, durationSec = 10): PlayableItem => ({
  id, title: id, byline: "x", durationSec, coverSeed: id, kind: "track",
});
const queue = [item("a"), item("b"), item("c")];
const play = (s: PlayerState, i: PlayableItem, q = queue, seed = 1) =>
  playerReducer(s, { type: "play-item", item: i, queue: q, seed });

describe("player reducer", () => {
  it("starts idle with controls having nothing to act on", () => {
    expect(currentItem(initialPlayerState)).toBeUndefined();
    expect(playerReducer(initialPlayerState, { type: "toggle" })).toBe(initialPlayerState);
    expect(playerReducer(initialPlayerState, { type: "next" })).toBe(initialPlayerState);
  });

  it("plays an item and toggles pause/resume when it is played again", () => {
    let s = play(initialPlayerState, queue[1]);
    expect(currentItem(s)?.id).toBe("b");
    expect(s.isPlaying).toBe(true);
    s = play(s, queue[1]);
    expect(s.isPlaying).toBe(false);
    s = play(s, queue[1]);
    expect(s.isPlaying).toBe(true);
  });

  it("adds a played item that isn't in the supplied queue", () => {
    const s = play(initialPlayerState, item("z"), queue);
    expect(currentItem(s)?.id).toBe("z");
    expect(s.queue.map((q) => q.id)).toEqual(["z", "a", "b", "c"]);
  });

  it("moves next/prev, and prev near the start of a track restarts it", () => {
    let s = play(initialPlayerState, queue[0]);
    s = playerReducer(s, { type: "next" });
    expect(currentItem(s)?.id).toBe("b");
    s = playerReducer(s, { type: "tick", dt: 5 });
    s = playerReducer(s, { type: "prev" }); // >3s in: restart, don't go back
    expect(currentItem(s)?.id).toBe("b");
    expect(s.position).toBe(0);
    s = playerReducer(s, { type: "prev" }); // at start: go back
    expect(currentItem(s)?.id).toBe("a");
  });

  it("does not advance past the end of the queue unless repeat is on", () => {
    let s = play(initialPlayerState, queue[2]);
    expect(hasNext(s)).toBe(false);
    expect(playerReducer(s, { type: "next" })).toBe(s);
    s = playerReducer(s, { type: "toggle-repeat" });
    expect(hasNext(s)).toBe(true);
    expect(currentItem(playerReducer(s, { type: "next" }))?.id).toBe("a");
  });

  it("auto-advances at the end of a track and stops after the last one", () => {
    let s = play(initialPlayerState, queue[1]);
    s = playerReducer(s, { type: "tick", dt: 10 });
    expect(currentItem(s)?.id).toBe("c");
    expect(s.isPlaying).toBe(true);
    s = playerReducer(s, { type: "tick", dt: 10 });
    expect(s.isPlaying).toBe(false);
    expect(s.position).toBe(0);
  });

  it("ignores ticks while paused and clamps seeking", () => {
    let s = play(initialPlayerState, queue[0]);
    s = playerReducer(s, { type: "toggle" });
    expect(playerReducer(s, { type: "tick", dt: 5 }).position).toBe(0);
    expect(playerReducer(s, { type: "seek", position: 999 }).position).toBe(10);
    expect(playerReducer(s, { type: "seek", position: -5 }).position).toBe(0);
  });

  it("shuffle keeps the current item and visits every item exactly once", () => {
    let s = play(initialPlayerState, queue[1]);
    s = playerReducer(s, { type: "toggle-shuffle", seed: 42 });
    expect(s.shuffle).toBe(true);
    expect(currentItem(s)?.id).toBe("b");
    expect([...s.order].sort()).toEqual([0, 1, 2]);
    s = playerReducer(s, { type: "toggle-shuffle", seed: 7 });
    expect(currentItem(s)?.id).toBe("b");
    expect(s.order).toEqual([0, 1, 2]);
  });

  it("clamps volume and unmutes when volume is set", () => {
    let s = playerReducer(initialPlayerState, { type: "toggle-mute" });
    expect(s.muted).toBe(true);
    s = playerReducer(s, { type: "set-volume", volume: 250 });
    expect(s.volume).toBe(100);
    expect(s.muted).toBe(false);
  });
});

describe("makeOrder", () => {
  it("is the identity when not shuffling and starts at startIndex when shuffling", () => {
    expect(makeOrder(4, 2, false, mulberry32(1))).toEqual([0, 1, 2, 3]);
    const o = makeOrder(6, 3, true, mulberry32(99));
    expect(o[0]).toBe(3);
    expect([...o].sort()).toEqual([0, 1, 2, 3, 4, 5]);
  });
});
