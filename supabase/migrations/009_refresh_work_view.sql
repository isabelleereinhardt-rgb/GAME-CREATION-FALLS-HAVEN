-- ============================================================================
-- Wisp · migration 009: refresh the works_with_author view
-- The view was created with `select w.*` back in the base schema, before
-- migrations 002 and 005 added comments_enabled, logged_in_only, and hide_stats
-- to the works table. Postgres freezes `select *` to the columns that existed
-- when the view was created, so those three columns never reached the front-end
-- and the per-work privacy controls (allow comments, logged-in-only, hide my
-- numbers) silently did nothing on the read path. Recreating the view re-expands
-- `w.*` to every current column, so the controls take effect.
-- Run once after 008: SQL Editor > New query > paste > Run. Safe to re-run.
-- ============================================================================

create or replace view public.works_with_author with (security_invoker = true) as
  select w.*,
    p.display_name as author_name,
    p.handle as author_handle,
    (select count(*) from public.chapters c where c.work_id = w.id and c.published) as chapters_count
  from public.works w
  join public.profiles p on p.id = w.author_id;

grant select on public.works_with_author to anon, authenticated;
