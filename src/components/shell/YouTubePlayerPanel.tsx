"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { isValidVideoId } from "@/lib/music/parse";
import {
  describeYouTubeError,
  loadYouTubeIframeApi,
  YT_STATE,
  type YTPlayer,
} from "@/lib/youtube-iframe";
import { CloseIcon } from "@/components/ui/Icons";
import { useNotice } from "./NoticeProvider";
import { usePlayer } from "./PlayerProvider";

const POLL_MS = 250;
/** How long to wait for playback to begin before assuming the browser blocked autoplay. */
const AUTOPLAY_WATCHDOG_MS = 6000;
/** Ignore engine echoes (position, spurious pauses) briefly after we load or seek. */
const SETTLE_MS = 800;

/**
 * The visible YouTube player (the API terms require it to be shown, at least
 * 200x200) plus the bridge between it and the app's player state.
 *
 * Data flow: the reducer is the source of truth for *intent* (which item,
 * playing or paused, volume, seek requests). Effects below push that intent
 * into the YT.Player; the player's events and clock flow back through
 * syncFromEngine / engineEnded / engineFailed / setPlayingFromEngine.
 */
export function YouTubePlayerPanel() {
  const player = usePlayer();
  const { notify } = useNotice();
  const { state, current } = player;

  const rawId = current?.videoId;
  const videoId = isValidVideoId(rawId) ? rawId : undefined;
  const needsPlayer = videoId !== undefined;

  const mountRef = useRef<HTMLDivElement>(null);
  const ytRef = useRef<YTPlayer | null>(null);
  const [ready, setReady] = useState(false);
  const loaded = useRef<{ id: string; nonce: number } | null>(null);
  const lastSeekNonce = useRef(state.seekNonce);
  const settleUntil = useRef(0);
  const watchdog = useRef<number | undefined>(undefined);

  // Latest values for callbacks that are created once (YT event handlers).
  const latest = useRef({ player, notify, state });
  useEffect(() => {
    latest.current = { player, notify, state };
  });

  // 1. Create the YT.Player lazily, the first time a YouTube item is needed.
  useEffect(() => {
    if (!needsPlayer || ytRef.current) return;
    let cancelled = false;
    loadYouTubeIframeApi()
      .then((YT) => {
        const mount = mountRef.current;
        if (cancelled || ytRef.current || !mount) return;
        // YT replaces the element it is given, so give it a child React doesn't manage.
        const target = document.createElement("div");
        mount.appendChild(target);
        ytRef.current = new YT.Player(target, {
          width: "100%",
          height: "100%",
          host: "https://www.youtube-nocookie.com",
          playerVars: {
            playsinline: 1,
            rel: 0,
            enablejsapi: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: () => setReady(true),
            onStateChange: (event) => {
              const { player: p } = latest.current;
              if (event.data === YT_STATE.PLAYING) {
                window.clearTimeout(watchdog.current);
                p.setPlayingFromEngine(true);
              } else if (event.data === YT_STATE.PAUSED) {
                if (performance.now() >= settleUntil.current) p.setPlayingFromEngine(false);
              } else if (event.data === YT_STATE.ENDED) {
                p.engineEnded();
              }
            },
            onError: (event) => {
              window.clearTimeout(watchdog.current);
              latest.current.notify(describeYouTubeError(event.data));
              latest.current.player.engineFailed();
            },
          },
        });
      })
      .catch(() => {
        if (cancelled) return;
        latest.current.notify("Couldn't load the YouTube player. Check your connection or ad blocker.");
        latest.current.player.setPlayingFromEngine(false);
      });
    return () => {
      cancelled = true;
    };
  }, [needsPlayer]);

  // Tear the player down only when the whole app unmounts.
  useEffect(
    () => () => {
      window.clearTimeout(watchdog.current);
      ytRef.current?.destroy();
      ytRef.current = null;
    },
    [],
  );

  // 2. Load a new video whenever the current item (or a restart request) changes.
  useEffect(() => {
    const yt = ytRef.current;
    if (!ready || !yt) return;
    if (!videoId) {
      yt.stopVideo();
      loaded.current = null;
      return;
    }
    const prev = loaded.current;
    if (prev && prev.id === videoId && prev.nonce === state.playNonce) return;
    loaded.current = { id: videoId, nonce: state.playNonce };
    settleUntil.current = performance.now() + SETTLE_MS;
    window.clearTimeout(watchdog.current);
    if (state.isPlaying) {
      yt.loadVideoById({ videoId, startSeconds: 0 });
      watchdog.current = window.setTimeout(() => {
        const playerState = ytRef.current?.getPlayerState();
        if (
          latest.current.state.isPlaying &&
          playerState !== YT_STATE.PLAYING &&
          playerState !== YT_STATE.BUFFERING
        ) {
          latest.current.player.setPlayingFromEngine(false);
          latest.current.notify("Playback didn't start. Press play to continue.");
        }
      }, AUTOPLAY_WATCHDOG_MS);
    } else {
      yt.cueVideoById({ videoId, startSeconds: 0 });
    }
  }, [ready, videoId, state.playNonce, state.isPlaying]);

  // 3. Play / pause follows the app state.
  useEffect(() => {
    const yt = ytRef.current;
    if (!ready || !yt || !videoId || loaded.current?.id !== videoId) return;
    if (state.isPlaying) yt.playVideo();
    else yt.pauseVideo();
  }, [ready, videoId, state.isPlaying, state.playNonce]);

  // 4. Volume and mute.
  useEffect(() => {
    const yt = ytRef.current;
    if (!ready || !yt) return;
    yt.setVolume(state.volume);
    if (state.muted) yt.mute();
    else yt.unMute();
  }, [ready, state.volume, state.muted]);

  // 5. Seek requests.
  useEffect(() => {
    if (state.seekNonce === lastSeekNonce.current) return;
    lastSeekNonce.current = state.seekNonce;
    const yt = ytRef.current;
    if (!ready || !yt || !videoId) return;
    settleUntil.current = performance.now() + SETTLE_MS;
    yt.seekTo(state.position, true);
  }, [state.seekNonce, state.position, ready, videoId]);

  // 6. Report the real clock back while playing.
  useEffect(() => {
    if (!ready || !videoId || !state.isPlaying) return;
    const id = window.setInterval(() => {
      const yt = ytRef.current;
      if (!yt || performance.now() < settleUntil.current) return;
      if (yt.getVideoData().video_id !== videoId) return; // still showing the previous video
      const time = yt.getCurrentTime();
      const duration = yt.getDuration();
      if (Number.isFinite(time)) {
        latest.current.player.syncFromEngine(time, Number.isFinite(duration) ? duration : undefined);
      }
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [ready, videoId, state.isPlaying]);

  const visible = needsPlayer && state.videoPanelOpen;

  return (
    <section
      aria-label="YouTube video player"
      className={cn(
        visible
          ? // 400x225 (16:9); never smaller than YouTube's 200x200 minimum, even on narrow screens.
            "fixed bottom-[148px] right-3 z-30 w-[min(400px,calc(100vw-1.5rem))] overflow-hidden rounded-lg bg-black shadow-2xl ring-1 ring-white/15 md:bottom-[104px] md:right-4"
          : "hidden",
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <p className="min-w-0 flex-1 truncate text-sm font-bold">{current?.title}</p>
        <span className="shrink-0 text-xs text-subtle">YouTube</span>
        <button
          type="button"
          aria-label="Close video"
          onClick={player.closeVideo}
          className="grid size-7 shrink-0 place-items-center rounded-full text-base text-subtle hover:bg-white/10 hover:text-white"
        >
          <CloseIcon />
        </button>
      </div>
      <div ref={mountRef} data-testid="youtube-player-host" className="h-[225px] w-full bg-black" />
    </section>
  );
}
