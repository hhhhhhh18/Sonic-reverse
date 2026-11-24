import { googleSignInAction } from "@/lib/auth/actions";
import { SubmitButton } from "./fields";

/** "Continue with Google". A separate form, because forms can't be nested. */
export function GoogleButton({ next }: { next: string }) {
  return (
    <form action={googleSignInAction}>
      <input type="hidden" name="next" value={next} />
      <SubmitButton variant="outline" pendingText="Redirecting to Google…">
        <span className="inline-flex items-center justify-center gap-2">
          <span
            aria-hidden="true"
            className="grid size-5 place-items-center rounded-full bg-white text-xs font-bold text-black"
          >
            G
          </span>
          Continue with Google
        </span>
      </SubmitButton>
    </form>
  );
}
