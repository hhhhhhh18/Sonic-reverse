
"use client";

import { useState, type FormEvent } from "react";
import { createPlaylistAction } from "@/app/actions/playlists";
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

export function Sidebar() {
  const { notify, notImplemented } = useNotice();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  function openCreateDialog() {
    setPlaylistName("");
    setDialogOpen(true);
  }

  async function handleCreatePlaylist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isCreating) return;

    setIsCreating(true);

    try {
      const result = await createPlaylistAction(playlistName);

      if (!result.ok) {
        notify(result.error);
        return;
      }

      setDialogOpen(false);
      setPlaylistName("");
      notify("Your playlist was created successfully.");
    } catch {
      notify("Something went wrong. Please try again.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <>
      <nav aria-label="Main" className="flex h-full min-h-0 flex-col rounded-lg bg-panel">
        <div className="flex items-center justify-between px-4 pb-[39px] pt-4">
          <h2 className="pl-1 text-base font-bold text-white">Your Library</h2>
          <button
            type="button"
            aria-label="Create playlist"
            onClick={openCreateDialog}
            className="grid size-9 place-items-center rounded-full bg-elevated text-xl text-subtle hover:bg-raised hover:text-white"
          >
            <PlusIcon />
          </button>
        </div>

        <div className="scroll-thin flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-2 pb-2">
          <section className="rounded-lg bg-elevated p-5">
            <h3 className="font-bold">Create your first playlist</h3>
            <p className="mt-1 text-sm font-semibold">
              It&apos;s easy, we&apos;ll help you
            </p>
            <button
              type="button"
              onClick={openCreateDialog}
              className="mt-4 rounded-full bg-white px-4 py-1.5 text-sm font-bold text-black hover:scale-105"
            >
              Create playlist
            </button>
          </section>

          <section className="rounded-lg bg-elevated p-5">
            <h3 className="font-bold">Let&apos;s find some podcasts to follow</h3>
            <p className="mt-1 text-sm font-semibold">
              We&apos;ll keep you updated on new episodes
            </p>
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

      {dialogOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isCreating) {
              setDialogOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-playlist-title"
            className="w-full max-w-md rounded-xl bg-[#282828] p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 id="create-playlist-title" className="text-xl font-bold">
                Create a playlist
              </h2>
              <button
                type="button"
                aria-label="Close dialog"
                disabled={isCreating}
                onClick={() => setDialogOpen(false)}
                className="rounded-full p-2 text-subtle hover:bg-white/10 hover:text-white disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <p className="mt-2 text-sm text-subtle">
              Give your new playlist a name.
            </p>

            <form onSubmit={handleCreatePlaylist} className="mt-6">
              <label
                htmlFor="playlist-name"
                className="mb-2 block text-sm font-bold"
              >
                Playlist name
              </label>
              <input
                id="playlist-name"
                name="name"
                type="text"
                required
                minLength={1}
                maxLength={100}
                autoFocus
                value={playlistName}
                onChange={(event) => setPlaylistName(event.target.value)}
                placeholder="My playlist"
                className="w-full rounded-md border border-transparent bg-[#3e3e3e] px-3 py-3 text-sm text-white outline-none focus:border-white"
              />

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={isCreating}
                  onClick={() => setDialogOpen(false)}
                  className="rounded-full px-5 py-3 text-sm font-bold hover:scale-105 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !playlistName.trim()}
                  className="rounded-full bg-white px-6 py-3 text-sm font-bold text-black hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCreating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
