-- Wisp · migration 031: Top Five / Top Ten contest badges
--
-- The badge case gained two more contest honors (the supplied top-5 and top-10
-- medal art). Bigger contests now hand them out automatically at close time:
--   places 4-5  -> 'top-five'  when the contest drew six or more entries
--   places 6-10 -> 'top-ten'   when the contest drew eleven or more entries
-- The entry-count floors keep the badges meaningful: no "Top Ten" medal for
-- coming last in a field of seven.
--
-- Re-defines finalize_contest() from migration 030; everything else about the
-- close (ranking, results rows, first/second/third badges, tie-breaks) is
-- unchanged. Safe to re-run.

create or replace function public.finalize_contest(cid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.contests;
  r record;
  pl int := 0;
  total int := 0;
  badge_id text;
begin
  select * into c from public.contests where id = cid;
  if c.id is null then return; end if;
  if c.status <> 'open' then return; end if;
  if c.closes_at is null or c.closes_at > now() then return; end if;

  select count(*) into total from public.contest_entries e where e.contest_id = cid;

  for r in
    select e.id as entry_id, e.work_id, e.author_id, e.created_at,
           count(v.user_id) as votes
    from public.contest_entries e
    left join public.contest_votes v on v.entry_id = e.id
    where e.contest_id = cid
    group by e.id, e.work_id, e.author_id, e.created_at
    order by count(v.user_id) desc, e.created_at asc
  loop
    pl := pl + 1;
    insert into public.contest_results (contest_id, place, entry_id, work_id, author_id, votes)
      values (cid, pl, r.entry_id, r.work_id, r.author_id, r.votes)
      on conflict (contest_id, place) do nothing;

    badge_id := case
      when pl = 1 then 'first-place'
      when pl = 2 then 'second-place'
      when pl = 3 then 'third-place'
      when pl in (4, 5) and total >= 6 then 'top-five'
      when pl between 6 and 10 and total >= 11 then 'top-ten'
      else null
    end;
    if badge_id is not null and r.author_id is not null then
      update public.profiles p
        set badges = coalesce(p.badges, '[]'::jsonb) || to_jsonb(badge_id)
        where p.id = r.author_id
          and not (coalesce(p.badges, '[]'::jsonb) ? badge_id);
    end if;
  end loop;

  update public.contests set status = 'closed' where id = cid;
end;
$$;
grant execute on function public.finalize_contest(uuid) to authenticated, anon;
