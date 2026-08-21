-- Wisp · migration 032: cross-device account state
--
-- What Wattpad and AO3 members expect: pick up the phone and the site is the
-- way you left it on the laptop. Works, drafts, highlights, progress, and
-- widgets already live in the database; this adds the last device-bound tier:
--   settings    the whole preferences blob: theme, accent, typography, reading
--               size/measure/face, safe mode, and the muted tags and blocked
--               authors that ride inside it
--   dictionary  the writer's personal spelling dictionary (added words)
--   extras      small editor preferences (line spacing, grammar toggle)
--
-- Muted tags and blocked authors are PRIVATE: unlike profile widgets (which a
-- profile displays publicly), this table is readable and writable only by its
-- owner, enforced by row-level security. No public select policy exists.
--
-- Safe to re-run.

create table if not exists public.user_state (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  settings   jsonb not null default '{}'::jsonb,
  dictionary jsonb not null default '[]'::jsonb,
  extras     jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_state enable row level security;

drop policy if exists user_state_select_own on public.user_state;
create policy user_state_select_own on public.user_state for select
  using (auth.uid() = user_id);

drop policy if exists user_state_insert_own on public.user_state;
create policy user_state_insert_own on public.user_state for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists user_state_update_own on public.user_state;
create policy user_state_update_own on public.user_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists user_state_delete_own on public.user_state;
create policy user_state_delete_own on public.user_state for delete
  using (auth.uid() = user_id);
