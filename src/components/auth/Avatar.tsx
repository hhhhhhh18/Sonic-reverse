"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

/** Profile picture with an initial as the fallback (no picture, or it fails to load). */
export function Avatar({
  name,
  src,
  size = "sm",
}: {
  name: string;
  src?: string | null;
  size?: "sm" | "lg";
}) {
  const [failed, setFailed] = useState(false);
  const initial = Array.from(name.trim())[0]?.toUpperCase() ?? "?";
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-accent font-bold text-black",
        size === "lg" ? "size-20 text-3xl" : "size-8 text-sm",
      )}
    >
      {initial}
      {src && !failed ? (
        // Plain <img>: user-supplied https links, so the Next image optimizer is deliberately not used.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          referrerPolicy="no-referrer"
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 size-full object-cover"
        />
      ) : null}
    </span>
  );
}
