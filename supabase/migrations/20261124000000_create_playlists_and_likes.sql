
-- =============================================================================
-- Sonic Reverse - Phase 2: playlists, playlist tracks and liked songs
-- Run in Supabase SQL Editor.
-- =============================================================================

-- 1. Playlists ---------------------------------------------------------------

create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint playlists_name_length
    check (char_length(btrim(name)) between 1 and 100),
  constraint playlists_description_length
    check (description is null or char_length(description) <= 300)
);

create index if not exists playlists_user_created_idx
  on public.playlists(user_id, created_at desc);

drop trigger if exists playlists_set_updated_at on public.playlists;
create trigger playlists_set_updated_at
  before update on public.playlists
  for each row execute function public.set_updated_at();

-- 2. Tracks saved in playlists -----------------------------------------------

create table if not exists public.playlist_tracks (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  video_id text not null,
  title text not null,
  artist text not null default '',
  duration_seconds integer not null default 0,
  artwork_url text,
  position integer not null default 0,
  added_at timestamptz not null default now(),

  constraint playlist_tracks_video_id_format
    check (video_id ~ '^[A-Za-z0-9_-]{11}$'),
  constraint playlist_tracks_title_length
    check (char_length(btrim(title)) between 1 and 300),
  constraint playlist_tracks_artist_length
    check (char_length(artist) <= 300),
  constraint playlist_tracks_duration
    check (duration_seconds >= 0),
  constraint playlist_tracks_position
    check (position >= 0),
  constraint playlist_tracks_artwork_https
    check (
      artwork_url is null or
      (artwork_url ~ '^https://[^[:space:]]+$' and char_length(artwork_url) <= 1000)
    ),
  constraint playlist_tracks_unique_video
    unique (playlist_id, video_id)
);

create index if not exists playlist_tracks_order_idx
  on public.playlist_tracks(playlist_id, position, added_at);

-- 3. Liked songs --------------------------------------------------------------

create table if not exists public.liked_tracks (
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id text not null,
  title text not null,
  artist text not null default '',
  duration_seconds integer not null default 0,
  artwork_url text,
  liked_at timestamptz not null default now(),

  primary key (user_id, video_id),

  constraint liked_tracks_video_id_format
    check (video_id ~ '^[A-Za-z0-9_-]{11}$'),
  constraint liked_tracks_title_length
    check (char_length(btrim(title)) between 1 and 300),
  constraint liked_tracks_artist_length
    check (char_length(artist) <= 300),
  constraint liked_tracks_duration
    check (duration_seconds >= 0),
  constraint liked_tracks_artwork_https
    check (
      artwork_url is null or
      (artwork_url ~ '^https://[^[:space:]]+$' and char_length(artwork_url) <= 1000)
    )
);

create index if not exists liked_tracks_user_liked_idx
  on public.liked_tracks(user_id, liked_at desc);

-- 4. Row Level Security -------------------------------------------------------

alter table public.playlists enable row level security;
alter table public.playlist_tracks enable row level security;
alter table public.liked_tracks enable row level security;

-- Playlists: owners can manage their own; everyone can read public playlists.

drop policy if exists "Playlist owners and public can read playlists"
  on public.playlists;
create policy "Playlist owners and public can read playlists"
  on public.playlists for select
  to anon, authenticated
  using (is_public or user_id = (select auth.uid()));

drop policy if exists "Users can create their own playlists"
  on public.playlists;
create policy "Users can create their own playlists"
  on public.playlists for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can update their own playlists"
  on public.playlists;
create policy "Users can update their own playlists"
  on public.playlists for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can delete their own playlists"
  on public.playlists;
create policy "Users can delete their own playlists"
  on public.playlists for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- Playlist tracks: public playlists are readable; only owners can modify.

drop policy if exists "Public and owners can read playlist tracks"
  on public.playlist_tracks;
create policy "Public and owners can read playlist tracks"
  on public.playlist_tracks for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.playlists p
      where p.id = playlist_id
        and (p.is_public or p.user_id = (select auth.uid()))
    )
  );

drop policy if exists "Owners can add playlist tracks"
  on public.playlist_tracks;
create policy "Owners can add playlist tracks"
  on public.playlist_tracks for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.playlists p
      where p.id = playlist_id
        and p.user_id = (select auth.uid())
    )
  );

drop policy if exists "Owners can reorder playlist tracks"
  on public.playlist_tracks;
create policy "Owners can reorder playlist tracks"
  on public.playlist_tracks for update
  to authenticated
  using (
    exists (
      select 1
      from public.playlists p
      where p.id = playlist_id
        and p.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.playlists p
      where p.id = playlist_id
        and p.user_id = (select auth.uid())
    )
  );

drop policy if exists "Owners can remove playlist tracks"
  on public.playlist_tracks;
create policy "Owners can remove playlist tracks"
  on public.playlist_tracks for delete
  to authenticated
  using (
    exists (
      select 1
      from public.playlists p
      where p.id = playlist_id
        and p.user_id = (select auth.uid())
    )
  );

-- Liked tracks: private to their owner.

drop policy if exists "Users can read their liked tracks"
  on public.liked_tracks;
create policy "Users can read their liked tracks"
  on public.liked_tracks for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users can like tracks"
  on public.liked_tracks;
create policy "Users can like tracks"
  on public.liked_tracks for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can update their liked tracks"
  on public.liked_tracks;
create policy "Users can update their liked tracks"
  on public.liked_tracks for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can unlike tracks"
  on public.liked_tracks;
create policy "Users can unlike tracks"
  on public.liked_tracks for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- 5. Least-privilege grants ---------------------------------------------------

revoke all on table public.playlists from anon, authenticated;
revoke all on table public.playlist_tracks from anon, authenticated;
revoke all on table public.liked_tracks from anon, authenticated;

grant select on public.playlists to anon, authenticated;
grant insert (user_id, name, description, is_public)
  on public.playlists to authenticated;
grant update (name, description, is_public)
  on public.playlists to authenticated;
grant delete on public.playlists to authenticated;

grant select on public.playlist_tracks to anon, authenticated;
grant insert (
  playlist_id, video_id, title, artist,
  duration_seconds, artwork_url, position
) on public.playlist_tracks to authenticated;
grant update (position) on public.playlist_tracks to authenticated;
grant delete on public.playlist_tracks to authenticated;

grant select on public.liked_tracks to authenticated;
grant insert (
  user_id, video_id, title, artist, duration_seconds, artwork_url
) on public.liked_tracks to authenticated;
grant update (
  title, artist, duration_seconds, artwork_url
) on public.liked_tracks to authenticated;
grant delete on public.liked_tracks to authenticated;
