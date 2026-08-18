-- ============================================================================
-- Wisp · migration 015: hub widgets (customizable page blocks)
-- An admin can add small blocks to any hub page: a pinned note, a live
-- countdown, a list of links, or a poll readers vote in. Widgets are ordered
-- by position and each carries a small JSON config sized to its kind. Poll
-- votes live in their own table, one row per reader per poll.
-- Run once after 014: SQL Editor > New query > paste > Run. Safe to re-run.
-- ============================================================================

create table if not exists public.hub_widgets (
  id         uuid primary key default gen_random_uuid(),
  hub_id     uuid not null references public.hubs(id) on delete cascade,
  kind       text not null check (kind in ('note','countdown','links','poll')),
  title      text default '',
  config     jsonb not null default '{}'::jsonb,
  position   int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists hub_widgets_hub_idx on public.hub_widgets(hub_id, position);
alter table public.hub_widgets enable row level security;
-- Anyone may read a hub's widgets; only admins add, edit, or remove them.
drop policy if exists "hub_widgets_select" on public.hub_widgets;
create policy "hub_widgets_select" on public.hub_widgets for select using (true);
drop policy if exists "hub_widgets_admin_write" on public.hub_widgets;
create policy "hub_widgets_admin_write" on public.hub_widgets for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- Poll votes: one row per reader per poll widget. choice is the option index.
create table if not exists public.widget_poll_votes (
  id         uuid primary key default gen_random_uuid(),
  widget_id  uuid not null references public.hub_widgets(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  choice     int not null,
  created_at timestamptz not null default now(),
  unique (widget_id, user_id)
);
create index if not exists widget_poll_votes_w_idx on public.widget_poll_votes(widget_id);
alter table public.widget_poll_votes enable row level security;
-- Everyone can read the tallies; a reader writes, changes, or clears only their
-- own vote.
drop policy if exists "widget_poll_votes_select" on public.widget_poll_votes;
create policy "widget_poll_votes_select" on public.widget_poll_votes for select using (true);
drop policy if exists "widget_poll_votes_insert_own" on public.widget_poll_votes;
create policy "widget_poll_votes_insert_own" on public.widget_poll_votes for insert to authenticated
  with check (auth.uid() = user_id);
drop policy if exists "widget_poll_votes_update_own" on public.widget_poll_votes;
create policy "widget_poll_votes_update_own" on public.widget_poll_votes for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "widget_poll_votes_delete_own" on public.widget_poll_votes;
create policy "widget_poll_votes_delete_own" on public.widget_poll_votes for delete
  using (auth.uid() = user_id);
