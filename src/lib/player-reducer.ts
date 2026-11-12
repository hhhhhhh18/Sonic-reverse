import type { PlayableItem } from "@/data/types";

/**
 * Player state. Two kinds of items share it:
 *  - mock items (no `videoId`): playback is simulated by `tick` actions;
 *  - YouTube items (`videoId`): an external engine owns the clock and reports it
 *    back through `sync` / `ended` / `engine-playing` / `item-failed`.
 */
export interface PlayerState {
  queue: PlayableItem[];
  /** Playback order as indexes into `queue` (identity unless shuffled). */
  order: number[];
  /** Index into `order`; -1 when nothing has been loaded. */
  orderPos: number;
  isPlaying: boolean;
  position: number;
  shuffle: boolean;
  repeat: boolean;
  volume: number;
  muted: boolean;
  /** Real duration reported by the engine; null for mock items or until known. */
  liveDuration: number | null;
  /** Bumped on every seek request so an engine knows to move its playhead. */
  seekNonce: number;
  /** Bumped whenever (re)starting the current item is requested, even if it is the same item. */
  playNonce: number;
  /** Whether the visible video panel is open. Playback of a YouTube item always opens it. */
  videoPanelOpen: boolean;
}

export const initialPlayerState: PlayerState = {
  queue: [],
  order: [],
  orderPos: -1,
  isPlaying: false,
  position: 0,
  shuffle: false,
  repeat: false,
  volume: 70,
  muted: false,
  liveDuration: null,
  seekNonce: 0,
  playNonce: 0,
  videoPanelOpen: false,
};

export type PlayerAction =
  | { type: "play-item"; item: PlayableItem; queue: PlayableItem[]; seed: number }
  | { type: "toggle" }
  | { type: "next" }
  | { type: "prev" }
  | { type: "tick"; dt: number }
  | { type: "seek"; position: number }
  | { type: "toggle-shuffle"; seed: number }
  | { type: "toggle-repeat" }
  | { type: "set-volume"; volume: number }
  | { type: "toggle-mute" }
  // --- reported by an external playback engine (YouTube) ---
  | { type: "sync"; position: number; duration?: number }
  | { type: "ended" }
  | { type: "item-failed" }
  | { type: "engine-playing"; playing: boolean }
  | { type: "close-video" }
  | { type: "open-video" };

/** Small deterministic PRNG so the reducer stays pure and testable. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Identity order, or a shuffled order that starts at `startIndex`. */
export function makeOrder(
  length: number,
  startIndex: number,
  shuffle: boolean,
  rand: () => number,
): number[] {
  const all = Array.from({ length }, (_, i) => i);
  if (!shuffle) return all;
  const rest = all.filter((i) => i !== startIndex);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return [startIndex, ...rest];
}

export function currentItem(state: PlayerState): PlayableItem | undefined {
  if (state.orderPos < 0) return undefined;
  return state.queue[state.order[state.orderPos]];
}

/** Duration to show: the engine's real value when known, else the item's catalogued length. */
export function effectiveDuration(state: PlayerState): number {
  return state.liveDuration ?? currentItem(state)?.durationSec ?? 0;
}

export function hasNext(state: PlayerState): boolean {
  return state.orderPos >= 0 && (state.orderPos < state.order.length - 1 || state.repeat);
}

function goTo(state: PlayerState, orderPos: number): PlayerState {
  const item = state.queue[state.order[orderPos]];
  return {
    ...state,
    orderPos,
    position: 0,
    isPlaying: true,
    liveDuration: null,
    playNonce: state.playNonce + 1,
    videoPanelOpen: item?.videoId ? true : state.videoPanelOpen,
  };
}

/** What happens when the current item plays to its end. */
function afterTrackEnd(state: PlayerState): PlayerState {
  if (state.orderPos < state.order.length - 1) return goTo(state, state.orderPos + 1);
  if (state.repeat) return goTo(state, 0);
  return { ...state, isPlaying: false, position: 0 };
}

export function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case "play-item": {
      if (currentItem(state)?.id === action.item.id) {
        const isPlaying = !state.isPlaying;
        return {
          ...state,
          isPlaying,
          videoPanelOpen: action.item.videoId && isPlaying ? true : state.videoPanelOpen,
        };
      }
      const queue = action.queue.some((q) => q.id === action.item.id)
        ? action.queue
        : [action.item, ...action.queue];
      const startIndex = queue.findIndex((q) => q.id === action.item.id);
      const order = makeOrder(queue.length, startIndex, state.shuffle, mulberry32(action.seed));
      return {
        ...state,
        queue,
        order,
        orderPos: order.indexOf(startIndex),
        position: 0,
        isPlaying: true,
        liveDuration: null,
        playNonce: state.playNonce + 1,
        videoPanelOpen: action.item.videoId ? true : state.videoPanelOpen,
      };
    }
    case "toggle": {
      const item = currentItem(state);
      if (!item) return state;
      const isPlaying = !state.isPlaying;
      return {
        ...state,
        isPlaying,
        videoPanelOpen: item.videoId && isPlaying ? true : state.videoPanelOpen,
      };
    }
    case "next": {
      if (state.orderPos < 0) return state;
      if (state.orderPos < state.order.length - 1) return goTo(state, state.orderPos + 1);
      return state.repeat ? goTo(state, 0) : state;
    }
    case "prev": {
      if (state.orderPos < 0) return state;
      // Like most players: restart the track first, go back only near its start.
      if (state.position > 3 || state.orderPos === 0) {
        return { ...state, position: 0, seekNonce: state.seekNonce + 1 };
      }
      return goTo(state, state.orderPos - 1);
    }
    case "tick": {
      const item = currentItem(state);
      // YouTube items are clocked by the engine, never by the simulated timer.
      if (!item || !state.isPlaying || item.videoId) return state;
      const position = state.position + action.dt;
      return position < item.durationSec ? { ...state, position } : afterTrackEnd(state);
    }
    case "seek": {
      const item = currentItem(state);
      if (!item) return state;
      const duration = state.liveDuration ?? item.durationSec;
      return {
        ...state,
        position: Math.min(Math.max(0, action.position), duration),
        seekNonce: state.seekNonce + 1,
      };
    }
    case "toggle-shuffle": {
      const shuffle = !state.shuffle;
      if (state.orderPos < 0) return { ...state, shuffle };
      const currentIndex = state.order[state.orderPos];
      const order = makeOrder(state.queue.length, currentIndex, shuffle, mulberry32(action.seed));
      return { ...state, shuffle, order, orderPos: order.indexOf(currentIndex) };
    }
    case "toggle-repeat":
      return { ...state, repeat: !state.repeat };
    case "set-volume":
      return {
        ...state,
        volume: Math.min(100, Math.max(0, Math.round(action.volume))),
        muted: false,
      };
    case "toggle-mute":
      return { ...state, muted: !state.muted };

    case "sync": {
      const item = currentItem(state);
      if (!item?.videoId) return state;
      const position = Math.max(0, action.position);
      const duration = action.duration && action.duration > 0 ? action.duration : state.liveDuration;
      if (Math.abs(position - state.position) < 0.05 && duration === state.liveDuration) return state;
      return { ...state, position, liveDuration: duration };
    }
    case "ended":
      return currentItem(state) ? afterTrackEnd(state) : state;
    case "item-failed": {
      if (state.orderPos < 0) return state;
      // Never wraps around on failure, so a queue of unplayable videos can't loop forever.
      if (state.orderPos < state.order.length - 1) return goTo(state, state.orderPos + 1);
      return { ...state, isPlaying: false, position: 0 };
    }
    case "engine-playing": {
      if (!currentItem(state) || state.isPlaying === action.playing) return state;
      return { ...state, isPlaying: action.playing };
    }
    case "close-video":
      // Closing the player pauses it: a YouTube video must never keep playing while hidden.
      return currentItem(state)?.videoId
        ? { ...state, videoPanelOpen: false, isPlaying: false }
        : state;
    case "open-video":
      return currentItem(state)?.videoId ? { ...state, videoPanelOpen: true } : state;
    default:
      return state;
  }
}
