"use client";

import type { PlayableItem } from "@/data/types";
import { cn } from "@/lib/cn";
import { useQueuePlayback } from "@/components/shell/PlayerProvider";
import { Cover } from "@/components/ui/Cover";
import { PlayButton } from "@/components/ui/PlayButton";
import { StubLink } from "@/components/ui/StubLink";

export function TopResultCard({
  href,
  title,
  kindLabel,
  byline,
  coverSeed,
  round,
  queue,
  detailFeature,
}: {
  href: string;
  title: string;
  kindLabel: string;
  byline?: string;
  coverSeed: string;
  round?: boolean;
  queue: PlayableItem[];
  detailFeature: string;
}) {
  const playback = useQueuePlayback(queue);
  return (
    <div className="group relative rounded-lg bg-white/5 p-5 transition-colors hover:bg-white/10 focus-within:bg-white/10">
      <Cover seed={coverSeed} round={round} className="size-24 shadow-lg" />
      <StubLink
        href={href}
        feature={detailFeature}
        className="mt-5 block truncate text-3xl font-bold hover:underline"
      >
        {title}
      </StubLink>
      <p className="mt-2 text-sm text-subtle">
        <span className="rounded-full bg-black/40 px-3 py-1 font-bold text-white">{kindLabel}</span>
        {byline ? <span className="ml-2">{byline}</span> : null}
      </p>
      {playback.canPlay && (
        <PlayButton
          label={title}
          playing={playback.isPlaying}
          onPress={playback.toggle}
          size="lg"
          className={cn(
            "absolute bottom-5 right-5 translate-y-2 opacity-0 transition focus-visible:translate-y-0 focus-visible:opacity-100 group-hover:translate-y-0 group-hover:opacity-100",
            playback.isPlaying && "translate-y-0 opacity-100",
          )}
        />
      )}
    </div>
  );
}
