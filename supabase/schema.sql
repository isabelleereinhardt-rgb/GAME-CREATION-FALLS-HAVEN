-- ============================================================================
-- Wisp · Supabase schema
-- Run this once in your Supabase project: SQL Editor > New query > paste > Run.
-- It creates every table, the security (Row Level Security) policies, and the
-- triggers that keep counts and profiles in sync. Safe to re-run.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles: one row per account, created automatically on sign-up.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  handle       text unique,
  display_name text not null default 'Reader',
  bio          text default '',
  accent       text default '#ab5a67',
  is_admin     boolean not null default false,
  created_at   timestamptz not null default now()
);
alter table public.profiles enable row level security;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select using (true);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, handle)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'handle', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- series: a group of related works by one author.
-- ---------------------------------------------------------------------------
create table if not exists public.series (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  description text default '',
  type        text not null default 'original' check (type in ('fan','original')),
  source      text default '',
  status      text not null default 'ongoing' check (status in ('ongoing','complete')),
  created_at  timestamptz not null default now()
);
alter table public.series enable row level security;
drop policy if exists "series_select" on public.series;
create policy "series_select" on public.series for select using (true);
drop policy if exists "series_owner_all" on public.series;
create policy "series_owner_all" on public.series for all
  using (auth.uid() = author_id) with check (auth.uid() = author_id);

-- ---------------------------------------------------------------------------
-- works: a book. Drafts are private to the author; published works are public.
-- ---------------------------------------------------------------------------
create table if not exists public.works (
  id              uuid primary key default gen_random_uuid(),
  author_id       uuid not null references public.profiles(id) on delete cascade,
  series_id       uuid references public.series(id) on delete set null,
  book_number     int,
  title           text not null,
  type            text not null default 'original' check (type in ('fan','original')),
  source          text default '',
  summary         text default '',
  rating          text not null default 'G' check (rating in ('G','T','M','E')),
  warnings        text[] not null default '{}',
  format          text not null default 'prose' check (format in ('prose','comic')),
  status          text not null default 'draft' check (status in ('draft','ongoing','complete','scheduled')),
  cover_color     text default '#6d5566',
  cover_image_url text,
  schedule        text default '',
  hearts_count    int not null default 0,
  reads_count     int not null default 0,
  comments_count  int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.works enable row level security;
drop policy if exists "works_select_published_or_own" on public.works;
create policy "works_select_published_or_own" on public.works for select
  using (status in ('ongoing','complete') or auth.uid() = author_id);
drop policy if exists "works_owner_all" on public.works;
create policy "works_owner_all" on public.works for all
  using (auth.uid() = author_id) with check (auth.uid() = author_id);
create index if not exists works_author_idx on public.works(author_id);
create index if not exists works_status_idx on public.works(status);
create index if not exists works_series_idx on public.works(series_id);

-- ---------------------------------------------------------------------------
-- chapters (parts of a work).
-- ---------------------------------------------------------------------------
create table if not exists public.chapters (
  id           uuid primary key default gen_random_uuid(),
  work_id      uuid not null references public.works(id) on delete cascade,
  number       int not null,
  title        text default '',
  body         text default '',
  published    boolean not null default false,
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (work_id, number)
);
alter table public.chapters enable row level security;
drop policy if exists "chapters_select" on public.chapters;
create policy "chapters_select" on public.chapters for select using (
  published or exists (select 1 from public.works w where w.id = work_id and w.author_id = auth.uid())
);
drop policy if exists "chapters_owner_all" on public.chapters;
create policy "chapters_owner_all" on public.chapters for all
  using (exists (select 1 from public.works w where w.id = work_id and w.author_id = auth.uid()))
  with check (exists (select 1 from public.works w where w.id = work_id and w.author_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- tags and the work<->tag join.
-- ---------------------------------------------------------------------------
create table if not exists public.tags (
  id          uuid primary key default gen_random_uuid(),
  name        text unique not null,
  kind        text not null default 'freeform' check (kind in ('house','freeform')),
  description text default ''
);
alter table public.tags enable row level security;
drop policy if exists "tags_select" on public.tags;
create policy "tags_select" on public.tags for select using (true);
drop policy if exists "tags_insert_authed" on public.tags;
create policy "tags_insert_authed" on public.tags for insert to authenticated with check (true);

create table if not exists public.work_tags (
  work_id uuid not null references public.works(id) on delete cascade,
  tag_id  uuid not null references public.tags(id) on delete cascade,
  primary key (work_id, tag_id)
);
alter table public.work_tags enable row level security;
drop policy if exists "work_tags_select" on public.work_tags;
create policy "work_tags_select" on public.work_tags for select using (true);
drop policy if exists "work_tags_owner_all" on public.work_tags;
create policy "work_tags_owner_all" on public.work_tags for all
  using (exists (select 1 from public.works w where w.id = work_id and w.author_id = auth.uid()))
  with check (exists (select 1 from public.works w where w.id = work_id and w.author_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- hearts (one per user per work), with a counter kept on works.
-- ---------------------------------------------------------------------------
create table if not exists public.hearts (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  work_id    uuid not null references public.works(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, work_id)
);
alter table public.hearts enable row level security;
drop policy if exists "hearts_select" on public.hearts;
create policy "hearts_select" on public.hearts for select using (true);
drop policy if exists "hearts_owner_all" on public.hearts;
create policy "hearts_owner_all" on public.hearts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.bump_hearts() returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'INSERT' then
    update public.works set hearts_count = hearts_count + 1 where id = new.work_id;
  elsif tg_op = 'DELETE' then
    update public.works set hearts_count = greatest(0, hearts_count - 1) where id = old.work_id;
  end if;
  return null;
end; $$;
drop trigger if exists hearts_count_trg on public.hearts;
create trigger hearts_count_trg after insert or delete on public.hearts
  for each row execute function public.bump_hearts();

-- ---------------------------------------------------------------------------
-- subscriptions, bookmarks, follows.
-- ---------------------------------------------------------------------------
create table if not exists public.subscriptions (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  work_id    uuid not null references public.works(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, work_id)
);
alter table public.subscriptions enable row level security;
drop policy if exists "subs_own_select" on public.subscriptions;
create policy "subs_own_select" on public.subscriptions for select using (auth.uid() = user_id);
drop policy if exists "subs_own_all" on public.subscriptions;
create policy "subs_own_all" on public.subscriptions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.bookmarks (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  work_id    uuid not null references public.works(id) on delete cascade,
  note       text default '',
  created_at timestamptz not null default now(),
  primary key (user_id, work_id)
);
alter table public.bookmarks enable row level security;
drop policy if exists "bookmarks_own_select" on public.bookmarks;
create policy "bookmarks_own_select" on public.bookmarks for select using (auth.uid() = user_id);
drop policy if exists "bookmarks_own_all" on public.bookmarks;
create policy "bookmarks_own_all" on public.bookmarks for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.follows (
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
alter table public.follows enable row level security;
drop policy if exists "follows_select" on public.follows;
create policy "follows_select" on public.follows for select using (true);
drop policy if exists "follows_own_all" on public.follows;
create policy "follows_own_all" on public.follows for all
  using (auth.uid() = follower_id) with check (auth.uid() = follower_id);

-- ---------------------------------------------------------------------------
-- comments (threaded, and per-paragraph when paragraph_index is set).
-- ---------------------------------------------------------------------------
create table if not exists public.comments (
  id              uuid primary key default gen_random_uuid(),
  work_id         uuid not null references public.works(id) on delete cascade,
  chapter_id      uuid references public.chapters(id) on delete cascade,
  paragraph_index int,
  parent_id       uuid references public.comments(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  body            text not null,
  created_at      timestamptz not null default now()
);
alter table public.comments enable row level security;
drop policy if exists "comments_select" on public.comments;
create policy "comments_select" on public.comments for select using (true);
drop policy if exists "comments_insert_authed" on public.comments;
create policy "comments_insert_authed" on public.comments for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "comments_delete_own" on public.comments;
create policy "comments_delete_own" on public.comments for delete using (auth.uid() = user_id);

create or replace function public.bump_comments() returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'INSERT' then
    update public.works set comments_count = comments_count + 1 where id = new.work_id;
  elsif tg_op = 'DELETE' then
    update public.works set comments_count = greatest(0, comments_count - 1) where id = old.work_id;
  end if;
  return null;
end; $$;
drop trigger if exists comments_count_trg on public.comments;
create trigger comments_count_trg after insert or delete on public.comments
  for each row execute function public.bump_comments();

-- ---------------------------------------------------------------------------
-- per-paragraph emoji reactions.
-- ---------------------------------------------------------------------------
create table if not exists public.reactions (
  id              uuid primary key default gen_random_uuid(),
  chapter_id      uuid not null references public.chapters(id) on delete cascade,
  paragraph_index int not null,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  emoji           text not null,
  created_at      timestamptz not null default now(),
  unique (chapter_id, paragraph_index, user_id, emoji)
);
alter table public.reactions enable row level security;
drop policy if exists "reactions_select" on public.reactions;
create policy "reactions_select" on public.reactions for select using (true);
drop policy if exists "reactions_own_all" on public.reactions;
create policy "reactions_own_all" on public.reactions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- reading lists, list items, reading progress.
-- ---------------------------------------------------------------------------
create table if not exists public.reading_lists (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  name       text not null,
  is_public  boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.reading_lists enable row level security;
drop policy if exists "lists_select_public_or_own" on public.reading_lists;
create policy "lists_select_public_or_own" on public.reading_lists for select
  using (is_public or auth.uid() = user_id);
drop policy if exists "lists_own_all" on public.reading_lists;
create policy "lists_own_all" on public.reading_lists for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.reading_list_items (
  list_id  uuid not null references public.reading_lists(id) on delete cascade,
  work_id  uuid not null references public.works(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (list_id, work_id)
);
alter table public.reading_list_items enable row level security;
drop policy if exists "list_items_select" on public.reading_list_items;
create policy "list_items_select" on public.reading_list_items for select using (
  exists (select 1 from public.reading_lists l where l.id = list_id and (l.is_public or l.user_id = auth.uid()))
);
drop policy if exists "list_items_own_all" on public.reading_list_items;
create policy "list_items_own_all" on public.reading_list_items for all
  using (exists (select 1 from public.reading_lists l where l.id = list_id and l.user_id = auth.uid()))
  with check (exists (select 1 from public.reading_lists l where l.id = list_id and l.user_id = auth.uid()));

create table if not exists public.reading_progress (
  user_id        uuid not null references public.profiles(id) on delete cascade,
  work_id        uuid not null references public.works(id) on delete cascade,
  chapter_number int not null default 1,
  updated_at     timestamptz not null default now(),
  primary key (user_id, work_id)
);
alter table public.reading_progress enable row level security;
drop policy if exists "progress_own_all" on public.reading_progress;
create policy "progress_own_all" on public.reading_progress for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- A convenience view that joins a work to its author's display name and handle,
-- so the front-end can read a card in one query.
-- ---------------------------------------------------------------------------
-- security_invoker makes the view run with the querying user's permissions, so
-- Row Level Security on the underlying tables still applies (drafts stay hidden).
create or replace view public.works_with_author with (security_invoker = true) as
  select w.*,
    p.display_name as author_name,
    p.handle as author_handle,
    (select count(*) from public.chapters c where c.work_id = w.id and c.published) as chapters_count
  from public.works w
  join public.profiles p on p.id = w.author_id;

grant select on public.works_with_author to anon, authenticated;
