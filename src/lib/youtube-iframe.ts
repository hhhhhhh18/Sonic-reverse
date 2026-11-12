/**
 * Minimal typings and a loader for the official YouTube IFrame Player API
 * (https://www.youtube.com/iframe_api). Only what this app uses is declared.
 */
export interface YTPlayer {
  loadVideoById(options: { videoId: string; startSeconds?: number }): void;
  cueVideoById(options: { videoId: string; startSeconds?: number }): void;
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  setVolume(volume: number): void;
  mute(): void;
  unMute(): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  getVideoData(): { video_id?: string };
  destroy(): void;
}

export interface YTPlayerOptions {
  width?: string | number;
  height?: string | number;
  host?: string;
  playerVars?: Record<string, string | number>;
  events?: {
    onReady?: (event: { target: YTPlayer }) => void;
    onStateChange?: (event: { data: number }) => void;
    onError?: (event: { data: number }) => void;
  };
}

export interface YTNamespace {
  Player: new (element: HTMLElement, options: YTPlayerOptions) => YTPlayer;
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

/** Values of YT.PlayerState. */
export const YT_STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const;

const API_URL = "https://www.youtube.com/iframe_api";
let pending: Promise<YTNamespace> | null = null;

/** Loads the IFrame API once and resolves with `YT`. Safe to call repeatedly. */
export function loadYouTubeIframeApi(timeoutMs = 15000): Promise<YTNamespace> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("The YouTube player needs a browser."));
  }
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (pending) return pending;

  pending = new Promise<YTNamespace>((resolve, reject) => {
    const fail = (message: string) => {
      pending = null;
      reject(new Error(message));
    };
    const timer = window.setTimeout(() => fail("Timed out loading the YouTube player."), timeoutMs);
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      window.clearTimeout(timer);
      if (window.YT?.Player) resolve(window.YT);
      else fail("The YouTube player failed to initialise.");
    };

    if (!document.querySelector(`script[src="${API_URL}"]`)) {
      const script = document.createElement("script");
      script.src = API_URL;
      script.async = true;
      script.onerror = () => {
        window.clearTimeout(timer);
        script.remove();
        fail("Couldn't load the YouTube player script.");
      };
      document.head.appendChild(script);
    }
  });
  return pending;
}

/** User-facing text for the IFrame API's onError codes. */
export function describeYouTubeError(code: number): string {
  switch (code) {
    case 2:
      return "That video link is invalid. Skipping it.";
    case 5:
      return "The YouTube player hit an error. Skipping this song.";
    case 100:
      return "That video was removed or is private. Skipping it.";
    case 101:
    case 150:
      return "The owner doesn't allow this video to be played here. Skipping it.";
    default:
      return "This song couldn't be played. Skipping it.";
  }
}
