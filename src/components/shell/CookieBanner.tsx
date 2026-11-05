"use client";

import { useSyncExternalStore } from "react";
import { CloseIcon } from "@/components/ui/Icons";
import { StubLink } from "@/components/ui/StubLink";

const STORAGE_KEY = "web-player-clone:privacy-notice-dismissed";
const EVENT = "web-player-clone:privacy-notice";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false; // storage blocked: just show the banner each visit
  }
}

/**
 * Dismissible privacy banner, matching the reference's placement and shape.
 * Its wording is our own and describes what THIS demo does: unlike the real
 * site it sets no cookies and loads no trackers.
 */
export function CookieBanner() {
  // Server snapshot is `false` so the banner is part of the first paint.
  const dismissed = useSyncExternalStore(subscribe, readDismissed, () => false);
  if (dismissed) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* storage blocked; the event below still hides it for this session */
    }
    window.dispatchEvent(new Event(EVENT));
  };

  return (
    <div
      role="dialog"
      aria-label="Privacy"
      className="fixed inset-x-0 bottom-0 z-50 flex items-start gap-4 bg-[#eeeeee] px-4 py-4 text-black sm:items-center"
    >
      <p className="flex-1 text-sm leading-[21px]">
        This is an unofficial study recreation. It sets no cookies and loads no third-party
        trackers; your browser&apos;s local storage is used only to remember that you closed this
        notice. See the{" "}
        <StubLink href="/legal/cookies" feature="A cookie policy" className="font-bold underline">
          Cookie Policy
        </StubLink>
        .
      </p>
      <button
        type="button"
        aria-label="Close"
        onClick={dismiss}
        className="grid size-8 shrink-0 place-items-center rounded-full text-base hover:bg-black/10"
      >
        <CloseIcon />
      </button>
    </div>
  );
}
