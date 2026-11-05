"use client";

import { GlobeIcon, PlusIcon } from "@/components/ui/Icons";
import { StubLink } from "@/components/ui/StubLink";
import { useNotice } from "./NoticeProvider";

const LEGAL_LINKS = [
  ["Legal", "/legal"],
  ["Safety & Privacy Center", "/privacy"],
  ["Privacy Policy", "/privacy-policy"],
  ["Cookies", "/legal/cookies"],
  ["About Ads", "/legal/ads"],
  ["Accessibility", "/accessibility"],
] as const;

/** Left column: Your Library with logged-out prompts, legal links, language. */
export function Sidebar() {
  const { notImplemented } = useNotice();

  return (
    <nav aria-label="Main" className="flex h-full min-h-0 flex-col rounded-lg bg-panel">
      {/* 16 + 36px button + 39 = 91px, so the first card starts 91px below the panel top (measured) */}
      <div className="flex items-center justify-between px-4 pb-[39px] pt-4">
        <h2 className="pl-1 text-base font-bold text-white">Your Library</h2>
        <button
          type="button"
          aria-label="Create"
          onClick={() => notImplemented("Creating playlists (needs an account)")}
          className="grid size-9 place-items-center rounded-full bg-elevated text-xl text-subtle hover:bg-raised hover:text-white"
        >
          <PlusIcon />
        </button>
      </div>

      <div className="scroll-thin flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-2 pb-2">
        <section className="rounded-lg bg-elevated p-5">
          <h3 className="font-bold">Create your first playlist</h3>
          <p className="mt-1 text-sm font-semibold">It&apos;s easy, we&apos;ll help you</p>
          <button
            type="button"
            onClick={() => notImplemented("Creating playlists (needs an account)")}
            className="mt-4 rounded-full bg-white px-4 py-1.5 text-sm font-bold text-black hover:scale-105"
          >
            Create playlist
          </button>
        </section>

        <section className="rounded-lg bg-elevated p-5">
          <h3 className="font-bold">Let&apos;s find some podcasts to follow</h3>
          <p className="mt-1 text-sm font-semibold">We&apos;ll keep you updated on new episodes</p>
          <StubLink
            href="/genre/podcasts"
            feature="Podcast browsing"
            className="mt-4 inline-block rounded-full bg-white px-4 py-1.5 text-sm font-bold text-black hover:scale-105"
          >
            Browse podcasts
          </StubLink>
        </section>

        <footer className="mt-auto px-2 pt-6">
          <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-subtle">
            {LEGAL_LINKS.map(([label, href]) => (
              <li key={label}>
                <StubLink href={href} feature={label} className="hover:underline">
                  {label}
                </StubLink>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => notImplemented("Language selection")}
            className="mt-6 mb-2 inline-flex items-center gap-2 rounded-full border border-white/40 px-3 py-1 text-sm font-bold hover:border-white hover:scale-105"
          >
            <GlobeIcon /> English
          </button>
        </footer>
      </div>
    </nav>
  );
}
