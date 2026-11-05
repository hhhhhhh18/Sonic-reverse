import { SECTIONS } from "@/data/catalog";
import { getAlbum, getArtist, getTrack } from "@/lib/catalog";
import { AlbumCard, ArtistCard, TrackCard } from "@/components/media/cards";
import { Shelf } from "@/components/media/Shelf";
import { Footer } from "./Footer";
import { PageMain } from "./PageMain";

/** Logged-out home: Trending songs, Popular artists, Popular albums and singles. */
export function HomePage() {
  const trending = SECTIONS["trending-songs"];
  const popularArtists = SECTIONS["popular-artists"];
  const popularAlbums = SECTIONS["popular-albums"];

  return (
    <PageMain label="Home" heading="Home">
      <div className="space-y-8">
        <Shelf title={trending.title} showAllHref="/section/trending-songs">
          {trending.ids.map((id) => (
            <TrackCard key={id} track={getTrack(id)} />
          ))}
        </Shelf>
        <Shelf title={popularArtists.title} showAllHref="/section/popular-artists">
          {popularArtists.ids.map((id) => (
            <ArtistCard key={id} artist={getArtist(id)} />
          ))}
        </Shelf>
        <Shelf title={popularAlbums.title} showAllHref="/section/popular-albums">
          {popularAlbums.ids.map((id) => (
            <AlbumCard key={id} album={getAlbum(id)} />
          ))}
        </Shelf>
      </div>
      <Footer />
    </PageMain>
  );
}
