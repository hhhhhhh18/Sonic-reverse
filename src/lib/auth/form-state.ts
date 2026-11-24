import type { FieldErrors } from "./validation";

/** State returned by auth Server Actions to their forms (via useActionState). Never contains a password. */
export interface FormState {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: FieldErrors;
  /** Non-secret values to put back into the form after an error. */
  values?: Record<string, string>;
}

export const initialFormState: FormState = { status: "idle" };

export const NOT_CONFIGURED_MESSAGE =
  "Accounts aren't set up on this server yet. Add your Supabase keys to .env.local (see the README).";
