-- Wisp · migration 030: hub/community contests
--
-- A contest is a time-boxed competition: writers enter their own works, every
-- member gets ONE vote (changeable until it closes), and when the closing date
-- passes it finalizes on its own, ranks the entries by votes, and hands the top
-- three authors the first/second/third place badges.
--
-- Shapes mirror the gift-exchange tables: public read, an is_admin write gate,
-- and a `closes_at` timestamp that a client checks to run the close (the site is
-- static, so there is no server cron). Awarding badges to OTHER members is done
-- by a SECURITY DEFINER function so no caller needs elevated rights.
--
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- the contest itself. `hub` optionally ties it to a hub by name (hubs are
-- name-scoped in this app); blank means a site-wide Community Space contest.
-- ---------------------------------------------------------------------------
create table if not exists public.contests (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text default '',
  hub         text default '',
  created_by  uuid references public.profiles (id) on delete set null,
  closes_at   timestamptz,
  status      text not null default 'open' check (status in ('open','closed')),
  created_at  timestamptz not null default now()
);
alter table public.contests enable row level security;
drop policy if exists contests_select on public.contests;
create policy contests_select on public.contests for select using (true);
drop policy if exists contests_admin_write on public.contests;
create policy contests_admin_write on public.contests for all
  using      (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- ---------------------------------------------------------------------------
-- entries: a writer submits their OWN work. One work per contest. Insert is
-- allowed only for a work you own, only while the contest is open.
-- ---------------------------------------------------------------------------
create table if not exists public.contest_entries (
  id         uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.contests (id) on delete cascade,
  work_id    uuid not null references public.works (id) on delete cascade,
  author_id  uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (contest_id, work_id)
);
create index if not exists contest_entries_contest_idx on public.contest_entries (contest_id);
alter table public.contest_entries enable row level security;
drop policy if exists contest_entries_select on public.contest_entries;
create policy contest_entries_select on public.contest_entries for select using (true);
drop policy if exists contest_entries_insert_own on public.contest_entries;
create policy contest_entries_insert_own on public.contest_entries for insert to authenticated
  with check (
    auth.uid() = author_id
    and exists (select 1 from public.works w where w.id = work_id and w.author_id = auth.uid())
    and exists (select 1 from public.contests c where c.id = contest_id and c.status = 'open'
                and (c.closes_at is null or c.closes_at > now()))
  );
drop policy if exists contest_entries_delete_own on public.contest_entries;
create policy contest_entries_delete_own on public.contest_entries for delete
  using (auth.uid() = author_id
    and exists (select 1 from public.contests c where c.id = contest_id and c.status = 'open'));

-- ---------------------------------------------------------------------------
-- votes: exactly one row per (contest, member) via the composite primary key,
-- so "changing your vote" just moves the row to another entry. Only while open.
-- ---------------------------------------------------------------------------
create table if not exists public.contest_votes (
  contest_id uuid not null references public.contests (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  entry_id   uuid not null references public.contest_entries (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (contest_id, user_id)
);
create index if not exists contest_votes_entry_idx on public.contest_votes (entry_id);
alter table public.contest_votes enable row level security;
drop policy if exists contest_votes_select on public.contest_votes;
create policy contest_votes_select on public.contest_votes for select using (true);
drop policy if exists contest_votes_insert_own on public.contest_votes;
create policy contest_votes_insert_own on public.contest_votes for insert to authenticated
  with check (auth.uid() = user_id
    and exists (select 1 from public.contests c where c.id = contest_id and c.status = 'open'
                and (c.closes_at is null or c.closes_at > now())));
drop policy if exists contest_votes_update_own on public.contest_votes;
create policy contest_votes_update_own on public.contest_votes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id
    and exists (select 1 from public.contests c where c.id = contest_id and c.status = 'open'
                and (c.closes_at is null or c.closes_at > now())));
drop policy if exists contest_votes_delete_own on public.contest_votes;
create policy contest_votes_delete_own on public.contest_votes for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- results: the final ranking, written only by finalize_contest(). One row per
-- place. Public read; no direct writes (no insert/update policy).
-- ---------------------------------------------------------------------------
create table if not exists public.contest_results (
  contest_id uuid not null references public.contests (id) on delete cascade,
  place      int  not null,
  entry_id   uuid references public.contest_entries (id) on delete set null,
  work_id    uuid,
  author_id  uuid,
  votes      int  not null default 0,
  created_at timestamptz not null default now(),
  primary key (contest_id, place)
);
alter table public.contest_results enable row level security;
drop policy if exists contest_results_select on public.contest_results;
create policy contest_results_select on public.contest_results for select using (true);

-- ---------------------------------------------------------------------------
-- finalize_contest: the "auto-close" worker. Any viewer (signed in or not) may
-- call it once the closing time has passed; it no-ops if the contest is not due
-- or is already closed. SECURITY DEFINER so it can rank entries, write results,
-- and append the placement badges to the winners' profiles without the caller
-- needing any special rights. Ties break by who entered first.
-- ---------------------------------------------------------------------------
create or replace function public.finalize_contest(cid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.contests;
  r record;
  pl int := 0;
  badge_id text;
begin
  select * into c from public.contests where id = cid;
  if c.id is null then return; end if;
  if c.status <> 'open' then return; end if;
  if c.closes_at is null or c.closes_at > now() then return; end if;

  for r in
    select e.id as entry_id, e.work_id, e.author_id, e.created_at,
           count(v.user_id) as votes
    from public.contest_entries e
    left join public.contest_votes v on v.entry_id = e.id
    where e.contest_id = cid
    group by e.id, e.work_id, e.author_id, e.created_at
    order by count(v.user_id) desc, e.created_at asc
  loop
    pl := pl + 1;
    insert into public.contest_results (contest_id, place, entry_id, work_id, author_id, votes)
      values (cid, pl, r.entry_id, r.work_id, r.author_id, r.votes)
      on conflict (contest_id, place) do nothing;

    badge_id := case pl when 1 then 'first-place' when 2 then 'second-place' when 3 then 'third-place' else null end;
    if badge_id is not null and r.author_id is not null then
      update public.profiles p
        set badges = coalesce(p.badges, '[]'::jsonb) || to_jsonb(badge_id)
        where p.id = r.author_id
          and not (coalesce(p.badges, '[]'::jsonb) ? badge_id);
    end if;
  end loop;

  update public.contests set status = 'closed' where id = cid;
end;
$$;
grant execute on function public.finalize_contest(uuid) to authenticated, anon;
