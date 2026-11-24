import type { FieldErrors } from "./validation";

export interface AuthErrorLike {
  code?: string;
  message?: string;
  status?: number;
}

export type AuthContext = "login" | "register" | "oauth";

export interface MappedError {
  message?: string;
  fieldErrors?: FieldErrors;
}

const RATE_LIMITED = new Set(["over_request_rate_limit", "over_email_send_rate_limit", "over_sms_send_rate_limit"]);

/**
 * Turns a Supabase Auth error into text that is safe and useful to show.
 * The raw message is never shown: it can contain internals, and for login failures
 * the wording must stay identical for "unknown email" and "wrong password" so
 * the form doesn't reveal which emails have accounts.
 */
export function describeAuthError(error: AuthErrorLike, context: AuthContext): MappedError {
  const code = error.code ?? "";
  if (RATE_LIMITED.has(code) || error.status === 429) {
    return { message: "Too many attempts. Please wait a few minutes and try again." };
  }

  if (context === "login") {
    if (code === "invalid_credentials") return { message: "Incorrect email or password." };
    if (code === "email_not_confirmed") return { message: "Confirm your email address first: check your inbox for the link we sent." };
    if (code === "user_banned") return { message: "This account has been disabled." };
    return { message: "We couldn't log you in. Please try again." };
  }

  if (context === "register") {
    if (code === "user_already_exists" || code === "email_exists") {
      return { fieldErrors: { email: "An account with this email already exists. Try logging in." } };
    }
    if (code === "weak_password") return { fieldErrors: { password: "Choose a stronger password." } };
    if (code === "email_address_invalid") return { fieldErrors: { email: "That email address can't be used." } };
    if (code === "signup_disabled") return { message: "Sign-ups are currently disabled." };
    return { message: "We couldn't create your account. Please try again." };
  }

  if (code === "provider_disabled") return { message: "Google sign-in isn't enabled for this project yet." };
  return { message: "We couldn't start Google sign-in. Please try again." };
}

/** Messages for /login?error=<code>, which the callback routes and Google action redirect to. */
export const LOGIN_PAGE_ERRORS: Record<string, string> = {
  oauth: "Google sign-in was cancelled or failed. Please try again.",
  provider: "Google sign-in isn't enabled for this project yet.",
  callback: "That sign-in link is invalid or has expired. Please try again.",
  confirm: "That confirmation link is invalid or has expired. Try logging in, or sign up again.",
  config: "Accounts aren't set up on this server yet.",
};

/** Looks up a ?error= code from the URL. The code is attacker-controlled, so only own keys count. */
export function loginPageError(code: string | undefined): string | undefined {
  return code && Object.prototype.hasOwnProperty.call(LOGIN_PAGE_ERRORS, code) ? LOGIN_PAGE_ERRORS[code] : undefined;
}
