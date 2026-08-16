-- ============================================================================
-- Wisp · feature migration 002
-- The base schema (schema.sql) already includes reactions, follows,
-- reading_progress, reading_lists, and reading_list_items. This migration adds
-- only what is missing for the feature rollout: following tags, saved
-- highlights ("Things"), chapter notes, per-work settings, pinned works, and a
-- reading-position percent.
-- Run once after schema.sql: SQL Editor > New query > paste > Run. Safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- tag_follows: a reader follows a tag.
-- ---------------------------------------------------------------------------
create table if not exists public.tag_follows (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  tag_id     uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, tag_id)
);
alter table public.tag_follows enable row level security;
drop policy if exists "tag_follows_select" on public.tag_follows;
create policy "tag_follows_select" on public.tag_follows for select using (true);
drop policy if exists "tag_follows_own_all" on public.tag_follows;
create policy "tag_follows_own_all" on public.tag_follows for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- highlights ("Things"): a private saved passage and note.
-- ---------------------------------------------------------------------------
create table if not exists public.highlights (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  work_id         uuid not null references public.works(id) on delete cascade,
  chapter_id      uuid references public.chapters(id) on delete set null,
  paragraph_index int,
  text            text not null,
  note            text default '',
  created_at      timestamptz not null default now()
);
create index if not exists highlights_user_idx on public.highlights(user_id, created_at desc);
alter table public.highlights enable row level security;
drop policy if exists "highlights_own_select" on public.highlights;
create policy "highlights_own_select" on public.highlights for select using (auth.uid() = user_id);
drop policy if exists "highlights_own_all" on public.highlights;
create policy "highlights_own_all" on public.highlights for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Column additions on existing tables.
-- ---------------------------------------------------------------------------
alter table public.reading_progress add column if not exists percent int not null default 0;

alter table public.chapters add column if not exists author_note  text default '';
alter table public.chapters add column if not exists content_note text default '';

alter table public.works add column if not exists comments_enabled boolean not null default true;
alter table public.works add column if not exists logged_in_only   boolean not null default false;

alter table public.profiles add column if not exists pinned uuid[] not null default '{}';
