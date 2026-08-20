-- Wisp · migration 025: profile conversations (a light message wall)
--
-- Each profile has a small "Conversations" wall, like Wattpad's: the owner and
-- other signed-in members can leave a short message on it. Author name/handle
-- are denormalised onto the row so the wall reads with no extra join.
--
-- Safe to re-run.

create table if not exists public.profile_posts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,  -- whose wall
  author_id  uuid not null references public.profiles (id) on delete cascade,  -- who wrote it
  author_name text,
  author_handle text,
  body text not null check (char_length(body) <= 2000),
  created_at timestamptz not null default now()
);
create index if not exists profile_posts_profile_idx on public.profile_posts (profile_id, created_at desc);

-- The wall's owner can pin a message to the top of their own wall.
alter table public.profile_posts add column if not exists pinned boolean not null default false;
create index if not exists profile_posts_pinned_idx on public.profile_posts (profile_id, pinned desc, created_at desc);

alter table public.profile_posts enable row level security;

drop policy if exists profile_posts_select on public.profile_posts;
create policy profile_posts_select on public.profile_posts for select using (true);

drop policy if exists profile_posts_insert on public.profile_posts;
create policy profile_posts_insert on public.profile_posts for insert to authenticated with check (auth.uid() = author_id);

-- Only the wall's owner may pin/unpin (update) a message on their wall.
drop policy if exists profile_posts_update on public.profile_posts;
create policy profile_posts_update on public.profile_posts for update
  using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- The wall's owner or the post's author may remove a post.
drop policy if exists profile_posts_delete on public.profile_posts;
create policy profile_posts_delete on public.profile_posts for delete
  using (auth.uid() = author_id or auth.uid() = profile_id);
