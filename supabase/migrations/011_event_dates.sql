-- ============================================================================
-- Wisp · migration 011: real start times for events
-- Gives events an actual timestamp so the community page can show a live
-- countdown to each one, the same way scheduled chapters count down. The old
-- day/month text columns stay for the little date badge; when starts_at is set
-- the badge and countdown are both derived from it (in Eastern Time).
-- Run once after 010: SQL Editor > New query > paste > Run. Safe to re-run.
-- ============================================================================

alter table public.events add column if not exists starts_at timestamptz;
