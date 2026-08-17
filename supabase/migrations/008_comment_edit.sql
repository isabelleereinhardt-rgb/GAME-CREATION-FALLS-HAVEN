-- ============================================================================
-- Wisp · migration 008: let readers edit their own comments
-- Delete-own already exists in the base schema. This adds the update policy so
-- a reader can fix a comment they wrote, plus an edited_at stamp so the app can
-- mark a comment as edited.
-- Run once after 007: SQL Editor > New query > paste > Run. Safe to re-run.
-- ============================================================================

alter table public.comments add column if not exists edited_at timestamptz;

drop policy if exists "comments_update_own" on public.comments;
create policy "comments_update_own" on public.comments for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
