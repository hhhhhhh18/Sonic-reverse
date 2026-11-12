import { PageMain } from "@/components/pages/PageMain";

/** Shown instantly while a search runs (a real YouTube search takes a moment). */
export default function SearchLoading() {
  return (
    <PageMain label="Searching…" heading="Searching">
      <div aria-busy="true" className="animate-pulse">
        <span className="sr-only">Loading results…</span>
        <div className="mb-6 flex gap-2">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="h-8 w-20 rounded-full bg-raised" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(260px,5fr)_7fr]">
          <div className="h-56 rounded-lg bg-elevated" />
          <div className="space-y-3">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex items-center gap-3 px-2">
                <div className="size-10 rounded-md bg-raised" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/2 rounded bg-raised" />
                  <div className="h-3 w-1/3 rounded bg-elevated" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageMain>
  );
}
