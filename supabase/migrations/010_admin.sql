-- ============================================================================
-- Wisp · migration 010: the admin control panel
-- Adds the storage and access rules behind the owner-only admin panel: a place
-- to keep the panel's unlock password (as a salted hash, never plaintext) and a
-- policy that lets an admin delete any work for moderation. Adding and deleting
-- events and hubs is already admin-gated by migrations 004 and 007.
--
-- IMPORTANT: the panel password is a convenience lock in the browser. The real
-- protection is that every destructive action here requires being signed in as
-- an admin account (is_admin = true), which the database enforces below. So even
-- if someone learned the panel password, they could not change anything without
-- your admin login.
-- Run once after 009: SQL Editor > New query > paste > Run. Safe to re-run.
-- ============================================================================

-- 1. Where the admin panel password hash lives. One row, admins only.
create table if not exists public.admin_settings (
  id            int primary key default 1,
  panel_pw_hash text not null,
  panel_pw_salt text not null,
  updated_at    timestamptz not null default now(),
  constraint admin_settings_singleton check (id = 1)
);
alter table public.admin_settings enable row level security;
drop policy if exists "admin_settings_admin_all" on public.admin_settings;
create policy "admin_settings_admin_all" on public.admin_settings for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- Seed the default panel password: "Readingishope". Change it in the panel.
-- (This is sha256('wisp-admin-v1' || 'Readingishope'); the salt is not secret.)
insert into public.admin_settings (id, panel_pw_hash, panel_pw_salt) values
  (1, '52e65bb0d28d995db350d24b9011e85cc7e742a89bf867742780d156f31a84f2', 'wisp-admin-v1')
on conflict (id) do nothing;

-- 2. Let an admin delete ANY work (moderation). Authors keep deleting their own
--    via the base-schema policy; these permissive policies simply OR together.
drop policy if exists "works_admin_delete" on public.works;
create policy "works_admin_delete" on public.works for delete
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- 3. Make yourself an admin. This finds your account by email and flips the
--    flag. Sign up on the site first so the row exists; re-run this line if you
--    created the account after running this migration. Change the email if needed.
update public.profiles set is_admin = true
where id = (select id from auth.users where email = 'azora1821@gmail.com');
