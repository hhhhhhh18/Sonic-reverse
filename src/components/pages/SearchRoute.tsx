import { headers } from "next/headers";
import { clientIdFromHeaders } from "@/lib/music/client-id";
import { searchMusic } from "@/lib/music/search-service";
import type { SearchFilterId } from "@/lib/search";
import { RealSearchPage } from "./RealSearchPage";
import { SearchNotice } from "./SearchNotice";
import { SearchPage } from "./SearchPage";

/**
 * Picks the data source for a search URL: real YouTube results when search is
 * configured and healthy, otherwise the built-in demo catalog with a visible
 * explanation. The API key is only ever read on the server, inside searchMusic.
 */
export async function SearchRoute({ query, filter }: { query: string; filter: SearchFilterId }) {
  const outcome = await searchMusic(query, { clientId: clientIdFromHeaders(await headers()) });
  if (outcome.ok) {
    return <RealSearchPage query={outcome.data.query} filter={filter} tracks={outcome.data.tracks} />;
  }
  return <SearchPage query={query} filter={filter} notice={<SearchNotice error={outcome.error} />} />;
}
