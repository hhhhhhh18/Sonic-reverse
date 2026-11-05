"use client";

import type { ReactNode } from "react";
import type { PlayableItem } from "@/data/types";
import { cn } from "@/lib/cn";
import { useQueuePlayback } from "@/components/shell/PlayerProvider";
import { Cover } from "@/components/ui/Cover";
import { PlayButton } from "@/components/ui/PlayButton";
import { StubLink } from "@/components/ui/StubLink";

interface MediaCardProps {
  href: string;
  title: string;
  /** Second line (artist links, "By owner", year, ...). */
  subtitle: ReactNode;
  coverSeed: string;
  /** Circular artwork (artists, profiles). */
  round?: boolean;
  /** What the play button plays. Omit for non-playable cards (profiles). */
  queue?: PlayableItem[];
  /** Used in the play button's accessible name. */
  playLabel?: string;
  /** Shown in the "not implemented" toast when the title is clicked. */
  detailFeature: string;
}

/** Card used on the home page, in search shelves and in filter grids. */
export function MediaCard({
  href,
  title,
  subtitle,
  coverSeed,
  round = false,
  queue,
  playLabel,
  detailFeature,
}: MediaCardProps) {
  const playback = useQueuePlayback(queue ?? []);
  const playable = queue !== undefined && playback.canPlay;

  return (
    <article className="group relative min-w-0 rounded-lg p-3 transition-colors hover:bg-white/10 focus-within:bg-white/10">
      <div className="relative">
        <Cover seed={coverSeed} round={round} className="aspect-square w-full shadow-lg" />
        {playable && (
          <PlayButton
            label={playLabel ?? title}
            playing={playback.isPlaying}
            onPress={playback.toggle}
            className={cn(
              "absolute bottom-2 right-2 translate-y-1 opacity-0 transition focus-visible:translate-y-0 focus-visible:opacity-100 group-hover:translate-y-0 group-hover:opacity-100",
              playback.isPlaying && "translate-y-0 opacity-100",
            )}
          />
        )}
      </div>
      <div className="mt-3 min-w-0">
        <StubLink
          href={href}
          feature={detailFeature}
          className="block truncate text-base font-bold hover:underline"
        >
          {title}
        </StubLink>
        <p className="mt-1 line-clamp-2 text-sm text-subtle">{subtitle}</p>
      </div>
    </article>
  );
}
