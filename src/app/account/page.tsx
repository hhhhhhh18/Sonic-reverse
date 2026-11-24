import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/auth/Avatar";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthUnavailable } from "@/components/auth/AuthUnavailable";
import { ProfileForm } from "@/components/auth/ProfileForm";
import { SubmitButton } from "@/components/auth/fields";
import { PageMain } from "@/components/pages/PageMain";
import { logoutAction } from "@/lib/auth/actions";
import { loginUrlFor } from "@/lib/auth/redirect";
import type { Profile } from "@/lib/auth/types";
import { getVerifiedUser } from "@/lib/supabase/user";

export const metadata: Metadata = { title: "Account" };
export const dynamic = "force-dynamic";

const MISSING_TABLE_CODES = new Set(["PGRST205", "42P01"]);

/**
 * Protected page. Three layers guard it: proxy.ts redirects signed-out visitors, this
 * check asks the Auth server to validate the session, and Row Level Security limits the
 * profile query to what this user may see and change.
 */
export default async function AccountPage() {
  const verified = await getVerifiedUser();
  if (!verified.configured) {
    return (
      <PageMain label="Account" heading="Account">
        <AuthUnavailable title="Account" />
      </PageMain>
    );
  }
  if (!verified.user) redirect(loginUrlFor("/account"));

  const { supabase, user } = verified;
  const load = () => supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  let { data: row, error } = await load();
  if (!row && !error) {
    // Self-heal: an account created before the migration (or where the signup trigger logged a warning).
    await supabase.rpc("ensure_my_profile");
    ({ data: row, error } = await load());
  }
  const profile = row as Profile | null;

  if (!profile) {
    const needsMigration = error?.code ? MISSING_TABLE_CODES.has(error.code) : false;
    return (
      <PageMain label="Account" heading="Account">
        <AuthCard title="We couldn't load your profile">
          <p className="text-subtle">
            {needsMigration
              ? "The profiles table doesn't exist yet. Run the SQL migration in your Supabase project (see the README), then reload this page."
              : "Something went wrong while loading your profile. Please reload the page."}
          </p>
          <form action={logoutAction}>
            <SubmitButton variant="light" pendingText="Logging out…">
              Log out
            </SubmitButton>
          </form>
        </AuthCard>
      </PageMain>
    );
  }

  const name = profile.display_name || profile.username;
  const since = new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  return (
    <PageMain label="Account" heading="Account">
      <div className="mx-auto w-full max-w-2xl space-y-6 py-4 sm:py-8">
        <div className="flex items-center gap-4 rounded-lg bg-elevated p-6">
          <Avatar name={name} src={profile.avatar_url} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-2xl font-bold">{name}</p>
            <p className="truncate text-subtle">@{profile.username}</p>
            <p className="mt-1 truncate text-sm text-subtle">
              {user.email ? `${user.email} · ` : ""}Member since {since}
            </p>
          </div>
        </div>
        <AuthCard title="Edit profile" subtitle="Your username, display name, bio and picture are public.">
          <ProfileForm profile={profile} />
        </AuthCard>
        <form action={logoutAction} className="mx-auto max-w-md">
          <SubmitButton variant="outline" pendingText="Logging out…">
            Log out
          </SubmitButton>
        </form>
      </div>
    </PageMain>
  );
}
