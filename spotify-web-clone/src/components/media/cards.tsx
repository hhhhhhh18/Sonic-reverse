import type { Album, Artist, Playlist, Profile, Show, Track } from "@/data/types";
import { artistNames, coverSeed, getAlbum, queues, trackToPlayable } from "@/lib/catalog";
import { ArtistLinks } from "./ArtistLinks";
import { MediaCard } from "./MediaCard";

export function TrackCard({ track }: { track: Track }) {
  const item = trackToPlayable(track);
  return (
    <MediaCard
      href={`/album/${track.albumId}`}
      title={track.title}
      subtitle={<ArtistLinks ids={track.artistIds} />}
      coverSeed={coverSeed.track(track)}
      queue={[item]}
      playLabel={`${track.title} by ${artistNames(track.artistIds)}`}
      detailFeature="Album pages"
    />
  );
}

export function ArtistCard({ artist }: { artist: Artist }) {
  return (
    <MediaCard
      href={`/artist/${artist.id}`}
      title={artist.name}
      subtitle="Artist"
      coverSeed={coverSeed.artist(artist.id)}
      round
      queue={queues.artist(artist.id)}
      playLabel={artist.name}
      detailFeature="Artist pages"
    />
  );
}

export function AlbumCard({ album }: { album: Album }) {
  return (
    <MediaCard
      href={`/album/${album.id}`}
      title={album.title}
      subtitle={
        <>
          {album.year} • <ArtistLinks ids={album.artistIds} />
        </>
      }
      coverSeed={coverSeed.album(album.id)}
      queue={queues.album(album.id)}
      playLabel={album.title}
      detailFeature="Album pages"
    />
  );
}

export function PlaylistCard({ playlist }: { playlist: Playlist }) {
  return (
    <MediaCard
      href={`/playlist/${playlist.id}`}
      title={playlist.title}
      subtitle={`By ${playlist.owner}`}
      coverSeed={coverSeed.playlist(playlist.id)}
      queue={queues.playlist(playlist)}
      playLabel={playlist.title}
      detailFeature="Playlist pages"
    />
  );
}

export function ShowCard({ show }: { show: Show }) {
  return (
    <MediaCard
      href={`/show/${show.id}`}
      title={show.title}
      subtitle={show.publisher}
      coverSeed={coverSeed.show(show.id)}
      queue={queues.show(show.id)}
      playLabel={show.title}
      detailFeature="Podcast pages"
    />
  );
}

export function ProfileCard({ profile }: { profile: Profile }) {
  return (
    <MediaCard
      href={`/user/${profile.id}`}
      title={profile.name}
      subtitle="Profile"
      coverSeed={coverSeed.profile(profile.id)}
      round
      detailFeature="Profile pages"
    />
  );
}

/** Used by the album-name lookups in lists; exported for convenience. */
export function albumTitle(id: string): string {
  return getAlbum(id).title;
}
