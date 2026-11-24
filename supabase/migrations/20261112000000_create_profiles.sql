-- =============================================================================
-- Sonic Reverse - Phase 1: user profiles linked to Supabase Auth
--
-- Run this once in the Supabase dashboard (SQL Editor -> New query -> paste -> Run)
-- or with the Supabase CLI (`supabase db push`). It is idempotent: safe to re-run.
--
-- Security model
--   * Anyone (including signed-out visitors) can READ profiles. They hold only
--     public information: never put emails or other private data in this table.
--   * A signed-in user can UPDATE only their own row, and only four columns.
--   * Nobody can INSERT or DELETE through the API. Rows are created by the signup
--     trigger below and removed automatically when the auth user is deleted.
--   * The SECURITY DEFINER helpers cannot be called through the API, except
--     ensure_my_profile(), which can only ever act on the caller's own account.
-- =============================================================================

-- 1. Table ---------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text not null,
  display_name text,
  avatar_url   text,
  bio          text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- The UNIQUE constraint also creates the index used for username lookups.
  -- Because the format check below only allows lower-case characters,
  -- uniqueness is effectively case-insensitive.
  constraint profiles_username_key unique (username),
  constraint profiles_username_format
    check (username ~ '^[a-z0-9_]{3,20}$'),
  constraint profiles_display_name_length
    check (display_name is null or char_length(display_name) between 1 and 50),
  constraint profiles_bio_length
    check (bio is null or char_length(bio) <= 280),
  constraint profiles_avatar_url_https
    check (avatar_url is null or (avatar_url ~ '^https://[^[:space:]]+$' and char_length(avatar_url) <= 500))
);

comment on table public.profiles is
  'Public profile for each auth user. Public-readable: store no private data here.';
comment on column public.profiles.username is
  'Unique handle: 3-20 chars of a-z, 0-9 and underscore.';

-- 2. Keep updated_at fresh ----------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 3. Row Level Security -------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone"
  on public.profiles for select
  to anon, authenticated
  using (true);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Deliberately NO insert or delete policies (see the security model above).

-- 4. Least-privilege table grants ---------------------------------------------
-- Column-level UPDATE means a user can never change id, created_at or updated_at,
-- even for their own row.
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to anon, authenticated;
grant update (username, display_name, avatar_url, bio) on table public.profiles to authenticated;

-- 5. Profile creation ---------------------------------------------------------
-- Builds a valid, unique profile from whatever the sign-up provided:
--   username      the requested one if it is valid and free, otherwise derived from
--                 the email address, with a random suffix if it is already taken
--   display_name  display_name / full_name / name metadata (Google sends full_name)
--   avatar_url    avatar_url / picture metadata, only if it is an https URL
create or replace function public.ensure_profile(p_id uuid, p_email text, p_meta jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta     jsonb := coalesce(p_meta, '{}'::jsonb);
  v_wanted   text  := lower(btrim(coalesce(v_meta ->> 'username', '')));
  v_display  text  := nullif(btrim(coalesce(v_meta ->> 'display_name', v_meta ->> 'full_name', v_meta ->> 'name', '')), '');
  v_avatar   text  := nullif(btrim(coalesce(v_meta ->> 'avatar_url', v_meta ->> 'picture', '')), '');
  v_base     text;
  v_username text;
  v_attempt  int   := 0;
begin
  if v_display is not null then
    v_display := left(v_display, 50);
  end if;
  if v_avatar is not null
     and not (v_avatar ~ '^https://[^[:space:]]+$' and char_length(v_avatar) <= 500) then
    v_avatar := null;
  end if;

  if v_wanted ~ '^[a-z0-9_]{3,20}$' then
    v_base := v_wanted;
  else
    v_base := left(regexp_replace(lower(split_part(coalesce(p_email, ''), '@', 1)), '[^a-z0-9_]', '', 'g'), 20);
    if char_length(v_base) < 3 then
      v_base := 'user';
    end if;
  end if;

  v_username := v_base;
  loop
    begin
      insert into public.profiles (id, username, display_name, avatar_url)
      values (p_id, v_username, coalesce(v_display, v_base), v_avatar)
      on conflict (id) do nothing;
      return;
    exception when unique_violation then
      -- The username is taken (an id conflict is already absorbed by ON CONFLICT).
      v_attempt := v_attempt + 1;
      if v_attempt <= 8 then
        v_username := left(v_base, 15) || '_' || substr(md5(random()::text || clock_timestamp()::text), 1, 4);
      elsif v_attempt = 9 then
        v_username := 'u' || substr(replace(p_id::text, '-', ''), 1, 19);  -- derived from the unique id
      else
        raise;
      end if;
    end;
  end loop;
end;
$$;

-- Trigger function: never lets a profile problem block account creation.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    perform public.ensure_profile(new.id, new.email, new.raw_user_meta_data);
  exception when others then
    raise warning 'handle_new_user: could not create a profile for %: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Self-heal for a signed-in user whose profile is missing (for example an account
-- created before this migration, or one where the trigger logged a warning above).
-- It can only ever create the CALLER's profile.
create or replace function public.ensure_my_profile()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.ensure_profile(u.id, u.email, u.raw_user_meta_data)
  from auth.users u
  where u.id = (select auth.uid());
end;
$$;

-- 6. Lock down the SECURITY DEFINER functions ----------------------------------
-- Functions in the public schema are callable through the API by default.
revoke all on function public.ensure_profile(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.ensure_my_profile() from public, anon;
grant execute on function public.ensure_my_profile() to authenticated;

-- 7. Optional: create profiles for users that existed before this migration ---------
-- Uncomment and run once if you already have rows in auth.users:
--
--   select public.ensure_profile(id, email, raw_user_meta_data) from auth.users;
