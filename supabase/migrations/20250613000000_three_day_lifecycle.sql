-- DFEAL — 3-day opportunity lifecycle
-- Replaces the earlier 7-day / 90-day archive thresholds with a tight
-- "only host new opportunities" policy:
--
--   * Lifecycle = 3 days (an opportunity is only "current" for ~3 days).
--   * Any opportunity that has expired for 4+ days is archived
--     (3-day lifecycle + 1-day grace before the archive job sweeps it).
--
-- Run in Supabase SQL Editor, or: supabase db push
--
-- NOTE: this migration is idempotent and safe to re-run.

-- 1. Extend opportunity_status enum (kept here for standalone safety)
alter type public.opportunity_status add value if not exists 'archived';

-- 2. Add archived_at timestamp
alter table public.opportunities
  add column if not exists archived_at timestamptz;

-- 3. Index on archived_at for fast lookups
create index if not exists opportunities_archived_at_idx
  on public.opportunities (archived_at)
  where archived_at is not null;

-- 4. Function: archive all stale/expired opportunities
--    Marks as 'archived' any opportunity where:
--    a) response_deadline has passed by 4 or more days (expired), or
--    b) no deadline set AND the opportunity is 4+ days old
--       (its 3-day lifecycle has lapsed with a 1-day grace), or
--    c) status is 'closed', 'awarded', or 'cancelled'.
create or replace function public.archive_stale_opportunities()
returns table (archived_count integer, archived_ids text[])
language plpgsql
as $$
declare
  total integer := 0;
  ids   text[] := '{}';
begin
  -- a) Response deadline passed 4+ days ago
  with updated as (
    update public.opportunities
    set status = 'archived',
        archived_at = now(),
        updated_at = now()
    where status = 'active'
      and response_deadline is not null
      and response_deadline < (now() - interval '4 days')
    returning id
  )
  select ids || coalesce(array_agg(updated.id), '{}'), total + count(*)
  into ids, total
  from updated;

  -- b) No deadline set AND past its 3-day lifecycle (4+ days old)
  with updated as (
    update public.opportunities
    set status = 'archived',
        archived_at = now(),
        updated_at = now()
    where status = 'active'
      and response_deadline is null
      and coalesce(posted_date, created_at) < (now() - interval '4 days')
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
