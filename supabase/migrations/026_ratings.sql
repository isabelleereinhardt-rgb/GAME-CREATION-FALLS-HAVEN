-- Wisp · migration 026: book ratings
--
-- Readers give a work a star rating from 1 to 5 on its synopsis page. One
-- rating per reader per work, changeable at any time. Running totals live on
-- the works row (ratings_count and ratings_sum) so a work's average, and an
-- author's average across their books, read with no aggregation query. Rating
-- badges are auto-assigned from the author's average in the app.
--
-- Safe to re-run.

create table if not exists public.ratings (
  id         uuid primary key default gen_random_uuid(),
  work_id    uuid not null references public.works (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  stars      smallint not null check (stars between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (work_id, user_id)
);
create index if not exists ratings_work_idx on public.ratings (work_id);

alter table public.ratings enable row level security;

drop policy if exists ratings_select on public.ratings;
create policy ratings_select on public.ratings for select using (true);

drop policy if exists ratings_insert on public.ratings;
create policy ratings_insert on public.ratings for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists ratings_update on public.ratings;
create policy ratings_update on public.ratings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists ratings_delete on public.ratings;
create policy ratings_delete on public.ratings for delete using (auth.uid() = user_id);

-- Running totals on the work.
alter table public.works add column if not exists ratings_count int not null default 0;
alter table public.works add column if not exists ratings_sum   int not null default 0;

create or replace function public.bump_ratings() returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'INSERT' then
    update public.works set ratings_count = ratings_count + 1, ratings_sum = ratings_sum + new.stars where id = new.work_id;
  elsif tg_op = 'DELETE' then
    update public.works set ratings_count = greatest(0, ratings_count - 1), ratings_sum = greatest(0, ratings_sum - old.stars) where id = old.work_id;
  elsif tg_op = 'UPDATE' then
    update public.works set ratings_sum = greatest(0, ratings_sum - old.stars + new.stars) where id = new.work_id;
  end if;
  return null;
end; $$;

drop trigger if exists ratings_agg_trg on public.ratings;
create trigger ratings_agg_trg after insert or update or delete on public.ratings
  for each row execute function public.bump_ratings();

-- The works_with_author view expands w.* at creation time, so re-create it to
-- expose the two new columns.
create or replace view public.works_with_author with (security_invoker = true) as
  select w.*,
    p.display_name as author_name,
    p.handle as author_handle,
    (select count(*) from public.chapters c where c.work_id = w.id and c.published) as chapters_count
  from public.works w
  join public.profiles p on p.id = w.author_id;

grant select on public.works_with_author to anon, authenticated;
