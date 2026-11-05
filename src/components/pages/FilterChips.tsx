import Link from "next/link";
import { cn } from "@/lib/cn";
import { SEARCH_FILTERS, searchHref, type SearchFilterId } from "@/lib/search";

/** All / Songs / Albums / Artists / Playlists / Podcasts & Shows / Profiles. */
export function FilterChips({ query, active }: { query: string; active: SearchFilterId }) {
  return (
    <nav aria-label="Search filters" className="mb-6">
      <ul className="flex flex-wrap gap-2">
        {SEARCH_FILTERS.map((filter) => {
          const isActive = filter.id === active;
          return (
            <li key={filter.id}>
              <Link
                href={searchHref(query, filter.id)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "block rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  isActive ? "bg-white text-black" : "bg-raised text-white hover:bg-[#3a3a3a]",
                )}
              >
                {filter.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
