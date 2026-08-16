-- ============================================================================
-- Wisp · migration 004: community events that persist
-- Turns the events list into real rows and records who joined, so join/leave
-- survives a refresh. Seeds the three starter events.
-- Run once after 003: SQL Editor > New query > paste > Run. Safe to re-run.
-- ============================================================================

create table if not exists public.events (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  kind       text not null default 'Collection',
  note       text default '',
  day        text default '',
  month      text default '',
  sort       int  not null default 0,
  created_at timestamptz not null default now()
);
alter table public.events enable row level security;
drop policy if exists "events_select" on public.events;
create policy "events_select" on public.events for select using (true);
drop policy if exists "events_admin_write" on public.events;
create policy "events_admin_write" on public.events for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

create table if not exists public.event_participants (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  event_id   uuid not null references public.events(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);
create index if not exists event_participants_event_idx on public.event_participants(event_id);
alter table public.event_participants enable row level security;
drop policy if exists "event_participants_select" on public.event_participants;
create policy "event_participants_select" on public.event_participants for select using (true);
drop policy if exists "event_participants_own_all" on public.event_participants;
create policy "event_participants_own_all" on public.event_participants for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Seed the starter events (fixed ids so re-running does not duplicate them).
insert into public.events (id, title, kind, note, day, month, sort) values
  ('e0000000-0000-4000-8000-000000000001', 'Slow Burn September', 'Collection',
   'A month-long collection. Post anything where it takes its time. Open to fanwork and original.', '14', 'Sep', 1),
  ('e0000000-0000-4000-8000-000000000002', 'The Locked Tide Winter Exchange', 'Exchange',
   'Sign-ups open. Full gift-matching returns for this round; give a prompt, get a prompt.', '01', 'Oct', 2),
  ('e0000000-0000-4000-8000-000000000003', 'Small Works Spotlight', 'Nomination',
   'Nominate a work under a thousand hearts. The editors read every nomination.', '20', 'Oct', 3)
on conflict (id) do nothing;
