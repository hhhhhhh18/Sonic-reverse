"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type { PlayableItem } from "@/data/types";
import {
  currentItem,
  initialPlayerState,
  playerReducer,
  type PlayerState,
} from "@/lib/player-reducer";

interface PlayerApi {
  state: PlayerState;
  current: PlayableItem | undefined;
  /** Play `item` within `queue`; pauses/resumes if it is already current. */
  playItem: (item: PlayableItem, queue?: PlayableItem[]) => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seek: (seconds: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
}

const PlayerContext = createContext<PlayerApi | null>(null);

const seed = () => Math.floor(Math.random() * 2 ** 32);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(playerReducer, initialPlayerState);

  // Advance the simulated playhead while playing. Real elapsed time is used
  // so background-tab timer throttling doesn't make the track run slow.
  const isPlaying = state.isPlaying;
  useEffect(() => {
    if (!isPlaying) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      dispatch({ type: "tick", dt: (now - last) / 1000 });
      last = now;
    }, 250);
    return () => window.clearInterval(id);
  }, [isPlaying]);

  const playItem = useCallback((item: PlayableItem, queue?: PlayableItem[]) => {
    dispatch({ type: "play-item", item, queue: queue ?? [item], seed: seed() });
  }, []);

  const value = useMemo<PlayerApi>(
    () => ({
      state,
      current: currentItem(state),
      playItem,
      togglePlay: () => dispatch({ type: "toggle" }),
      next: () => dispatch({ type: "next" }),
      prev: () => dispatch({ type: "prev" }),
      seek: (position) => dispatch({ type: "seek", position }),
      toggleShuffle: () => dispatch({ type: "toggle-shuffle", seed: seed() }),
      toggleRepeat: () => dispatch({ type: "toggle-repeat" }),
      setVolume: (volume) => dispatch({ type: "set-volume", volume }),
      toggleMute: () => dispatch({ type: "toggle-mute" }),
    }),
    [state, playItem],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerApi {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used inside <PlayerProvider>");
  return ctx;
}

/**
 * Playback wiring for a card whose play button starts a whole queue
 * (album, artist, playlist, show). "Active" = the current item is in it.
 */
export function useQueuePlayback(queue: PlayableItem[]) {
  const { current, state, playItem, togglePlay } = usePlayer();
  const isActive = current !== undefined && queue.some((q) => q.id === current.id);
  const toggle = () => {
    if (isActive) togglePlay();
    else if (queue.length > 0) playItem(queue[0], queue);
  };
  return { isActive, isPlaying: isActive && state.isPlaying, toggle, canPlay: queue.length > 0 };
}
