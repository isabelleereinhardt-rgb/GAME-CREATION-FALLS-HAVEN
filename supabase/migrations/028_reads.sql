-- Wisp · migration 028: count work reads (views)
--
-- reads_count existed on works but nothing ever incremented it, so the "reads"
-- number on a work never moved. This records one read per signed-in reader per
-- work (so the count is distinct readers, not refresh-spam) and keeps the total
-- on the works row via a trigger, the same shape as hearts and comments. The
-- count lives on works, which the whole app reads through works_with_author, so
-- it is the same on every device.
--
-- Safe to re-run.

create table if not exists public.reads (
  id         uuid primary key default gen_random_uuid(),
  work_id    uuid not null references public.works (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (work_id, user_id)
);
create index if not exists reads_work_idx on public.reads (work_id);

alter table public.reads enable row level security;

drop policy if exists reads_insert on public.reads;
create policy reads_insert on public.reads for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists reads_select_own on public.reads;
create policy reads_select_own on public.reads for select using (auth.uid() = user_id);

create or replace function public.bump_reads() returns trigger language plpgsql security definer as $$
begin
  update public.works set reads_count = reads_count + 1 where id = new.work_id;
  return null;
end; $$;

drop trigger if exists reads_count_trg on public.reads;
create trigger reads_count_trg after insert on public.reads
  for each row execute function public.bump_reads();
