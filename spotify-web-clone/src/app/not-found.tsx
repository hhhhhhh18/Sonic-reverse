import Link from "next/link";
import { PageMain } from "@/components/pages/PageMain";

export default function NotFound() {
  return (
    <PageMain label="Page not found" heading="Page not found">
      <div className="py-20 text-center">
        <h2 className="text-3xl font-bold">This page isn&apos;t part of the demo</h2>
        <p className="mt-3 text-subtle">
          Only the home page, search, and &ldquo;Show all&rdquo; lists are built so far.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-full bg-white px-6 py-3 font-bold text-black hover:scale-105"
        >
          Back to Home
        </Link>
      </div>
    </PageMain>
  );
}
