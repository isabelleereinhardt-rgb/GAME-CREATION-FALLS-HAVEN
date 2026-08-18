-- ============================================================================
-- Wisp · migration 013: event duration
-- An event can now last a set length of time (hours or days). We store the end
-- instant; the community page counts down to the start, shows "Happening now"
-- between the start and the end, then marks the event ended once the end passes.
-- Run once after 012: SQL Editor > New query > paste > Run. Safe to re-run.
-- ============================================================================

alter table public.events add column if not exists ends_at timestamptz;
