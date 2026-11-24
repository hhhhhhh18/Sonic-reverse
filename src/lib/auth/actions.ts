"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { describeAuthError } from "./errors";
import { NOT_CONFIGURED_MESSAGE, type FormState } from "./form-state";
import { resolveOrigin } from "./origin";
import { safeNextPath, loginUrlFor } from "./redirect";
import { text, validateLogin, validateProfileUpdate, validateRegistration } from "./validation";
import { getSupabaseConfig, readEnv } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getVerifiedUser } from "@/lib/supabase/user";

async function requestOrigin(): Promise<string> {
  const h = await headers();
  return resolveOrigin({
    siteUrl: readEnv("NEXT_PUBLIC_SITE_URL"),
    origin: h.get("origin"),
    forwardedHost: h.get("x-forwarded-host"),
    forwardedProto: h.get("x-forwarded-proto"),
    host: h.get("host"),
    fallback: "http://localhost:3000",
  });
}

function refreshNavigation() {
  // The header shows who is signed in, and it lives in the root layout.
  revalidatePath("/", "layout");
}

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = {
    email: text(formData.get("email")),
    username: text(formData.get("username")),
    displayName: text(formData.get("displayName")),
  };
  const config = getSupabaseConfig();
  if (!config.ok) return { status: "error", message: NOT_CONFIGURED_MESSAGE, values };

  const parsed = validateRegistration({ ...values, password: formData.get("password") });
  if (!parsed.ok) return { status: "error", fieldErrors: parsed.errors, values };
  const { email, password, username, displayName } = parsed.value;

  const supabase = await createSupabaseServerClient(config.config);

  // Friendly early check. The database still guarantees uniqueness, and the signup
  // trigger resolves a race by adding a suffix instead of failing the registration.
  const { data: taken } = await supabase.from("profiles").select("id").eq("username", username).maybeSingle();
  if (taken) return { status: "error", fieldErrors: { username: "That username is taken." }, values };

  const next = safeNextPath(formData.get("next"), "/account");
  const origin = await requestOrigin();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username, display_name: displayName },
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) return { status: "error", ...describeAuthError(error, "register"), values };

  if (data.session) {
    // Email confirmation is off in this project: the user is already signed in.
    refreshNavigation();
    redirect(next);
  }
  // Same message whether or not the address was already registered (no account enumeration).
  return {
    status: "success",
    message: "Check your email to confirm your account, then log in. The link may take a minute to arrive.",
    values: { email },
  };
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = { email: text(formData.get("email")) };
  const config = getSupabaseConfig();
  if (!config.ok) return { status: "error", message: NOT_CONFIGURED_MESSAGE, values };

  const parsed = validateLogin({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.ok) return { status: "error", fieldErrors: parsed.errors, values };

  const supabase = await createSupabaseServerClient(config.config);
  const { error } = await supabase.auth.signInWithPassword(parsed.value);
  if (error) return { status: "error", ...describeAuthError(error, "login"), values };

  refreshNavigation();
  redirect(safeNextPath(formData.get("next"), "/"));
}

export async function googleSignInAction(formData: FormData): Promise<void> {
  const config = getSupabaseConfig();
  if (!config.ok) redirect("/login?error=config");

  const next = safeNextPath(formData.get("next"), "/");
  const supabase = await createSupabaseServerClient(config.config);
  const origin = await requestOrigin();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      queryParams: { prompt: "select_account" },
    },
  });

  // Only ever send the browser to this project's own Supabase host.
  let target: string | null = null;
  if (!error && data.url) {
    try {
      if (new URL(data.url).origin === new URL(config.config.url).origin) target = data.url;
    } catch {
      target = null;
    }
  }
  if (!target) redirect(`/login?error=${error?.code === "provider_disabled" ? "provider" : "oauth"}`);
  redirect(target);
}

export async function logoutAction(): Promise<void> {
  const config = getSupabaseConfig();
  if (config.ok) {
    const supabase = await createSupabaseServerClient(config.config);
    // "local" ends this browser's session only, not the user's sessions on other devices.
    await supabase.auth.signOut({ scope: "local" });
  }
  refreshNavigation();
  redirect("/");
}

export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const verified = await getVerifiedUser();
  if (!verified.configured) return { status: "error", message: NOT_CONFIGURED_MESSAGE };
  if (!verified.user) redirect(loginUrlFor("/account"));

  const values = {
    username: text(formData.get("username")),
    displayName: text(formData.get("displayName")),
    bio: text(formData.get("bio")),
    avatarUrl: text(formData.get("avatarUrl")),
  };
  const parsed = validateProfileUpdate(values);
  if (!parsed.ok) return { status: "error", fieldErrors: parsed.errors, values };

  // The id filter is belt and braces: Row Level Security already limits updates to the caller's own row.
  const { data, error } = await verified.supabase
    .from("profiles")
    .update(parsed.value)
    .eq("id", verified.user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") return { status: "error", fieldErrors: { username: "That username is taken." }, values };
    if (error.code === "23514") return { status: "error", message: "Some of those details aren't allowed. Check them and try again.", values };
    return { status: "error", message: "We couldn't save your profile. Please try again.", values };
  }
  if (!data) return { status: "error", message: "We couldn't find your profile. Reload the page and try again.", values };

  revalidatePath("/account");
  refreshNavigation();
  return { status: "success", message: "Profile saved.", values };
}
