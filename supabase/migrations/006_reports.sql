-- ============================================================================
-- Wisp · migration 006: reports that persist
-- Makes the in-app report button real. A signed-in reader files a report and
-- it is written to a table the moderation team reads (out of band, via the
-- Supabase dashboard or the service role). Readers never read other people's
-- reports, so nothing leaks.
-- Run once after 005: SQL Editor > New query > paste > Run. Safe to re-run.
-- ============================================================================

create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null,
  target_type text not null check (target_type in ('work', 'comment', 'user')),
  target_id   uuid not null,
  reason      text not null,
  detail      text default '',
  status      text not null default 'open',
  created_at  timestamptz not null default now()
);
create index if not exists reports_target_idx on public.reports(target_type, target_id);
create index if not exists reports_status_idx on public.reports(status);

alter table public.reports enable row level security;

-- A signed-in reader can file a report, but only as themselves.
drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own" on public.reports for insert to authenticated
  with check (auth.uid() = reporter_id);

-- Reporters can look back at reports they filed; nobody can read anyone else's.
-- Moderators work from the dashboard / service role, which bypasses RLS.
drop policy if exists "reports_select_own" on public.reports;
create policy "reports_select_own" on public.reports for select to authenticated
  using (auth.uid() = reporter_id);

-- No update or delete policy: reports are immutable to ordinary users once filed.
