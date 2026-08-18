-- ============================================================================
-- Wisp · migration 018: managed category lists for event and hub kinds
-- The "kind" of an event or a hub is now chosen from a list the admin curates,
-- instead of free text. scope says which list a row belongs to. Everyone can
-- read the lists (to render the dropdowns); only admins add or remove entries.
-- Run once after 017: SQL Editor > New query > paste > Run. Safe to re-run.
-- ============================================================================

create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  scope      text not null check (scope in ('event','hub')),
  name       text not null,
  sort       int  not null default 0,
  created_at timestamptz not null default now(),
  unique (scope, name)
);
alter table public.categories enable row level security;
drop policy if exists "categories_select" on public.categories;
create policy "categories_select" on public.categories for select using (true);
drop policy if exists "categories_admin_write" on public.categories;
create policy "categories_admin_write" on public.categories for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- Seed sensible starting lists. Add or remove entries from the admin panel.
insert into public.categories (scope, name, sort) values
  ('event', 'Collection', 1),
  ('event', 'Exchange',   2),
  ('event', 'Nomination', 3),
  ('event', 'Challenge',  4),
  ('event', 'Fest',       5),
  ('hub',   'Tag',        1),
  ('hub',   'Fandom',     2),
  ('hub',   'Format',     3),
  ('hub',   'Ship',       4),
  ('hub',   'Character',  5)
on conflict (scope, name) do nothing;
