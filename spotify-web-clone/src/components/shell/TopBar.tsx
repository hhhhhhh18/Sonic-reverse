"use client";

import Link from "next/link";
import { useState } from "react";
import { BrandMark } from "@/components/ui/BrandMark";
import { DownloadIcon, HomeIcon, LibraryIcon, SearchIcon } from "@/components/ui/Icons";
import { StubLink } from "@/components/ui/StubLink";
import { APP_NAME } from "@/lib/brand";
import { useNotice } from "./NoticeProvider";
import { SearchBox } from "./SearchBox";

const MENU_BUTTONS = ["Premium", "Support", "Download"] as const;

/** Header: logo, home, search, and (logged-out) account actions. */
export function TopBar({ onOpenLibrary }: { onOpenLibrary: () => void }) {
  const { notImplemented } = useNotice();
  // Below md the search field collapses behind an icon button.
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="flex items-center gap-2 py-2 pl-3 pr-3 sm:pl-7 sm:pr-7">
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          aria-label="Open Your Library"
          onClick={onOpenLibrary}
          className="grid size-10 place-items-center rounded-full text-2xl text-subtle hover:text-white md:hidden"
        >
          <LibraryIcon />
        </button>
        <Link
          href="/"
          aria-label={`${APP_NAME} home`}
          className="grid size-8 place-items-center rounded-full hover:scale-105"
        >
          <BrandMark className="size-8" />
        </Link>
      </div>

      <div className="ml-5 flex min-w-0 flex-1 items-center justify-start gap-2 md:ml-0 md:justify-center">
        <Link
          href="/"
          aria-label="Home"
          className="grid size-12 shrink-0 place-items-center rounded-full bg-elevated text-2xl hover:scale-105 hover:bg-raised"
        >
          <HomeIcon />
        </Link>
        <div className={`${searchOpen ? "flex" : "hidden"} min-w-0 max-w-xl flex-1 md:flex`}>
          <SearchBox autoFocus={searchOpen} />
        </div>
        {!searchOpen && (
          <button
            type="button"
            aria-label="Open search"
            onClick={() => setSearchOpen(true)}
            className="grid size-12 shrink-0 place-items-center rounded-full bg-elevated text-2xl text-subtle hover:text-white md:hidden"
          >
            <SearchIcon />
          </button>
        )}
      </div>

      <nav aria-label="Account" className="flex shrink-0 items-center gap-1 text-sm font-bold sm:gap-2">
        <div className="hidden items-center gap-1 lg:flex">
          {MENU_BUTTONS.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => notImplemented(`The ${name} menu`)}
              className="rounded-full px-2 py-1 text-subtle hover:text-white"
            >
              {name}
            </button>
          ))}
          <span aria-hidden="true" className="mx-1 h-6 w-px bg-white/30" />
        </div>
        <StubLink
          href="/download"
          feature="App downloads"
          className="hidden items-center gap-2 rounded-full px-3 py-1 text-subtle hover:text-white md:flex"
        >
          <DownloadIcon className="text-lg" /> Install App
        </StubLink>
        <button
          type="button"
          onClick={() => notImplemented("Sign up")}
          className="hidden rounded-full px-3 py-2 text-subtle hover:scale-105 hover:text-white sm:block"
        >
          Sign up
        </button>
        <button
          type="button"
          onClick={() => notImplemented("Log in")}
          className="rounded-full bg-white px-5 py-2.5 text-black hover:scale-105"
        >
          Log in
        </button>
      </nav>
    </header>
  );
}
