/**
 * Server-side validation for auth and profile forms. The same rules are enforced
 * again by the database constraints (see the migration), so this is for good error
 * messages, not the last line of defence.
 */
export type FieldName = "email" | "password" | "username" | "displayName" | "bio" | "avatarUrl";
export type FieldErrors = Partial<Record<FieldName, string>>;

type Check<T> = { ok: true; value: T } | { ok: false; error: string };

export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX_BYTES = 72; // bcrypt ignores everything after 72 bytes
export const DISPLAY_NAME_MAX = 50;
export const BIO_MAX = 280;
export const AVATAR_URL_MAX = 500;

const RESERVED_USERNAMES = new Set([
  "admin", "administrator", "root", "support", "help", "system", "sonic", "sonicreverse", "official",
  "moderator", "staff", "api", "auth", "login", "logout", "register", "signup", "account", "settings",
  "profile", "profiles", "null", "undefined", "anonymous",
]);

const length = (s: string) => Array.from(s).length; // code points, like Postgres char_length

const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

/** Form values arrive as FormDataEntryValue | null; anything but a string counts as empty. */
export function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function validateEmail(raw: unknown): Check<string> {
  const value = text(raw).trim().toLowerCase();
  if (!value) return { ok: false, error: "Enter your email address." };
  if (value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  return { ok: true, value };
}

export function validatePassword(raw: unknown): Check<string> {
  const value = text(raw); // never trimmed: spaces may be part of a password
  if (!value) return { ok: false, error: "Enter a password." };
  if (length(value) < PASSWORD_MIN) return { ok: false, error: `Use at least ${PASSWORD_MIN} characters.` };
  if (new TextEncoder().encode(value).length > PASSWORD_MAX_BYTES) {
    return { ok: false, error: `Use at most ${PASSWORD_MAX_BYTES} bytes (about 72 characters).` };
  }
  return { ok: true, value };
}

export function validateUsername(raw: unknown): Check<string> {
  const value = text(raw).trim().toLowerCase();
  if (!value) return { ok: false, error: "Choose a username." };
  if (!USERNAME_PATTERN.test(value)) {
    return { ok: false, error: "Use 3-20 characters: lowercase letters, numbers and underscores." };
  }
  if (RESERVED_USERNAMES.has(value)) return { ok: false, error: "That username isn't available." };
  return { ok: true, value };
}

export function validateDisplayName(raw: unknown): Check<string> {
  const value = text(raw).replace(CONTROL_CHARS, "").replace(/\s+/g, " ").trim();
  if (!value) return { ok: false, error: "Enter a display name." };
  if (length(value) > DISPLAY_NAME_MAX) return { ok: false, error: `Use at most ${DISPLAY_NAME_MAX} characters.` };
  return { ok: true, value };
}

/** Empty bio is allowed and stored as null. */
export function validateBio(raw: unknown): Check<string | null> {
  const value = text(raw).replace(/\r\n/g, "\n").replace(CONTROL_CHARS, "").trim();
  if (length(value) > BIO_MAX) return { ok: false, error: `Use at most ${BIO_MAX} characters.` };
  return { ok: true, value: value || null };
}

/** Empty avatar is allowed (stored as null); otherwise it must be an https URL. */
export function validateAvatarUrl(raw: unknown): Check<string | null> {
  const value = text(raw).trim();
  if (!value) return { ok: true, value: null };
  if (value.length > AVATAR_URL_MAX) return { ok: false, error: `Use a link shorter than ${AVATAR_URL_MAX} characters.` };
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || /\s/.test(value)) throw new Error("scheme");
  } catch {
    return { ok: false, error: "Use a full https:// image link." };
  }
  return { ok: true, value };
}

export type Validated<T> = { ok: true; value: T } | { ok: false; errors: FieldErrors };

export function validateRegistration(form: {
  email: unknown;
  password: unknown;
  username: unknown;
  displayName: unknown;
}): Validated<{ email: string; password: string; username: string; displayName: string }> {
  const errors: FieldErrors = {};
  const email = validateEmail(form.email);
  const password = validatePassword(form.password);
  const username = validateUsername(form.username);
  // Display name is optional at sign-up; it defaults to the username.
  const rawDisplay = text(form.displayName).trim();
  const display = rawDisplay ? validateDisplayName(rawDisplay) : null;

  if (!email.ok) errors.email = email.error;
  if (!password.ok) errors.password = password.error;
  if (!username.ok) errors.username = username.error;
  if (display && !display.ok) errors.displayName = display.error;
  if (!email.ok || !password.ok || !username.ok || (display && !display.ok)) return { ok: false, errors };
  return {
    ok: true,
    value: {
      email: email.value,
      password: password.value,
      username: username.value,
      displayName: display && display.ok ? display.value : username.value,
    },
  };
}

export function validateLogin(form: { email: unknown; password: unknown }): Validated<{ email: string; password: string }> {
  const errors: FieldErrors = {};
  const email = validateEmail(form.email);
  const password = text(form.password);
  if (!email.ok) errors.email = email.error;
  if (!password) errors.password = "Enter your password.";
  if (!email.ok || !password) return { ok: false, errors };
  return { ok: true, value: { email: email.value, password } };
}

export function validateProfileUpdate(form: {
  username: unknown;
  displayName: unknown;
  bio: unknown;
  avatarUrl: unknown;
}): Validated<{ username: string; display_name: string; bio: string | null; avatar_url: string | null }> {
  const errors: FieldErrors = {};
  const username = validateUsername(form.username);
  const displayName = validateDisplayName(form.displayName);
  const bio = validateBio(form.bio);
  const avatar = validateAvatarUrl(form.avatarUrl);
  if (!username.ok) errors.username = username.error;
  if (!displayName.ok) errors.displayName = displayName.error;
  if (!bio.ok) errors.bio = bio.error;
  if (!avatar.ok) errors.avatarUrl = avatar.error;
  if (!username.ok || !displayName.ok || !bio.ok || !avatar.ok) return { ok: false, errors };
  return {
    ok: true,
    value: { username: username.value, display_name: displayName.value, bio: bio.value, avatar_url: avatar.value },
  };
}
