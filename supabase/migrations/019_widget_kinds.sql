-- ============================================================================
-- Wisp · migration 019: allow the new hub widget kinds
-- Migration 015 created hub_widgets with a CHECK that only permitted the first
-- four kinds. This widens it to the full set (image, quote, list, progress,
-- button, video, faq), so those widgets can be saved. Existing rows are
-- unaffected.
-- Run once after 018: SQL Editor > New query > paste > Run. Safe to re-run.
-- ============================================================================

alter table public.hub_widgets drop constraint if exists hub_widgets_kind_check;
alter table public.hub_widgets add constraint hub_widgets_kind_check
  check (kind in ('note','countdown','links','poll','image','quote','list','progress','button','video','faq'));
