-- ============================================================================
-- Wisp · migration 003: scheduled chapter releases
-- Adds a per-chapter release time, auto-releases a chapter once that time
-- passes (no background job needed), and exposes only the release metadata of
-- upcoming chapters to readers, so the countdown can show without leaking the
-- unpublished text.
-- Run once after 002: SQL Editor > New query > paste > Run. Safe to re-run.
-- ============================================================================

alter table public.chapters add column if not exists scheduled_for timestamptz;

-- A chapter becomes readable when it is published, OR when its scheduled time
-- has passed, OR to its author. This auto-releases scheduled chapters with no
-- cron: the moment scheduled_for is in the past, the row is selectable.
drop policy if exists "chapters_select" on public.chapters;
create policy "chapters_select" on public.chapters for select using (
  published
  or (scheduled_for is not null and scheduled_for <= now())
  or exists (select 1 from public.works w where w.id = work_id and w.author_id = auth.uid())
);

-- Upcoming (still-locked) chapters: expose ONLY the number and release time, not
-- the body or title, so readers can see the countdown without early access.
-- Owned by the migration role, so it reads past the row-level rules for exactly
-- these two columns.
create or replace view public.upcoming_chapters as
  select work_id, number, scheduled_for
  from public.chapters
  where not published and scheduled_for is not null and scheduled_for > now();
grant select on public.upcoming_chapters to anon, authenticated;
