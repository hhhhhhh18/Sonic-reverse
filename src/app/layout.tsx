import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/shell/AppShell";
import { getAuthState } from "@/lib/supabase/user";
import { APP_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: { default: `Home | ${APP_NAME}`, template: `%s | ${APP_NAME}` },
  description:
    "An unofficial study recreation of a music web player's logged-out interface, built with original mock data.",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuthState();
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full overflow-hidden">
        <AppShell auth={auth}>{children}</AppShell>
      </body>
    </html>
  );
}
