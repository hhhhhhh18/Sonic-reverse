"use client";

import type { Episode } from "@/data/types";
import { cn } from "@/lib/cn";
import { formatDuration } from "@/lib/format";
import { coverSeed, episodeToPlayable, getShow } from "@/lib/catalog";
import { usePlayer } from "@/components/shell/PlayerProvider";
import { Cover } from "@/components/ui/Cover";
import { PauseIcon, PlayIcon } from "@/components/ui/Icons";
import { StubLink } from "@/components/ui/StubLink";

/** A podcast episode row: new-episode badge, title, date • duration, play action. */
export function EpisodeRow({ episode, queue }: { episode: Episode; queue: Episode[] }) {
  const { current, state, playItem } = usePlayer();
  const item = episodeToPlayable(episode);
  const show = getShow(episode.showId);
  const isCurrent = current?.id === item.id;
  const playing = isCurrent && state.isPlaying;
  const minutes = Math.max(1, Math.round(episode.durationSec / 60));

  return (
    <li className="group flex items-center gap-3 rounded-md px-2 py-2 hover:bg-white/10 focus-within:bg-white/10">
      <div className="relative size-16 shrink-0">
        <Cover seed={coverSeed.show(show.id)} className="size-16" />
      </div>
      <div className="min-w-0 flex-1">
        {episode.isNew && (
          <span className="mb-0.5 inline-block rounded bg-accent px-1.5 py-0.5 text-xs font-bold text-black">
            New episode
          </span>
        )}
        <StubLink
          href={`/episode/${episode.id}`}
          feature="Episode pages"
          className={cn("block truncate font-bold hover:underline", isCurrent && "text-accent")}
        >
          {episode.title}
        </StubLink>
        <p className="truncate text-sm text-subtle">
          {show.title} • {episode.dateLabel} • {minutes} min
        </p>
      </div>
      <span className="hidden text-sm tabular-nums text-subtle sm:block">
        {formatDuration(episode.durationSec)}
      </span>
      <button
        type="button"
        aria-label={`${playing ? "Pause" : "Play"} ${episode.title}`}
        onClick={() => playItem(item, queue.map(episodeToPlayable))}
        className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-xl text-black hover:scale-105"
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
    </li>
  );
}
