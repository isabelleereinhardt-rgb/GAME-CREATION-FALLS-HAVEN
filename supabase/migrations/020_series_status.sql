-- ============================================================================
-- Wisp · migration 020: a series can be marked in-progress or completed
-- Works already carry their own status; a series needs its own so an author can
-- say "this whole series is finished" independently of any single book.
-- Run once after 019: SQL Editor > New query > paste > Run. Safe to re-run.
-- ============================================================================

alter table public.series
  add column if not exists status text not null default 'ongoing';

alter table public.series
  drop constraint if exists series_status_check;
alter table public.series
  add constraint series_status_check check (status in ('ongoing', 'complete'));
