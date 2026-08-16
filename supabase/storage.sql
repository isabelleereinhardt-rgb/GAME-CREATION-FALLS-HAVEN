-- ============================================================================
-- Wisp · Storage buckets for uploaded images (covers and in-chapter images).
-- Run this in the Supabase SQL Editor after schema.sql. Safe to re-run.
-- ============================================================================

insert into storage.buckets (id, name, public) values ('covers', 'covers', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('chapter-images', 'chapter-images', true)
  on conflict (id) do nothing;

-- Anyone can view images; signed-in users can upload; owners manage their own.
drop policy if exists "images_public_read" on storage.objects;
create policy "images_public_read" on storage.objects for select
  using (bucket_id in ('covers', 'chapter-images'));

drop policy if exists "images_auth_insert" on storage.objects;
create policy "images_auth_insert" on storage.objects for insert to authenticated
  with check (bucket_id in ('covers', 'chapter-images'));

drop policy if exists "images_owner_update" on storage.objects;
create policy "images_owner_update" on storage.objects for update to authenticated
  using (owner = auth.uid());

drop policy if exists "images_owner_delete" on storage.objects;
create policy "images_owner_delete" on storage.objects for delete to authenticated
  using (owner = auth.uid());
