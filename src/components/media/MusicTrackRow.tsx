"use client";

import { cn } from "@/lib/cn";
import { formatDuration } from "@/lib/format";
import { musicTrackByline, musicTrackToPlayable } from "@/lib/music/playable";
import type { MusicTrack } from "@/lib/music/types";
import { useNotice } from "@/components/shell/NoticeProvider";
import { usePlayer } from "@/components/shell/PlayerProvider";
import { Cover } from "@/components/ui/Cover";
import { HeartIcon, MoreIcon, PauseIcon, PlayIcon } from "@/components/ui/Icons";
import { StubLink } from "@/components/ui/StubLink";

/** A real (YouTube) song row: thumbnail, title, artists • album, duration and actions. */
export function MusicTrackRow({ track, queue }: { track: MusicTrack; queue: MusicTrack[] }) {
  const { current, state, playItem } = usePlayer();
  const { notImplemented } = useNotice();

  const item = musicTrackToPlayable(track);
  const isCurrent = current?.id === item.id;
  const playing = isCurrent && state.isPlaying;
  const byline = musicTrackByline(track);
  const label = `${track.title} by ${byline}`;

  return (
    <li className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md px-2 py-2 hover:bg-white/10 focus-within:bg-white/10">
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative size-10 shrink-0">
          <Cover seed={item.coverSeed} src={track.thumbnailUrl} className="size-10" />
          <button
            type="button"
            aria-label={`${playing ? "Pause" : "Play"} ${label}`}
            onClick={() => playItem(item, queue.map(musicTrackToPlayable))}
            className={cn(
              "absolute inset-0 grid place-items-center rounded-md bg-black/60 text-white opacity-0 focus-visible:opacity-100 group-hover:opacity-100",
              playing && "opacity-100",
            )}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>
        </div>
        <div className="min-w-0">
          <StubLink
            href={`/track/${track.videoId}`}
            feature="Track pages"
            className={cn("block truncate text-base hover:underline", isCurrent && "text-accent")}
          >
            {track.title}
          </StubLink>
          <p className="truncate text-sm text-subtle">
            {byline}
            {track.album ? ` • ${track.album}` : ""}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 text-subtle sm:gap-4">
        <button
          type="button"
          aria-label="Add to Liked Songs"
          onClick={() => notImplemented("Liked Songs (needs an account)")}
          className="text-xl opacity-0 hover:text-white focus-visible:opacity-100 group-hover:opacity-100"
        >
          <HeartIcon />
        </button>
        <span className="w-10 text-right text-sm tabular-nums">{formatDuration(track.durationSec)}</span>
        <button
          type="button"
          aria-label={`More options for ${label}`}
          onClick={() => notImplemented("The track options menu")}
          className="text-xl opacity-0 hover:text-white focus-visible:opacity-100 group-hover:opacity-100"
        >
          <MoreIcon />
        </button>
      </div>
    </li>
  );
}
