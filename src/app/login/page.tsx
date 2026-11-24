import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthUnavailable } from "@/components/auth/AuthUnavailable";
import { Divider } from "@/components/auth/Divider";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { LoginForm } from "@/components/auth/LoginForm";
import { PageMain } from "@/components/pages/PageMain";
import { loginPageError } from "@/lib/auth/errors";
import { safeNextPath } from "@/lib/auth/redirect";
import { getAuthState } from "@/lib/supabase/user";

export const metadata: Metadata = { title: "Log in" };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = safeNextPath(first(params.next), "/");
  const auth = await getAuthState();

  if (!auth.enabled) {
    return (
      <PageMain label="Log in" heading="Log in">
        <AuthUnavailable title="Log in" />
      </PageMain>
    );
  }
  if (auth.user) redirect(next);

  const registerHref = next === "/" ? "/register" : `/register?next=${encodeURIComponent(next)}`;
  return (
    <PageMain label="Log in" heading="Log in">
      <AuthCard
        title="Log in"
        subtitle="Welcome back."
        footer={
          <>
            Don&apos;t have an account?{" "}
            <Link href={registerHref} className="font-bold text-white underline hover:text-accent">
              Sign up
            </Link>
          </>
        }
      >
        <GoogleButton next={next} />
        <Divider />
        <LoginForm next={next} initialError={loginPageError(first(params.error))} />
      </AuthCard>
    </PageMain>
  );
}
