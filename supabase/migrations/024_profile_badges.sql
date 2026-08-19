-- Wisp · migration 024: profile badges (award case)
--
-- Badges are the little metallic awards shown on a profile (contest wins,
-- consistency streaks, milestones, kindness, silly personality, seasonal
-- events). They are stored on the profile row as a jsonb array of badge ids,
-- e.g. ["grand-prize","first-words","night-owl"]. Milestone badges are also
-- derived on the client from the profile's own numbers, so this column only
-- needs to hold the *granted* ones (contest/community/silly/seasonal).
--
-- Safe to re-run.

alter table public.profiles
  add column if not exists badges jsonb not null default '[]'::jsonb;

-- A reader can already update their own row (profiles_update_own scopes to
-- auth.uid() = id), which covers showcasing their own earned badges.
--
-- Granting a badge to *another* member (a contest win, a kindness award) is an
-- admin action. Wisp has no per-row admin flag in this schema, so grants are
-- performed by an account listed in public.admins (id uuid primary key). Create
-- that table if it does not exist and allow those accounts to update any
-- profile's badges.
create table if not exists public.admins (
  id uuid primary key references auth.users (id) on delete cascade
);
alter table public.admins enable row level security;

-- Admins can update any profile (used only for the badges column from the app).
drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles
  for update
  using (exists (select 1 from public.admins a where a.id = auth.uid()))
  with check (exists (select 1 from public.admins a where a.id = auth.uid()));

-- To make yourself an admin, run once with your account's uuid:
--   insert into public.admins (id) values ('<your-auth-uid>') on conflict do nothing;
