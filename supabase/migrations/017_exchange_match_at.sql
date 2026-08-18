-- ============================================================================
-- Wisp · migration 017: a close time for gift exchanges
-- An exchange can have a match_at time: when it passes, sign-ups close and
-- matching runs. Readers see a live countdown to it. The site is static, so the
-- run itself happens the next time an admin loads the page after the time
-- passes (matching is admin-only under the policies from migration 012); the
-- countdown and the auto-run keep it hands-off in practice.
-- Run once after 016: SQL Editor > New query > paste > Run. Safe to re-run.
-- ============================================================================

alter table public.exchanges add column if not exists match_at timestamptz;
