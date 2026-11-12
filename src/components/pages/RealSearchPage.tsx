import type { ReactNode } from "react";
import { APP_NAME } from "@/lib/brand";
import { deriveAlbums, deriveArtists, type DerivedGroup } from "@/lib/music/derive";
import { musicTrackByline, musicTrackToPlayable } from "@/lib/music/playable";
import type { MusicTrack } from "@/lib/music/types";
import { searchHref, type SearchFilterId } from "@/lib/search";
import { MediaCard } from "@/components/media/MediaCard";
import { MusicTrackRow } from "@/components/media/MusicTrackRow";
import { CardGrid, Shelf } from "@/components/media/Shelf";
import { TopResultCard } from "@/components/media/TopResultCard";
import { FilterChips } from "./FilterChips";
import { Footer } from "./Footer";
import { PageMain } from "./PageMain";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <h2 className="px-2 pb-2 text-xl font-bold leading-6">{title}</h2>
      {children}
    </section>
  );
}

function Message({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="py-16 text-center">
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="mt-2 text-subtle">{children}</p>
    </div>
  );
}

function GroupCard({ group, kind }: { group: DerivedGroup; kind: "artist" | "album" }) {
  const first = group.tracks[0];
  return (
    <MediaCard
      href={`/${kind}/${encodeURIComponent(group.name)}`}
      title={group.name}
      subtitle={kind === "artist" ? "Artist" : musicTrackByline(first)}
      coverSeed={`${kind}:${group.name}`}
      artworkSrc={first.thumbnailUrl}
      round={kind === "artist"}
      queue={group.tracks.map(musicTrackToPlayable)}
      playLabel={group.name}
      detailFeature={kind === "artist" ? "Artist pages" : "Album pages"}
    />
  );
}

function SongList({ tracks, all }: { tracks: MusicTrack[]; all: MusicTrack[] }) {
  return (
    <ul>
      {tracks.map((track) => (
        <MusicTrackRow key={track.videoId} track={track} queue={all} />
      ))}
    </ul>
  );
}

function AllView({ query, tracks }: { query: string; tracks: MusicTrack[] }) {
  const top = tracks[0];
  const artists = deriveArtists(tracks);
  const albums = deriveAlbums(tracks);
  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[minmax(260px,5fr)_7fr]">
        <Section title="Top result">
          <TopResultCard
            href={`/track/${top.videoId}`}
            title={top.title}
            kindLabel="Song"
            byline={musicTrackByline(top)}
            coverSeed={`yt:${top.videoId}`}
            artworkSrc={top.thumbnailUrl}
            queue={tracks.map(musicTrackToPlayable)}
            detailFeature="Track pages"
          />
        </Section>
        <Section title="Songs">
          <SongList tracks={tracks.slice(0, 4)} all={tracks} />
        </Section>
      </div>
      <div className="mt-8 space-y-8">
        {artists.length > 0 && (
          <Shelf title="Artists" showAllHref={searchHref(query, "artists")}>
            {artists.map((g) => (
              <GroupCard key={g.name} group={g} kind="artist" />
            ))}
          </Shelf>
        )}
        {albums.length > 0 && (
          <Shelf title="Albums" showAllHref={searchHref(query, "albums")}>
            {albums.map((g) => (
              <GroupCard key={g.name} group={g} kind="album" />
            ))}
          </Shelf>
        )}
      </div>
    </>
  );
}

const UNAVAILABLE: Partial<Record<SearchFilterId, string>> = {
  playlists: "Playlists",
  podcastAndEpisodes: "Podcasts & Shows",
  users: "Profiles",
};

function FilterView({ filter, tracks }: { filter: Exclude<SearchFilterId, "all">; tracks: MusicTrack[] }) {
  if (filter === "tracks") {
    return (
      <Section title="Songs">
        <SongList tracks={tracks} all={tracks} />
      </Section>
    );
  }
  if (filter === "artists" || filter === "albums") {
    const kind = filter === "artists" ? "artist" : "album";
    const groups = kind === "artist" ? deriveArtists(tracks, 24) : deriveAlbums(tracks, 24);
    if (groups.length === 0) {
      return (
        <Message title={`No ${filter} found`}>
          YouTube didn&apos;t list {kind} names for these songs.
        </Message>
      );
    }
    return (
      <Section title={filter === "artists" ? "Artists" : "Albums"}>
        <CardGrid>
          {groups.map((g) => (
            <GroupCard key={g.name} group={g} kind={kind} />
          ))}
        </CardGrid>
      </Section>
    );
  }
  return (
    <Message title={`${UNAVAILABLE[filter] ?? "This filter"} aren't available yet`}>
      Real music search currently finds songs, with artists and albums taken from the results.
    </Message>
  );
}

/** Search results backed by YouTube. Songs are real; artists/albums are derived from them. */
export function RealSearchPage({
  query,
  filter,
  tracks,
}: {
  query: string;
  filter: SearchFilterId;
  tracks: MusicTrack[];
}) {
  return (
    <PageMain label={`Search for ${query} | ${APP_NAME}`} heading={`Search results for ${query}`}>
      <FilterChips query={query} active={filter} />
      {tracks.length === 0 ? (
        <Message title={`No songs found for “${query}”`}>
          Check the spelling, or try fewer or different keywords.
        </Message>
      ) : filter === "all" ? (
        <AllView query={query} tracks={tracks} />
      ) : (
        <FilterView filter={filter} tracks={tracks} />
      )}
      <p className="mt-10 text-xs text-subtle">Search results and playback are provided by YouTube.</p>
      <Footer />
    </PageMain>
  );
}
