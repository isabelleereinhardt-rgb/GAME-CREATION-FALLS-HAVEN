-- ============================================================================
-- Wisp · migration 005: per-work controls
-- comments_enabled and logged_in_only already exist (migration 002). This adds
-- the one remaining flag so an author can hide their work's numbers.
-- Run once after 004: SQL Editor > New query > paste > Run. Safe to re-run.
-- ============================================================================

alter table public.works add column if not exists hide_stats boolean not null default false;
