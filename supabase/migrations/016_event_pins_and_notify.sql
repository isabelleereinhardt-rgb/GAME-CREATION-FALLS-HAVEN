-- ============================================================================
-- Wisp · migration 016: pinned event posts + per-event notification opt-in
-- Two additions to the event spaces from migration 014:
--   1. Admins can pin a post to the top of an event space (Discord style).
--   2. Each member can turn that event's activity notifications on or off. When
--      on (the default), a new post by another member shows in their Activity
--      feed. The feed is computed client-side from these posts, so no separate
--      notifications table is needed.
-- Run once after 015: SQL Editor > New query > paste > Run. Safe to re-run.
-- ============================================================================

-- 1. Pinning. A boolean on the post, writable only by admins.
alter table public.event_posts add column if not exists pinned boolean not null default false;

-- Admins may update any event post (to pin/unpin). Authors do not edit posts,
-- so this update policy is admin-only by design.
drop policy if exists "event_posts_admin_update" on public.event_posts;
create policy "event_posts_admin_update" on public.event_posts for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- 2. Per-member notification preference for an event. Defaults to on so joining
--    an event opts you into its activity; a member can switch it off in the
--    space. The existing "own rows" policy from migration 004 already lets a
--    member update their own participant row, so no new policy is needed.
alter table public.event_participants add column if not exists notify boolean not null default true;
