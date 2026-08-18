-- ============================================================================
-- Wisp · migration 009: refresh the works_with_author view
-- The view was created with `select w.*` back in the base schema, before
-- migrations 002 and 005 added comments_enabled, logged_in_only, and hide_stats
-- to the works table. Postgres freezes `select *` to the columns that existed
-- when the view was created, so those three columns never reached the front-end
-- and the per-work privacy controls (allow comments, logged-in-only, hide my
-- numbers) silently did nothing on the read path.
--
-- `create or replace view` cannot be used here: the new columns land in the
-- middle of the `w.*` expansion, which would shift the position of author_name
-- and Postgres refuses to rename a view column. So we drop and recreate. Nothing
-- else in the database depends on this view (only the front-end reads it), so
-- the drop is safe and needs no CASCADE.
-- Run once after 008: SQL Editor > New query > paste > Run. Safe to re-run.
-- ============================================================================

drop view if exists public.works_with_author;

create view public.works_with_author with (security_invoker = true) as
  select w.*,
    p.display_name as author_name,
    p.handle as author_handle,
    (select count(*) from public.chapters c where c.work_id = w.id and c.published) as chapters_count
  from public.works w
  join public.profiles p on p.id = w.author_id;

grant select on public.works_with_author to anon, authenticated;
