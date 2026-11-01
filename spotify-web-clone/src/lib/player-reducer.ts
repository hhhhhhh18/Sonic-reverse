import type { PlayableItem } from "@/data/types";

/**
 * Mock playback state. No audio is produced anywhere in this app: "playing"
 * just advances `position` on a timer so the UI behaves like a player.
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
  | { type: "toggle-mute" };

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

export function hasNext(state: PlayerState): boolean {
  return state.orderPos >= 0 && (state.orderPos < state.order.length - 1 || state.repeat);
}

function goTo(state: PlayerState, orderPos: number): PlayerState {
  return { ...state, orderPos, position: 0, isPlaying: true };
}

export function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case "play-item": {
      if (currentItem(state)?.id === action.item.id) {
        return { ...state, isPlaying: !state.isPlaying };
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
      };
    }
    case "toggle":
      return currentItem(state) ? { ...state, isPlaying: !state.isPlaying } : state;
    case "next": {
      if (state.orderPos < 0) return state;
      if (state.orderPos < state.order.length - 1) return goTo(state, state.orderPos + 1);
      return state.repeat ? goTo(state, 0) : state;
    }
    case "prev": {
      if (state.orderPos < 0) return state;
      // Like most players: restart the track first, go back only near its start.
      if (state.position > 3 || state.orderPos === 0) return { ...state, position: 0 };
      return goTo(state, state.orderPos - 1);
    }
    case "tick": {
      const item = currentItem(state);
      if (!item || !state.isPlaying) return state;
      const position = state.position + action.dt;
      if (position < item.durationSec) return { ...state, position };
      if (state.orderPos < state.order.length - 1) return goTo(state, state.orderPos + 1);
      if (state.repeat) return goTo(state, 0);
      return { ...state, isPlaying: false, position: 0 };
    }
    case "seek": {
      const item = currentItem(state);
      if (!item) return state;
      return { ...state, position: Math.min(Math.max(0, action.position), item.durationSec) };
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
    default:
      return state;
  }
}
