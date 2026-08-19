-- ============================================================================
-- Wisp · migration 021: let the category list also hold fandoms
-- Fandoms come pre-seeded in the app (a large starter list), and writers can
-- type any fandom, which then gets suggested to everyone. This widens the
-- category scope so an admin can also curate extra fandoms from the panel,
-- the same way they manage event and hub kinds.
-- Run once after 020: SQL Editor > New query > paste > Run. Safe to re-run.
-- ============================================================================

alter table public.categories
  drop constraint if exists categories_scope_check;
alter table public.categories
  add constraint categories_scope_check check (scope in ('event', 'hub', 'fandom'));
