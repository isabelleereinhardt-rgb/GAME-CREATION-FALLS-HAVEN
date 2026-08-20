-- Wisp · migration 029: handle history (so old @handle links keep working)
--
-- When a member changes their handle, the old one is recorded here pointing at
-- their account. Opening a link to an old handle then resolves to the current
-- profile instead of a dead end. Anyone can read it (a public profile lookup
-- needs to), and a member can only record their own old handle.
--
-- Safe to re-run.

create table if not exists public.handle_history (
  old_handle text primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  changed_at timestamptz not null default now()
);
create index if not exists handle_history_profile_idx on public.handle_history (profile_id);

alter table public.handle_history enable row level security;

drop policy if exists handle_history_select on public.handle_history;
create policy handle_history_select on public.handle_history for select using (true);

drop policy if exists handle_history_insert on public.handle_history;
create policy handle_history_insert on public.handle_history for insert to authenticated with check (auth.uid() = profile_id);

-- The owner may also update the row (e.g. reclaiming a handle they used before).
drop policy if exists handle_history_update on public.handle_history;
create policy handle_history_update on public.handle_history for update
  using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
