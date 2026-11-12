import { describe, expect, it } from "vitest";
import { describeYouTubeError, loadYouTubeIframeApi, YT_STATE } from "./youtube-iframe";

describe("youtube-iframe helpers", () => {
  it("exposes the documented player state values", () => {
    expect(YT_STATE).toEqual({ UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 });
  });

  it("explains every documented error code, and unknown ones", () => {
    for (const code of [2, 5, 100, 101, 150, 999]) {
      expect(describeYouTubeError(code)).toMatch(/\S/);
    }
    expect(describeYouTubeError(101)).toBe(describeYouTubeError(150));
    expect(describeYouTubeError(100)).not.toBe(describeYouTubeError(101));
  });

  it("refuses to load outside a browser", async () => {
    await expect(loadYouTubeIframeApi()).rejects.toThrow(/browser/i);
  });
});
