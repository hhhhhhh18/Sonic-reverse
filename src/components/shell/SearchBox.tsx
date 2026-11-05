"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { safeDecode } from "@/lib/format";
import { BrowseIcon, CloseIcon, SearchIcon } from "@/components/ui/Icons";
import { useNotice } from "./NoticeProvider";

/** How long to wait after the last keystroke before navigating (our choice; not measured). */
const DEBOUNCE_MS = 250;
const MAX_QUERY_LENGTH = 100;

function parseSearchPath(pathname: string): { query: string; filter: string | null } | null {
  const match = pathname.match(/^\/search\/([^/]+)(?:\/([^/]+))?\/?$/);
  if (!match) return null;
  return { query: safeDecode(match[1]), filter: match[2] ?? null };
}

/**
 * Search field. Typing navigates to /search/<query> client-side (no Enter,
 * no document reload), as observed on the reference page. Details the
 * captures did not show are our own choices: the debounce delay, using
 * history.replace once already on a search route, keeping the active filter,
 * and returning home when the field is emptied.
 */
export function SearchBox({ autoFocus = false }: { autoFocus?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const { notImplemented } = useNotice();
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<number | undefined>(undefined);

  const parsed = parseSearchPath(pathname);
  const routeQuery = parsed?.query ?? null;

  const [value, setValue] = useState(routeQuery ?? "");
  // The query we last asked the router to show. Lets us tell "the URL caught
  // up with what I typed" apart from "something else navigated" (back button,
  // a link click), where the field must follow the URL instead.
  const [requested, setRequested] = useState<string | null>(routeQuery);
  const [seenRouteQuery, setSeenRouteQuery] = useState<string | null>(routeQuery);

  if (routeQuery !== seenRouteQuery) {
    setSeenRouteQuery(routeQuery);
    if (routeQuery !== requested) {
      setValue(routeQuery ?? "");
      setRequested(routeQuery);
    }
  }

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const navigateFor = (text: string) => {
    const q = text.trim();
    if (!q) {
      setRequested(null);
      if (parsed) router.push("/");
      return;
    }
    setRequested(q);
    const href = `/search/${encodeURIComponent(q)}${parsed?.filter ? `/${parsed.filter}` : ""}`;
    if (parsed) router.replace(href);
    else router.push(href);
  };

  const schedule = (text: string) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => navigateFor(text), DEBOUNCE_MS);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // Enter isn't required (results load as you type); it just skips the wait.
    if (event.key === "Enter") {
      window.clearTimeout(timer.current);
      navigateFor(value);
    }
  };

  return (
    <div role="search" className="flex min-w-0 flex-1 items-center">
      <div className="flex h-12 min-w-0 flex-1 items-center gap-1 rounded-full bg-elevated px-3 text-subtle ring-white transition focus-within:ring-2 hover:bg-raised">
        <button
          type="button"
          aria-label="Search"
          onClick={() => inputRef.current?.focus()}
          className="grid size-8 shrink-0 place-items-center text-2xl hover:text-white"
        >
          <SearchIcon />
        </button>
        {/*
          role="combobox" mirrors the accessible structure captured from the
          reference page (a combobox named "What do you want to play?"). This
          demo has no suggestion popup, so aria-expanded stays false.
        */}
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label="What do you want to play?"
          aria-expanded={false}
          aria-controls="search-status"
          aria-autocomplete="none"
          autoComplete="off"
          spellCheck={false}
          autoFocus={autoFocus}
          maxLength={MAX_QUERY_LENGTH}
          placeholder="What do you want to play?"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            schedule(event.target.value);
          }}
          onKeyDown={onKeyDown}
          className="h-full min-w-0 flex-1 bg-transparent px-1 text-base text-white outline-none placeholder:text-subtle"
        />
        {value && (
          <button
            type="button"
            aria-label="Clear search field"
            onClick={() => {
              window.clearTimeout(timer.current);
              setValue("");
              navigateFor("");
              inputRef.current?.focus();
            }}
            className="grid size-8 shrink-0 place-items-center text-xl hover:text-white"
          >
            <CloseIcon />
          </button>
        )}
        <span aria-hidden="true" className="mx-1 hidden h-6 w-px bg-white/30 sm:block" />
        <button
          type="button"
          aria-label="Browse"
          onClick={() => notImplemented("Browse")}
          className="hidden size-8 shrink-0 place-items-center text-2xl hover:text-white sm:grid"
        >
          <BrowseIcon />
        </button>
      </div>
      <div id="search-status" role="status" className="sr-only">
        {parsed ? "Search results" : ""}
      </div>
    </div>
  );
}
