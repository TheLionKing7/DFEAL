-- DFEAL — Archive stale/expired opportunities
-- Run: supabase db push

-- 1. Extend opportunity_status enum
alter type public.opportunity_status add value if not exists 'archived';

-- 2. Add archived_at timestamp
alter table public.opportunities
  add column if not exists archived_at timestamptz;

-- 3. Index on archived_at for fast lookups
create index if not exists opportunities_archived_at_idx
  on public.opportunities (archived_at)
  where archived_at is not null;

-- 4. Function: archive all stale opportunities
--    Marks as 'archived' any opportunity where:
--    a) response_deadline has passed (more than 7 days ago — grace window)
--    b) status is 'closed', 'awarded', or 'cancelled'
--    c) no deadline set AND no update in 90+ days (truly abandoned)
create or replace function public.archive_stale_opportunities()
returns table (archived_count integer, archived_ids text[])
language plpgsql
as $$
declare
  total integer := 0;
  ids   text[] := '{}';
begin
  -- a) Response deadline passed more than 7 days ago
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
  select array_agg(updated.id), count(*)
  into ids, total
  from updated;

  -- b) Status is closed / awarded / cancelled — normalize to archived
  with updated as (
    update public.opportunities
    set status = 'archived',
        archived_at = coalesce(archived_at, now()),
        updated_at = now()
    where status in ('closed', 'awarded', 'cancelled')
    returning id
  )
  select ids || array_agg(updated.id), total + count(*)
  into ids, total
  from updated;

  -- c) Active but no deadline and no update in 90+ days (stale ingest)
  with updated as (
    update public.opportunities
    set status = 'archived',
        archived_at = now(),
        updated_at = now()
    where status = 'active'
      and response_deadline is null
      and updated_at < (now() - interval '90 days')
    returning id
  )
  select ids || array_agg(updated.id), total + count(*)
  into ids, total
  from updated;

  return query select total, ids;
end;
$$;