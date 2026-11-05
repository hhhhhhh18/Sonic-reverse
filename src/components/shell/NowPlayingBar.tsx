"use client";

import { cn } from "@/lib/cn";
import { formatDuration } from "@/lib/format";
import { hasNext } from "@/lib/player-reducer";
import { Cover } from "@/components/ui/Cover";
import {
  ExpandIcon,
  HeartIcon,
  MuteIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
  RepeatIcon,
  ShuffleIcon,
  VolumeIcon,
} from "@/components/ui/Icons";
import { useNotice } from "./NoticeProvider";
import { usePlayer } from "./PlayerProvider";

function IconButton({
  label,
  onClick,
  disabled,
  pressed,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid size-8 place-items-center text-xl transition",
        pressed ? "text-accent" : "text-subtle",
        "enabled:hover:text-white disabled:opacity-40",
        className,
      )}
    >
      {children}
    </button>
  );
}

/**
 * Bottom bar. With nothing loaded it is a "preview" state with disabled
 * controls (as captured from the logged-out reference). Once a mock track is
 * played it shows that track and simulated playback. No audio is produced.
 */
export function NowPlayingBar() {
  const player = usePlayer();
  const { notImplemented } = useNotice();
  const { state, current } = player;

  const hasTrack = current !== undefined;
  const duration = current?.durationSec ?? 0;
  const progressPct = duration > 0 ? (state.position / duration) * 100 : 0;
  const volumeShown = state.muted ? 0 : state.volume;

  return (
    <aside
      aria-label="Now playing bar"
      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 bg-black px-3 py-2 md:grid-cols-[minmax(180px,1fr)_minmax(0,1.6fr)_minmax(180px,1fr)] md:px-4"
    >
      {/* Left: current item, or the logged-out preview message */}
      <div className="flex min-w-0 items-center gap-3">
        {current ? (
          <>
            <Cover seed={current.coverSeed} className="size-14 shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{current.title}</p>
              <p className="truncate text-xs text-subtle">{current.byline}</p>
            </div>
            <IconButton
              label="Add to Liked Songs"
              onClick={() => notImplemented("Liked Songs (needs an account)")}
              className="hidden sm:grid"
            >
              <HeartIcon />
            </IconButton>
          </>
        ) : (
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">Preview mode</p>
            <p className="line-clamp-2 text-xs text-subtle">
              Play any song to try the mock player. No audio is produced.
            </p>
          </div>
        )}
      </div>

      {/* Center: transport controls + progress */}
      <div className="order-3 col-span-2 flex flex-col items-center gap-1 md:order-none md:col-span-1">
        <div className="flex items-center gap-2 sm:gap-3">
          <IconButton
            label={state.shuffle ? "Disable shuffle" : "Enable shuffle"}
            pressed={state.shuffle}
            disabled={!hasTrack}
            onClick={player.toggleShuffle}
            className="hidden sm:grid"
          >
            <ShuffleIcon />
          </IconButton>
          <IconButton label="Previous" disabled={!hasTrack} onClick={player.prev}>
            <PrevIcon />
          </IconButton>
          <button
            type="button"
            aria-label={state.isPlaying ? "Pause" : "Play"}
            disabled={!hasTrack}
            onClick={player.togglePlay}
            className="grid size-9 place-items-center rounded-full bg-white text-xl text-black transition enabled:hover:scale-105 disabled:opacity-40"
          >
            {state.isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>
          <IconButton label="Next" disabled={!hasTrack || !hasNext(state)} onClick={player.next}>
            <NextIcon />
          </IconButton>
          <IconButton
            label={state.repeat ? "Disable repeat" : "Enable repeat"}
            pressed={state.repeat}
            disabled={!hasTrack}
            onClick={player.toggleRepeat}
            className="hidden sm:grid"
          >
            <RepeatIcon />
          </IconButton>
        </div>
        <div className="flex w-full max-w-xl items-center gap-2 text-xs tabular-nums text-subtle">
          <span className="w-10 text-right">{hasTrack ? formatDuration(state.position) : "-:--"}</span>
          <input
            type="range"
            className="slider min-w-0 flex-1"
            aria-label="Change progress"
            aria-valuetext={hasTrack ? `${formatDuration(state.position)} of ${formatDuration(duration)}` : undefined}
            min={0}
            max={Math.max(duration, 1)}
            step={1}
            value={Math.floor(state.position)}
            disabled={!hasTrack}
            style={{ ["--pct" as string]: `${progressPct}%` }}
            onChange={(event) => player.seek(Number(event.target.value))}
          />
          <span className="w-10">{hasTrack ? formatDuration(duration) : "-:--"}</span>
        </div>
      </div>

      {/* Right: now-playing view, volume (state only), or the sign-up prompt */}
      <div className="hidden items-center justify-end gap-2 md:flex">
        {hasTrack ? (
          <>
            <IconButton
              label="Show Now Playing view"
              onClick={() => notImplemented("The Now Playing view")}
            >
              <ExpandIcon />
            </IconButton>
            <IconButton label={state.muted ? "Unmute" : "Mute"} onClick={player.toggleMute}>
              {state.muted || state.volume === 0 ? <MuteIcon /> : <VolumeIcon />}
            </IconButton>
            <input
              type="range"
              className="slider w-24"
              aria-label="Change volume"
              min={0}
              max={100}
              step={1}
              value={volumeShown}
              style={{ ["--pct" as string]: `${volumeShown}%` }}
              onChange={(event) => player.setVolume(Number(event.target.value))}
            />
          </>
        ) : (
          <button
            type="button"
            onClick={() => notImplemented("Sign up")}
            className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black hover:scale-105"
          >
            Sign up free
          </button>
        )}
      </div>
    </aside>
  );
}
