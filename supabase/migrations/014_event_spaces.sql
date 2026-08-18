-- ============================================================================
-- Wisp · migration 014: event spaces
-- Each event gets a private space its members can post in. Only people who have
-- joined the event (a row in event_participants) can read or write its posts,
-- enforced by RLS, so an event space is visible only to its members.
-- Run once after 013: SQL Editor > New query > paste > Run. Safe to re-run.
-- ============================================================================

create table if not exists public.event_posts (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists event_posts_event_idx on public.event_posts(event_id, created_at);
alter table public.event_posts enable row level security;

-- Only members of the event (or admins) may read its space.
drop policy if exists "event_posts_select_members" on public.event_posts;
create policy "event_posts_select_members" on public.event_posts for select using (
  exists (select 1 from public.event_participants ep where ep.event_id = event_posts.event_id and ep.user_id = auth.uid())
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
);
-- A member may post as themselves.
drop policy if exists "event_posts_insert_members" on public.event_posts;
create policy "event_posts_insert_members" on public.event_posts for insert to authenticated with check (
  auth.uid() = user_id
  and exists (select 1 from public.event_participants ep where ep.event_id = event_posts.event_id and ep.user_id = auth.uid())
);
-- Authors delete their own posts; admins can moderate any.
drop policy if exists "event_posts_delete_own" on public.event_posts;
create policy "event_posts_delete_own" on public.event_posts for delete using (
  auth.uid() = user_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
);
