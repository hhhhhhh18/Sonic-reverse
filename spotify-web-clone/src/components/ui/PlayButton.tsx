"use client";

import { cn } from "@/lib/cn";
import { PauseIcon, PlayIcon } from "./Icons";

const SIZES = {
  sm: "size-8 text-base",
  md: "size-12 text-xl",
  lg: "size-14 text-2xl",
} as const;

export function PlayButton({
  label,
  playing,
  onPress,
  size = "md",
  className,
  disabled,
}: {
  /** Name of the thing being played, e.g. "Slow Weather by Nova Lindqvist". */
  label: string;
  playing: boolean;
  onPress: () => void;
  size?: keyof typeof SIZES;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={`${playing ? "Pause" : "Play"} ${label}`}
      onClick={(event) => {
        event.stopPropagation();
        onPress();
      }}
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-accent text-black shadow-lg transition hover:scale-105 hover:bg-accent-hover disabled:opacity-40",
        SIZES[size],
        className,
      )}
    >
      {playing ? <PauseIcon /> : <PlayIcon />}
    </button>
  );
}
