-- ============================================================================
-- Wisp · migration 012: gift exchanges (auto-matched, AO3 style)
-- Readers sign up to an exchange with a request (what they want to receive) and
-- an offer (what they can write). An admin opens and closes sign-ups, then runs
-- matching, which pairs everyone in a cycle so each person writes one gift and
-- receives one. Givers see only their assignment's request (the receiver stays
-- anonymous) until the admin reveals, when receivers see their gift and its
-- author.
-- Run once after 011: SQL Editor > New query > paste > Run. Safe to re-run.
-- ============================================================================

create table if not exists public.exchanges (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  note       text default '',
  status     text not null default 'signups' check (status in ('signups','matched','revealed','closed')),
  reveal_at  timestamptz,
  created_at timestamptz not null default now()
);
alter table public.exchanges enable row level security;
drop policy if exists "exchanges_select" on public.exchanges;
create policy "exchanges_select" on public.exchanges for select using (true);
drop policy if exists "exchanges_admin_write" on public.exchanges;
create policy "exchanges_admin_write" on public.exchanges for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

create table if not exists public.exchange_signups (
  id          uuid primary key default gen_random_uuid(),
  exchange_id uuid not null references public.exchanges(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  request     text default '',
  offer       text default '',
  created_at  timestamptz not null default now(),
  unique (exchange_id, user_id)
);
create index if not exists exchange_signups_ex_idx on public.exchange_signups(exchange_id);
alter table public.exchange_signups enable row level security;
-- A reader sees their own sign-up; admins see them all (to run matching).
drop policy if exists "exchange_signups_select" on public.exchange_signups;
create policy "exchange_signups_select" on public.exchange_signups for select
  using (auth.uid() = user_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
drop policy if exists "exchange_signups_insert_own" on public.exchange_signups;
create policy "exchange_signups_insert_own" on public.exchange_signups for insert to authenticated
  with check (auth.uid() = user_id);
drop policy if exists "exchange_signups_update_own" on public.exchange_signups;
create policy "exchange_signups_update_own" on public.exchange_signups for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "exchange_signups_delete_own" on public.exchange_signups;
create policy "exchange_signups_delete_own" on public.exchange_signups for delete
  using (auth.uid() = user_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

create table if not exists public.exchange_assignments (
  id          uuid primary key default gen_random_uuid(),
  exchange_id uuid not null references public.exchanges(id) on delete cascade,
  giver_id    uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  request     text default '',
  work_id     uuid references public.works(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists exchange_assignments_ex_idx on public.exchange_assignments(exchange_id);
alter table public.exchange_assignments enable row level security;
-- The giver sees their own assignment; the receiver sees theirs only once the
-- exchange is revealed; admins see all.
drop policy if exists "exchange_assignments_select" on public.exchange_assignments;
create policy "exchange_assignments_select" on public.exchange_assignments for select using (
  auth.uid() = giver_id
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  or (auth.uid() = receiver_id and exists (select 1 from public.exchanges e where e.id = exchange_id and e.status = 'revealed'))
);
drop policy if exists "exchange_assignments_admin_write" on public.exchange_assignments;
create policy "exchange_assignments_admin_write" on public.exchange_assignments for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
-- The giver may attach the gift work they wrote to their own assignment.
drop policy if exists "exchange_assignments_giver_update" on public.exchange_assignments;
create policy "exchange_assignments_giver_update" on public.exchange_assignments for update
  using (auth.uid() = giver_id) with check (auth.uid() = giver_id);
