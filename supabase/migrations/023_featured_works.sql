-- Wisp · migration 023: staff picks (editor-featured works)
--
-- The signed-in home lost the "Staff picks" section that the preview home shows,
-- because there was never any curation behind it on the live site. This adds an
-- admin-curated list of featured works that the home surfaces as Staff picks.
--
-- Anyone can read the list; only admins (profiles.is_admin) can change it.
-- Safe to re-run.

create table if not exists public.featured_works (
  work_id    uuid primary key references public.works(id) on delete cascade,
  note       text not null default '',
  rank       int  not null default 0,
  created_at timestamptz not null default now()
);
alter table public.featured_works enable row level security;

drop policy if exists "featured_select" on public.featured_works;
create policy "featured_select" on public.featured_works for select using (true);

drop policy if exists "featured_admin_write" on public.featured_works;
create policy "featured_admin_write" on public.featured_works for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
