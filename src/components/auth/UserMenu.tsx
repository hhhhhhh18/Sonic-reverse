"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { logoutAction } from "@/lib/auth/actions";
import type { AuthUser } from "@/lib/auth/types";
import { Avatar } from "./Avatar";

/** Avatar button with an account menu (header, right-hand side). */
export function UserMenu({ user }: { user: AuthUser }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const item = "block w-full rounded px-3 py-2.5 text-left text-sm hover:bg-white/10 focus-visible:bg-white/10";

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Account menu for ${user.displayName}`}
        onClick={() => setOpen((o) => !o)}
        className="grid size-10 place-items-center rounded-full bg-elevated hover:scale-105"
      >
        <Avatar name={user.displayName} src={user.avatarUrl} />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-12 z-50 w-64 rounded-lg bg-raised p-1 text-white shadow-2xl ring-1 ring-white/10"
        >
          <div className="border-b border-white/10 px-3 py-2">
            <p className="truncate font-bold">{user.displayName}</p>
            <p className="truncate text-sm text-subtle">{user.username ? `@${user.username}` : user.email}</p>
          </div>
          <Link role="menuitem" href="/account" onClick={() => setOpen(false)} className={item}>
            Account
          </Link>
          <form action={logoutAction}>
            <button role="menuitem" type="submit" className={item}>
              Log out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
