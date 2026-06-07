-- DFEAL Capture — initial Supabase schema
-- Run in Supabase SQL Editor or: supabase db push

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.opportunity_source as enum (
  'sam',
  'ohio',
  'georgia',
  'grants_gov',
  'demandstar',
  'bidbuy_il',
  'bonfire'
);

create type public.market_tier as enum (
  'federal',
  'state',
  'local',
  'education'
);

create type public.notice_type as enum (
  'presolicitation',
  'solicitation',
  'sources_sought',
  'award',
  'special_notice',
  'other'
);

create type public.opportunity_status as enum (
  'active',
  'closed',
  'awarded',
  'cancelled'
);

create type public.go_no_go as enum (
  'go',
  'no_go',
  'review'
);

create type public.agency_level as enum (
  'federal',
  'state',
  'local',
  'education',
  'other'
);

create type public.sam_entity_status as enum (
  'active',
  'inactive',
  'expired',
  'unknown'
);

create type public.document_format as enum (
  'pdf',
  'docx',
  'html',
  'markdown'
);

create type public.ingest_status as enum (
  'running',
  'success',
  'failed'
);

-- ---------------------------------------------------------------------------
-- Agencies
-- ---------------------------------------------------------------------------
create table public.agencies (
  id            uuid primary key default gen_random_uuid(),
  source        public.opportunity_source not null,
  external_id   text,
  name          text not null,
  parent_id     uuid references public.agencies (id) on delete set null,
  level         public.agency_level not null default 'other',
  state_code    char(2),
  market_tier   public.market_tier,
  raw_json      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (source, external_id)
);

create index agencies_name_idx on public.agencies (name);
create index agencies_state_code_idx on public.agencies (state_code);

-- ---------------------------------------------------------------------------
-- Opportunities (federal + SLED unified)
-- ---------------------------------------------------------------------------
create table public.opportunities (
  id                  text primary key,
  source              public.opportunity_source not null,
  external_id         text not null,
  market_tier         public.market_tier not null default 'federal',
  notice_type         public.notice_type not null default 'other',
  title               text not null,
  description         text,
  agency_id           uuid references public.agencies (id) on delete set null,
  agency_name         text,
  naics               text,
  psc                 text,
  set_aside           text,
  place_of_performance jsonb,
  estimated_value_usd numeric(18, 2),
  response_deadline   timestamptz,
  posted_date         timestamptz,
  status              public.opportunity_status not null default 'active',
  sam_url             text,
  source_url          text,
  raw_json            jsonb not null default '{}'::jsonb,
  content_hash        text,
  search_vector       tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(agency_name, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(naics, '')), 'D')
  ) stored,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (source, external_id)
);

create index opportunities_source_idx on public.opportunities (source);
create index opportunities_market_tier_idx on public.opportunities (market_tier);
create index opportunities_naics_idx on public.opportunities (naics);
create index opportunities_set_aside_idx on public.opportunities (set_aside);
create index opportunities_status_idx on public.opportunities (status);
create index opportunities_posted_date_idx on public.opportunities (posted_date desc);
create index opportunities_response_deadline_idx on public.opportunities (response_deadline);
create index opportunities_agency_id_idx on public.opportunities (agency_id);
create index opportunities_search_idx on public.opportunities using gin (search_vector);

-- ---------------------------------------------------------------------------
-- Opportunity amendments / updates
-- ---------------------------------------------------------------------------
create table public.opportunity_updates (
  id              uuid primary key default gen_random_uuid(),
  opportunity_id  text not null references public.opportunities (id) on delete cascade,
  label           text not null,
  detail          text not null default '',
  posted_at       timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

create index opportunity_updates_opp_idx on public.opportunity_updates (opportunity_id, posted_at desc);

-- ---------------------------------------------------------------------------
-- Opportunity contacts (from SAM detail / manual curation)
-- ---------------------------------------------------------------------------
create table public.opportunity_contacts (
  id              uuid primary key default gen_random_uuid(),
  opportunity_id  text not null references public.opportunities (id) on delete cascade,
  name            text,
  email           text,
  phone           text,
  title           text,
  contact_type    text not null default 'other',
  created_at      timestamptz not null default now()
);

create index opportunity_contacts_opp_idx on public.opportunity_contacts (opportunity_id);

-- ---------------------------------------------------------------------------
-- SAM entity cache
-- ---------------------------------------------------------------------------
create table public.sam_entities (
  uei               text primary key,
  cage              text,
  legal_name        text not null,
  dba_name          text,
  registration_status public.sam_entity_status not null default 'unknown',
  expiration_date   date,
  naics_codes       text[] not null default '{}',
  psc_codes         text[] not null default '{}',
  physical_address  jsonb,
  raw_json          jsonb not null default '{}'::jsonb,
  fetched_at        timestamptz not null default now()
);

create index sam_entities_cage_idx on public.sam_entities (cage);

-- ---------------------------------------------------------------------------
-- DFEAL daily surfacing scores
-- ---------------------------------------------------------------------------
create table public.opportunity_scores (
  id              uuid primary key default gen_random_uuid(),
  opportunity_id  text not null references public.opportunities (id) on delete cascade,
  fit_score       numeric(5, 2) not null check (fit_score >= 0 and fit_score <= 100),
  go_no_go        public.go_no_go not null default 'review',
  rationale       text not null default '',
  scored_at       timestamptz not null default now(),
  digest_batch_id uuid
);

create index opportunity_scores_opp_idx on public.opportunity_scores (opportunity_id, scored_at desc);
create index opportunity_scores_hot_idx on public.opportunity_scores (fit_score desc, scored_at desc);
create index opportunity_scores_go_idx on public.opportunity_scores (go_no_go, fit_score desc);

-- ---------------------------------------------------------------------------
-- AI Opportunity Analyzer runs
-- ---------------------------------------------------------------------------
create table public.analysis_runs (
  id              uuid primary key default gen_random_uuid(),
  opportunity_id  text not null references public.opportunities (id) on delete cascade,
  user_email      text,
  provider        text,
  fit_score       numeric(5, 2),
  go_no_go        public.go_no_go,
  result_json     jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index analysis_runs_opp_idx on public.analysis_runs (opportunity_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Generated proposal documents (metadata — files in Supabase Storage)
-- ---------------------------------------------------------------------------
create table public.generated_documents (
  id              uuid primary key default gen_random_uuid(),
  opportunity_id  text references public.opportunities (id) on delete set null,
  document_type   text not null default 'proposal_section',
  title           text,
  storage_bucket  text not null default 'dfeal-documents',
  storage_path    text not null,
  format          public.document_format not null default 'docx',
  provider        text,
  created_by      text,
  created_at      timestamptz not null default now()
);

create index generated_documents_opp_idx on public.generated_documents (opportunity_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Compliance validator runs
-- ---------------------------------------------------------------------------
create table public.compliance_runs (
  id              uuid primary key default gen_random_uuid(),
  document_id     uuid references public.generated_documents (id) on delete set null,
  opportunity_id  text references public.opportunities (id) on delete set null,
  provider        text,
  checklist_json  jsonb not null default '{}'::jsonb,
  pass_count      integer not null default 0,
  fail_count      integer not null default 0,
  created_at      timestamptz not null default now()
);

create index compliance_runs_opp_idx on public.compliance_runs (opportunity_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Watchlist
-- ---------------------------------------------------------------------------
create table public.watchlists (
  id              uuid primary key default gen_random_uuid(),
  user_email      text not null,
  opportunity_id  text not null references public.opportunities (id) on delete cascade,
  notes           text,
  created_at      timestamptz not null default now(),
  unique (user_email, opportunity_id)
);

create index watchlists_user_idx on public.watchlists (user_email, created_at desc);

-- ---------------------------------------------------------------------------
-- AI chat sessions (Consultant Chat)
-- ---------------------------------------------------------------------------
create table public.chat_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_email      text,
  page_context    jsonb not null default '{}'::jsonb,
  title           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.chat_messages (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references public.chat_sessions (id) on delete cascade,
  role            text not null check (role in ('user', 'assistant', 'system')),
  content         text not null,
  provider        text,
  created_at      timestamptz not null default now()
);

create index chat_messages_session_idx on public.chat_messages (session_id, created_at);

-- ---------------------------------------------------------------------------
-- Ingest cursors (SAM / SLED sync state)
-- ---------------------------------------------------------------------------
create table public.ingest_cursors (
  source          public.opportunity_source primary key,
  last_sync_at    timestamptz,
  cursor_value    text,
  last_status     public.ingest_status not null default 'success',
  last_error      text,
  rows_ingested   integer not null default 0,
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Cron / digest run log
-- ---------------------------------------------------------------------------
create table public.digest_runs (
  id              uuid primary key default gen_random_uuid(),
  run_type        text not null default 'daily_hot_opportunities',
  status          public.ingest_status not null default 'running',
  opportunities_scored integer not null default 0,
  hot_count       integer not null default 0,
  email_sent      boolean not null default false,
  error_message   text,
  started_at      timestamptz not null default now(),
  finished_at     timestamptz
);

-- Link scores to digest batch
alter table public.opportunity_scores
  add constraint opportunity_scores_digest_fkey
  foreign key (digest_batch_id) references public.digest_runs (id) on delete set null;

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger agencies_updated_at
  before update on public.agencies
  for each row execute function public.set_updated_at();

create trigger opportunities_updated_at
  before update on public.opportunities
  for each row execute function public.set_updated_at();

create trigger chat_sessions_updated_at
  before update on public.chat_sessions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Upsert helper for ingest workers
-- ---------------------------------------------------------------------------
create or replace function public.upsert_opportunity(
  p_id text,
  p_source public.opportunity_source,
  p_external_id text,
  p_market_tier public.market_tier,
  p_notice_type public.notice_type,
  p_title text,
  p_description text,
  p_agency_id uuid,
  p_agency_name text,
  p_naics text,
  p_psc text,
  p_set_aside text,
  p_place_of_performance jsonb,
  p_estimated_value_usd numeric,
  p_response_deadline timestamptz,
  p_posted_date timestamptz,
  p_status public.opportunity_status,
  p_sam_url text,
  p_source_url text,
  p_raw_json jsonb,
  p_content_hash text
)
returns public.opportunities
language plpgsql
as $$
declare
  result public.opportunities;
begin
  insert into public.opportunities (
    id, source, external_id, market_tier, notice_type, title, description,
    agency_id, agency_name, naics, psc, set_aside, place_of_performance,
    estimated_value_usd, response_deadline, posted_date, status,
    sam_url, source_url, raw_json, content_hash
  )
  values (
    p_id, p_source, p_external_id, p_market_tier, p_notice_type, p_title, p_description,
    p_agency_id, p_agency_name, p_naics, p_psc, p_set_aside, p_place_of_performance,
    p_estimated_value_usd, p_response_deadline, p_posted_date, p_status,
    p_sam_url, p_source_url, p_raw_json, p_content_hash
  )
  on conflict (source, external_id) do update set
    market_tier = excluded.market_tier,
    notice_type = excluded.notice_type,
    title = excluded.title,
    description = excluded.description,
    agency_id = excluded.agency_id,
    agency_name = excluded.agency_name,
    naics = excluded.naics,
    psc = excluded.psc,
    set_aside = excluded.set_aside,
    place_of_performance = excluded.place_of_performance,
    estimated_value_usd = excluded.estimated_value_usd,
    response_deadline = excluded.response_deadline,
    posted_date = excluded.posted_date,
    status = excluded.status,
    sam_url = excluded.sam_url,
    source_url = excluded.source_url,
    raw_json = excluded.raw_json,
    content_hash = excluded.content_hash,
    updated_at = now()
  returning * into result;

  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Hot opportunities view (latest score per opportunity)
-- ---------------------------------------------------------------------------
create or replace view public.hot_opportunities as
select
  o.*,
  s.fit_score,
  s.go_no_go,
  s.rationale as score_rationale,
  s.scored_at
from public.opportunities o
inner join lateral (
  select *
  from public.opportunity_scores os
  where os.opportunity_id = o.id
  order by os.scored_at desc
  limit 1
) s on true
where s.go_no_go in ('go', 'review')
  and s.fit_score >= 60
  and o.status = 'active';

-- ---------------------------------------------------------------------------
-- Row Level Security (single-tenant internal app)
-- Server uses SUPABASE_SERVICE_ROLE_KEY — bypasses RLS.
-- Enable authenticated team access when Supabase Auth is wired.
-- ---------------------------------------------------------------------------
alter table public.agencies enable row level security;
alter table public.opportunities enable row level security;
alter table public.opportunity_updates enable row level security;
alter table public.opportunity_contacts enable row level security;
alter table public.sam_entities enable row level security;
alter table public.opportunity_scores enable row level security;
alter table public.analysis_runs enable row level security;
alter table public.generated_documents enable row level security;
alter table public.compliance_runs enable row level security;
alter table public.watchlists enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.ingest_cursors enable row level security;
alter table public.digest_runs enable row level security;

-- Authenticated users (future @dfeal.com logins) — read all, write own watchlist/chat
create policy "authenticated_read_opportunities"
  on public.opportunities for select
  to authenticated
  using (true);

create policy "authenticated_read_scores"
  on public.opportunity_scores for select
  to authenticated
  using (true);

create policy "authenticated_read_agencies"
  on public.agencies for select
  to authenticated
  using (true);

create policy "authenticated_manage_own_watchlist"
  on public.watchlists for all
  to authenticated
  using (user_email = auth.jwt() ->> 'email')
  with check (user_email = auth.jwt() ->> 'email');

create policy "authenticated_manage_own_chat"
  on public.chat_sessions for all
  to authenticated
  using (user_email = auth.jwt() ->> 'email')
  with check (user_email = auth.jwt() ->> 'email');

create policy "authenticated_read_own_chat_messages"
  on public.chat_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.chat_sessions cs
      where cs.id = chat_messages.session_id
        and cs.user_email = auth.jwt() ->> 'email'
    )
  );

-- ---------------------------------------------------------------------------
-- Storage bucket for Phase 2 documents (run once in dashboard or via API)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dfeal-documents',
  'dfeal-documents',
  false,
  52428800,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/html',
    'text/markdown'
  ]
)
on conflict (id) do nothing;

-- Service role only for document bucket until auth is wired
create policy "service_role_documents"
  on storage.objects for all
  to service_role
  using (bucket_id = 'dfeal-documents')
  with check (bucket_id = 'dfeal-documents');

-- ---------------------------------------------------------------------------
-- Seed ingest cursor rows
-- ---------------------------------------------------------------------------
insert into public.ingest_cursors (source) values
  ('sam'),
  ('ohio'),
  ('georgia'),
  ('grants_gov'),
  ('demandstar'),
  ('bidbuy_il'),
  ('bonfire')
on conflict (source) do nothing;
