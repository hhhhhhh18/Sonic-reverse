import type { ReactNode } from "react";
import { artistNames, coverSeed, queues, trackToPlayable } from "@/lib/catalog";
import { searchCatalog, searchHref, type SearchFilterId, type SearchResults, type TopResult } from "@/lib/search";
import { APP_NAME } from "@/lib/brand";
import { AlbumCard, ArtistCard, PlaylistCard, ProfileCard, ShowCard } from "@/components/media/cards";
import { EpisodeRow } from "@/components/media/EpisodeRow";
import { CardGrid, Shelf } from "@/components/media/Shelf";
import { TopResultCard } from "@/components/media/TopResultCard";
import { TrackRow } from "@/components/media/TrackRow";
import { Footer } from "./Footer";
import { FilterChips } from "./FilterChips";
import { PageMain } from "./PageMain";

function topResultCard(top: TopResult) {
  switch (top.kind) {
    case "artist":
      return (
        <TopResultCard
          href={`/artist/${top.item.id}`}
          title={top.item.name}
          kindLabel="Artist"
          coverSeed={coverSeed.artist(top.item.id)}
          round
          queue={queues.artist(top.item.id)}
          detailFeature="Artist pages"
        />
      );
    case "show":
      return (
        <TopResultCard
          href={`/show/${top.item.id}`}
          title={top.item.title}
          kindLabel="Podcast"
          byline={top.item.publisher}
          coverSeed={coverSeed.show(top.item.id)}
          queue={queues.show(top.item.id)}
          detailFeature="Podcast pages"
        />
      );
    case "album":
      return (
        <TopResultCard
          href={`/album/${top.item.id}`}
          title={top.item.title}
          kindLabel="Album"
          byline={artistNames(top.item.artistIds)}
          coverSeed={coverSeed.album(top.item.id)}
          queue={queues.album(top.item.id)}
          detailFeature="Album pages"
        />
      );
    case "playlist":
      return (
        <TopResultCard
          href={`/playlist/${top.item.id}`}
          title={top.item.title}
          kindLabel="Playlist"
          byline={`By ${top.item.owner}`}
          coverSeed={coverSeed.playlist(top.item.id)}
          queue={queues.playlist(top.item)}
          detailFeature="Playlist pages"
        />
      );
    case "track":
      return (
        <TopResultCard
          href={`/album/${top.item.albumId}`}
          title={top.item.title}
          kindLabel="Song"
          byline={artistNames(top.item.artistIds)}
          coverSeed={coverSeed.track(top.item)}
          queue={[trackToPlayable(top.item)]}
          detailFeature="Album pages"
        />
      );
  }
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <h2 className="px-2 pb-2 text-xl font-bold leading-6">{title}</h2>
      {children}
    </section>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="py-16 text-center">
      <h2 className="text-2xl font-bold">No results found for “{query}”</h2>
      <p className="mt-2 text-subtle">Check the spelling, or try fewer or different keywords.</p>
    </div>
  );
}

function AllView({ results }: { results: SearchResults }) {
  const q = results.query;
  const songs = results.tracks.slice(0, 4);
  return (
    <>
      {(results.topResult || songs.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-[minmax(260px,5fr)_7fr]">
          {results.topResult && <Section title="Top result">{topResultCard(results.topResult)}</Section>}
          {songs.length > 0 && (
            <Section title="Songs">
              <ul>
                {songs.map((track) => (
                  <TrackRow key={track.id} track={track} queue={results.tracks} />
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}
      <div className="mt-8 space-y-8">
        {results.artists.length > 0 && (
          <Shelf title="Artists" showAllHref={searchHref(q, "artists")}>
            {results.artists.map((a) => <ArtistCard key={a.id} artist={a} />)}
          </Shelf>
        )}
        {results.albums.length > 0 && (
          <Shelf title="Albums" showAllHref={searchHref(q, "albums")}>
            {results.albums.map((a) => <AlbumCard key={a.id} album={a} />)}
          </Shelf>
        )}
        {results.playlists.length > 0 && (
          <Shelf title="Playlists" showAllHref={searchHref(q, "playlists")}>
            {results.playlists.map((p) => <PlaylistCard key={p.id} playlist={p} />)}
          </Shelf>
        )}
        {results.shows.length > 0 && (
          <Shelf title="Podcasts" showAllHref={searchHref(q, "podcastAndEpisodes")}>
            {results.shows.map((s) => <ShowCard key={s.id} show={s} />)}
          </Shelf>
        )}
        {results.episodes.length > 0 && (
          <Section title="Episodes">
            <ul>
              {results.episodes.slice(0, 4).map((e) => (
                <EpisodeRow key={e.id} episode={e} queue={results.episodes} />
              ))}
            </ul>
          </Section>
        )}
        {results.profiles.length > 0 && (
          <Shelf title="Profiles" showAllHref={searchHref(q, "users")}>
            {results.profiles.map((p) => <ProfileCard key={p.id} profile={p} />)}
          </Shelf>
        )}
      </div>
    </>
  );
}

/** Per-filter pages. The captures only showed the filter URLs; these layouts are ours. */
function FilterView({ filter, results }: { filter: Exclude<SearchFilterId, "all">; results: SearchResults }) {
  switch (filter) {
    case "tracks":
      return results.tracks.length ? (
        <Section title="Songs">
          <ul>
            {results.tracks.map((t) => <TrackRow key={t.id} track={t} queue={results.tracks} />)}
          </ul>
        </Section>
      ) : <EmptyState query={results.query} />;
    case "albums":
      return results.albums.length ? (
        <Section title="Albums"><CardGrid>{results.albums.map((a) => <AlbumCard key={a.id} album={a} />)}</CardGrid></Section>
      ) : <EmptyState query={results.query} />;
    case "artists":
      return results.artists.length ? (
        <Section title="Artists"><CardGrid>{results.artists.map((a) => <ArtistCard key={a.id} artist={a} />)}</CardGrid></Section>
      ) : <EmptyState query={results.query} />;
    case "playlists":
      return results.playlists.length ? (
        <Section title="Playlists"><CardGrid>{results.playlists.map((p) => <PlaylistCard key={p.id} playlist={p} />)}</CardGrid></Section>
      ) : <EmptyState query={results.query} />;
    case "podcastAndEpisodes":
      return results.shows.length + results.episodes.length ? (
        <div className="space-y-8">
          {results.shows.length > 0 && (
            <Section title="Podcasts"><CardGrid>{results.shows.map((s) => <ShowCard key={s.id} show={s} />)}</CardGrid></Section>
          )}
          {results.episodes.length > 0 && (
            <Section title="Episodes">
              <ul>{results.episodes.map((e) => <EpisodeRow key={e.id} episode={e} queue={results.episodes} />)}</ul>
            </Section>
          )}
        </div>
      ) : <EmptyState query={results.query} />;
    case "users":
      return results.profiles.length ? (
        <Section title="Profiles"><CardGrid>{results.profiles.map((p) => <ProfileCard key={p.id} profile={p} />)}</CardGrid></Section>
      ) : <EmptyState query={results.query} />;
  }
}

/** Search page for /search/<query> and /search/<query>/<filter>. */
export function SearchPage({ query, filter }: { query: string; filter: SearchFilterId }) {
  const results = searchCatalog(query);
  const label = `Search for ${results.query} | ${APP_NAME}`;

  return (
    <PageMain label={label} heading={`Search results for ${results.query}`}>
      <FilterChips query={results.query} active={filter} />
      {results.total === 0 ? (
        <EmptyState query={results.query} />
      ) : filter === "all" ? (
        <AllView results={results} />
      ) : (
        <FilterView filter={filter} results={results} />
      )}
      <Footer />
    </PageMain>
  );
}
