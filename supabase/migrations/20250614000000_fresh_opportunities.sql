-- DFEAL — 7-day opportunity freshness window
--
-- Policy: the platform surfaces only "fresh" deals (due in the future, or
-- closed within a short grace window). Anything whose response deadline
-- has expired by more than 7 days is archived; undated opportunities are
-- archived once they are more than 7 days old.
--
-- Run in Supabase SQL Editor, or: supabase db push
--
-- NOTE: idempotent and safe to re-run. Supersedes the earlier 4-day policy.

create or replace function public.archive_stale_opportunities()
returns table (archived_count integer, archived_ids text[])
language plpgsql
as $$
declare
  total integer := 0;
  ids   text[] := '{}';
begin
  -- a) Response deadline expired more than 7 days ago
  with updated as (
    update public.opportunities
    set status = 'archived',
        archived_at = now(),
        updated_at = now()
    where status = 'active'
      and response_deadline is not null
      and response_deadline < (now() - interval '7 days')
    returning id
  )
  select ids || coalesce(array_agg(updated.id), '{}'), total + count(*)
  into ids, total
  from updated;

  -- b) No deadline set AND older than 7 days (stale/undated ingest)
  with updated as (
    update public.opportunities
    set status = 'archived',
        archived_at = now(),
        updated_at = now()
    where status = 'active'
      and response_deadline is null
      and coalesce(posted_date, created_at) < (now() - interval '7 days')
    returning id
  )
  select ids || coalesce(array_agg(updated.id), '{}'), total + count(*)
  into ids, total
  from updated;

  -- c) Status is closed / awarded / cancelled — normalize to archived
  with updated as (
    update public.opportunities
    set status = 'archived',
        archived_at = coalesce(archived_at, now()),
        updated_at = now()
    where status in ('closed', 'awarded', 'cancelled')
    returning id
  )
  select ids || coalesce(array_agg(updated.id), '{}'), total + count(*)
  into ids, total
  from updated;

  return query select total, ids;
end;
$$;

-- ---------------------------------------------------------------------------
-- One-time cleanup: archive everything that is stale RIGHT NOW.
-- (Safe to run repeatedly — subsequent runs archive nothing new.)
-- ---------------------------------------------------------------------------
select * from public.archive_stale_opportunities();
