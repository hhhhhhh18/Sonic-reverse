import { SECTIONS, type SectionId } from "@/data/catalog";
import { getAlbum, getArtist, getTrack } from "@/lib/catalog";
import { AlbumCard, ArtistCard, TrackCard } from "@/components/media/cards";
import { CardGrid } from "@/components/media/Shelf";
import { Footer } from "./Footer";
import { PageMain } from "./PageMain";

/**
 * Full list behind a home-page "Show all" link. The captures showed the
 * link but not its destination, so this layout is our own simple grid.
 */
export function SectionPage({ id }: { id: SectionId }) {
  const section = SECTIONS[id];
  return (
    <PageMain label={section.title} heading={section.title}>
      <h2 className="mb-4 text-2xl font-bold" aria-hidden="true">
        {section.title}
      </h2>
      <CardGrid>
        {section.ids.map((itemId) => {
          if (section.kind === "track") return <TrackCard key={itemId} track={getTrack(itemId)} />;
          if (section.kind === "artist") return <ArtistCard key={itemId} artist={getArtist(itemId)} />;
          return <AlbumCard key={itemId} album={getAlbum(itemId)} />;
        })}
      </CardGrid>
      <Footer />
    </PageMain>
  );
}
