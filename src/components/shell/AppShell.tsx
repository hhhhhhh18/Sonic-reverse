"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { CookieBanner } from "./CookieBanner";
import { NoticeProvider } from "./NoticeProvider";
import { NowPlayingBar } from "./NowPlayingBar";
import { PlayerProvider } from "./PlayerProvider";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

const SIDEBAR_MIN = 280;
const SIDEBAR_MAX = 420;
// Observed slider values: 280 at a 640px viewport, 290 at 1280px. A viewport-relative
// clamp reproduces both (and 280 for everything narrower), so SSR and client agree.
const SIDEBAR_DEFAULT_CSS = "clamp(280px, 22.66vw, 420px)";

function Frame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);
  // null = untouched default; a number = the user dragged or used the arrow keys.
  const [customWidth, setCustomWidth] = useState<number | null>(null);
  const [measuredWidth, setMeasuredWidth] = useState(290);
  const sidebarObserver = useRef<ResizeObserver | null>(null);
  const sidebarRef = useCallback((node: HTMLDivElement | null) => {
    sidebarObserver.current?.disconnect();
    if (!node) return;
    sidebarObserver.current = new ResizeObserver(() =>
      setMeasuredWidth(Math.round(node.getBoundingClientRect().width)),
    );
    sidebarObserver.current.observe(node);
  }, []);
  const sidebarWidth = customWidth ?? measuredWidth;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);

  // Close the mobile drawer whenever the route changes.
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setDrawerOpen(false);
  }

  // The scrolling panel isn't the window, so reset it ourselves on navigation.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  const clamp = (n: number) => Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, n));

  const onResizeKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") setCustomWidth(clamp(sidebarWidth - 10));
    else if (event.key === "ArrowRight") setCustomWidth(clamp(sidebarWidth + 10));
    else return;
    event.preventDefault();
  };
  const onResizeMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.buttons !== 1) return;
    setCustomWidth(clamp(event.clientX - 8)); // 8px = outer gutter
  };

  return (
    <div className="grid h-dvh grid-rows-[auto_minmax(0,1fr)_auto] bg-black text-white">
      <a
        href="#main-view"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[80] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:font-bold focus:text-black"
      >
        Skip to main content
      </a>
      <TopBar onOpenLibrary={() => setDrawerOpen(true)} />

      <div className="flex min-h-0 px-2">
        {/* Desktop sidebar */}
        <div
          ref={sidebarRef}
          className="hidden shrink-0 md:block"
          style={{ width: customWidth ?? SIDEBAR_DEFAULT_CSS }}
        >
          <Sidebar />
        </div>
        <div
          role="slider"
          tabIndex={0}
          aria-label="Resize main navigation"
          aria-orientation="horizontal"
          aria-valuemin={SIDEBAR_MIN}
          aria-valuemax={SIDEBAR_MAX}
          aria-valuenow={sidebarWidth}
          onKeyDown={onResizeKey}
          onPointerDown={(event) => event.currentTarget.setPointerCapture(event.pointerId)}
          onPointerMove={onResizeMove}
          className="hidden w-2 shrink-0 cursor-col-resize touch-none rounded hover:bg-white/20 focus-visible:bg-white/30 md:block"
        />

        <div
          ref={scrollRef}
          className="scroll-thin main-panel min-w-0 flex-1 overflow-y-auto rounded-lg"
        >
          {children}
        </div>
      </div>

      <NowPlayingBar />

      {/* Mobile "Your Library" drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close Your Library"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-black/70"
          />
          <div className="absolute inset-y-0 left-0 w-[min(320px,85vw)] bg-black p-2">
            <Sidebar />
          </div>
        </div>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <NoticeProvider>
      <PlayerProvider>
        <Frame>{children}</Frame>
        <CookieBanner />
      </PlayerProvider>
    </NoticeProvider>
  );
}
