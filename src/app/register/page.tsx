import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthUnavailable } from "@/components/auth/AuthUnavailable";
import { Divider } from "@/components/auth/Divider";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { PageMain } from "@/components/pages/PageMain";
import { safeNextPath } from "@/lib/auth/redirect";
import { getAuthState } from "@/lib/supabase/user";

export const metadata: Metadata = { title: "Sign up" };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = safeNextPath(first(params.next), "/account");
  const auth = await getAuthState();

  if (!auth.enabled) {
    return (
      <PageMain label="Sign up" heading="Sign up">
        <AuthUnavailable title="Sign up" />
      </PageMain>
    );
  }
  if (auth.user) redirect(next);

  const loginHref = next === "/account" ? "/login" : `/login?next=${encodeURIComponent(next)}`;
  return (
    <PageMain label="Sign up" heading="Sign up">
      <AuthCard
        title="Sign up"
        subtitle="Create an account to get started."
        footer={
          <>
            Already have an account?{" "}
            <Link href={loginHref} className="font-bold text-white underline hover:text-accent">
              Log in
            </Link>
          </>
        }
      >
        <GoogleButton next={next} />
        <Divider />
        <RegisterForm next={next} />
      </AuthCard>
    </PageMain>
  );
}
