-- Wisp · migration 027: pin a message on a profile's Conversations wall
--
-- Adds the pin flag and the owner-only update policy that the pin control needs.
-- Split out from migration 025 so operators who already ran 025 have a clear,
-- separate migration to run rather than needing to re-run 025.
--
-- Safe to re-run.

alter table public.profile_posts add column if not exists pinned boolean not null default false;
create index if not exists profile_posts_pinned_idx on public.profile_posts (profile_id, pinned desc, created_at desc);

-- Only the wall's owner may pin/unpin (update) a message on their wall.
drop policy if exists profile_posts_update on public.profile_posts;
create policy profile_posts_update on public.profile_posts for update
  using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
