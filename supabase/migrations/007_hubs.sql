-- ============================================================================
-- Wisp · migration 007: community hubs that persist
-- Turns the hub cards into real rows and records who follows each one, so the
-- Follow button actually sticks. Member counts shown in the app are the real
-- number of followers, not a seeded figure. Seeds the six starter hubs.
-- Run once after 006: SQL Editor > New query > paste > Run. Safe to re-run.
-- ============================================================================

create table if not exists public.hubs (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  kind       text not null default 'Tag',
  note       text default '',
  icon       text default 'tag',
  sort       int  not null default 0,
  created_at timestamptz not null default now()
);
alter table public.hubs enable row level security;
drop policy if exists "hubs_select" on public.hubs;
create policy "hubs_select" on public.hubs for select using (true);
drop policy if exists "hubs_admin_write" on public.hubs;
create policy "hubs_admin_write" on public.hubs for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

create table if not exists public.hub_members (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  hub_id     uuid not null references public.hubs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, hub_id)
);
create index if not exists hub_members_hub_idx on public.hub_members(hub_id);
alter table public.hub_members enable row level security;
drop policy if exists "hub_members_select" on public.hub_members;
create policy "hub_members_select" on public.hub_members for select using (true);
drop policy if exists "hub_members_own_all" on public.hub_members;
create policy "hub_members_own_all" on public.hub_members for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Seed the starter hubs (fixed ids so re-running does not duplicate them).
insert into public.hubs (id, name, kind, note, icon, sort) values
  ('40000000-0000-4000-8000-000000000001', 'The Locked Tide', 'Fandom', 'Harbor witches, smugglers, and one very slow-burning winter.', 'tag', 1),
  ('40000000-0000-4000-8000-000000000002', 'slow burn', 'Tag', 'For readers who like it to take exactly as long as it takes.', 'tag', 2),
  ('40000000-0000-4000-8000-000000000003', 'Holmesian', 'Fandom', 'Cases, fog, and the space between two chairs by a fire.', 'tag', 3),
  ('40000000-0000-4000-8000-000000000004', 'Original Progression', 'Tag', 'Systems, ladders, and the long climb. Fanfic and original both welcome.', 'tag', 4),
  ('40000000-0000-4000-8000-000000000005', 'Cozy and No Romance', 'Tag', 'Warmth without a love plot. Found family lives here.', 'tag', 5),
  ('40000000-0000-4000-8000-000000000006', 'Webcomics', 'Format', 'Vertical scroll and page by page. Fancomics and originals, mixed.', 'book', 6)
on conflict (id) do nothing;
