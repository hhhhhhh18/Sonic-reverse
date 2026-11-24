import Link from "next/link";
import { AuthCard } from "./AuthCard";

/** Shown instead of the auth forms when Supabase isn't configured on this server. */
export function AuthUnavailable({ title }: { title: string }) {
  return (
    <AuthCard title={title}>
      <p>Accounts aren&apos;t set up on this server yet.</p>
      <p className="text-sm text-subtle">
        To enable them, add <code className="rounded bg-panel px-1">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code className="rounded bg-panel px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
        <code className="rounded bg-panel px-1">.env.local</code>, run the SQL migration, then restart the server. The
        README has step-by-step instructions. Music search and playback work without accounts.
      </p>
      <Link href="/" className="inline-block rounded-full bg-white px-6 py-3 font-bold text-black hover:scale-105">
        Back to Home
      </Link>
    </AuthCard>
  );
}
