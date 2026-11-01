"use client";

import Link from "next/link";
import { Children, useCallback, useRef, useState, type ReactNode } from "react";

// Measured on the reference: 154px artwork + 12px padding each side = 178px
// card pitch, with no gap between cards.
const MIN_CARD = 178;

/**
 * A titled single row of cards. The number of cards shown follows the
 * available width (so nothing is hidden-but-focusable), and "Show all"
 * links to the full list.
 */
export function Shelf({
  title,
  showAllHref,
  children,
}: {
  title: string;
  showAllHref?: string;
  children: ReactNode;
}) {
  const items = Children.toArray(children);
  const [columns, setColumns] = useState(6);
  const observer = useRef<ResizeObserver | null>(null);

  // Callback ref: observe the grid as soon as it mounts, recompute on resize.
  const gridRef = useCallback((node: HTMLDivElement | null) => {
    observer.current?.disconnect();
    if (!node) return;
    const measure = () =>
      setColumns(Math.max(1, Math.floor(node.clientWidth / MIN_CARD)));
    observer.current = new ResizeObserver(measure);
    observer.current.observe(node);
  }, []);

  if (items.length === 0) return null;

  return (
    <section aria-label={title}>
      <div className="flex items-baseline justify-between gap-4 px-3">
        <h2 className="pb-2 text-xl font-bold leading-6">{title}</h2>
        {showAllHref && (
          <Link href={showAllHref} className="shrink-0 text-sm font-bold text-subtle hover:underline">
            Show all
          </Link>
        )}
      </div>
      <div
        ref={gridRef}
        className="grid"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {items.slice(0, columns)}
      </div>
    </section>
  );
}

/** Full (untruncated) responsive grid of cards. */
export function CardGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(178px,1fr))]">{children}</div>
  );
}
