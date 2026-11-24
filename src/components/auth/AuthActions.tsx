"use client";

import Link from "next/link";
import { NOT_CONFIGURED_MESSAGE } from "@/lib/auth/form-state";
import { useNotice } from "@/components/shell/NoticeProvider";
import { useAuth } from "./AuthProvider";
import { UserMenu } from "./UserMenu";

/** The Sign up / Log in buttons in the header, or the account menu when signed in. */
export function AuthActions() {
  const auth = useAuth();
  const { notify } = useNotice();

  if (auth.user) return <UserMenu user={auth.user} />;

  const signUp = "hidden rounded-full px-3 py-2 text-subtle hover:scale-105 hover:text-white sm:block";
  const logIn = "rounded-full bg-white px-5 py-2.5 text-black hover:scale-105";

  if (auth.enabled) {
    return (
      <>
        <Link href="/register" className={signUp}>
          Sign up
        </Link>
        <Link href="/login" className={logIn}>
          Log in
        </Link>
      </>
    );
  }
  // Accounts aren't configured on this server: keep the buttons, explain why they do nothing yet.
  return (
    <>
      <button type="button" onClick={() => notify(NOT_CONFIGURED_MESSAGE)} className={signUp}>
        Sign up
      </button>
      <button type="button" onClick={() => notify(NOT_CONFIGURED_MESSAGE)} className={logIn}>
        Log in
      </button>
    </>
  );
}
