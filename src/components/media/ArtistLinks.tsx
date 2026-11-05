import { Fragment } from "react";
import { getArtist } from "@/lib/catalog";
import { StubLink } from "@/components/ui/StubLink";

/** "Artist A, Artist B" where each name is a (not yet implemented) link. */
export function ArtistLinks({ ids, className }: { ids: string[]; className?: string }) {
  return (
    <>
      {ids.map((id, i) => {
        const artist = getArtist(id);
        return (
          <Fragment key={id}>
            {i > 0 && ", "}
            <StubLink
              href={`/artist/${artist.id}`}
              feature="Artist pages"
              className={className ?? "hover:underline"}
            >
              {artist.name}
            </StubLink>
          </Fragment>
        );
      })}
    </>
  );
}
