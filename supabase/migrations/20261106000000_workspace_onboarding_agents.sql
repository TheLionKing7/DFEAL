-- Smart Capture — invite-only onboarding, per-firm workspace lanes, persistent
-- assistant memory, connectors, automations engine and stored daily briefings.
--
-- Idempotent. Apply after 20261031000000_multi_tenant_firms.sql.

begin;

-- ---------------------------------------------------------------------------
-- 1. Firm workspace configuration
-- ---------------------------------------------------------------------------
alter table public.firms add column if not exists entity_type text;
alter table public.firms add column if not exists employee_range text;
alter table public.firms add column if not exists dba_name text;
alter table public.firms
  add column if not exists workspace jsonb not null default
    '{"stateScope":"selected","local":true,"education":true,"grants":true,"briefingEmail":true}'::jsonb;
alter table public.firms add column if not exists onboarded_at timestamptz;

comment on column public.firms.workspace is
  'WorkspaceSettings JSON: stateScope (all|selected|home_only), local, education, grants, briefingEmail. Federal (SAM) is always on.';

-- DFEAL keeps its current behaviour: IL home state, selected target states, every lane on.
update public.firms
set workspace = '{"stateScope":"selected","local":true,"education":true,"grants":true,"briefingEmail":true}'::jsonb,
    onboarded_at = coalesce(onboarded_at, created_at)
where slug = 'dfeal' and onboarded_at is null;

-- ---------------------------------------------------------------------------
-- 2. Personal profiles (collected during onboarding)
-- ---------------------------------------------------------------------------
create table if not exists public.user_profiles (
  email       text primary key check (email = lower(email)),
  user_id     uuid,
  full_name   text,
  job_title   text,
  phone       text,
  timezone    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists user_profiles_updated_at on public.user_profiles;
create trigger user_profiles_updated_at
  before update on public.user_profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Workspace invitations (invite-only onboarding of new firms)
-- ---------------------------------------------------------------------------
create table if not exists public.firm_invitations (
  id            uuid primary key default gen_random_uuid(),
  email         text not null check (email = lower(email)),
  company_name  text,
  note          text,
  status        text not null default 'pending'
                  check (status in ('pending', 'accepted', 'revoked', 'expired')),
  invited_by    text not null,
  firm_id       uuid references public.firms (id) on delete set null,
  expires_at    timestamptz not null default (now() + interval '30 days'),
  accepted_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists firm_invitations_email_idx on public.firm_invitations (email, status);
create unique index if not exists firm_invitations_one_pending
  on public.firm_invitations (email) where status = 'pending';

-- ---------------------------------------------------------------------------
-- 4. Persistent assistant memory
-- ---------------------------------------------------------------------------
create table if not exists public.assistant_memories (
  id              uuid primary key default gen_random_uuid(),
  firm_id         uuid not null references public.firms (id) on delete cascade,
  user_email      text not null,
  scope           text not null default 'user' check (scope in ('user', 'firm')),
  category        text not null default 'other'
                    check (category in ('workflow', 'task', 'opportunity', 'guideline', 'preference', 'other')),
  content         text not null check (length(content) between 1 and 2000),
  opportunity_id  text references public.opportunities (id) on delete set null,
  source          text not null default 'user' check (source in ('user', 'assistant', 'automation')),
  pinned          boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists assistant_memories_lookup
  on public.assistant_memories (firm_id, user_email, pinned desc, updated_at desc);

drop trigger if exists assistant_memories_updated_at on public.assistant_memories;
create trigger assistant_memories_updated_at
  before update on public.assistant_memories
  for each row execute function public.set_updated_at();

-- Carry over any memories stored in the old JSON column.
insert into public.assistant_memories (firm_id, user_email, content, source, created_at)
select s.firm_id, s.user_email, left(m ->> 'text', 2000), 'user',
       coalesce((m ->> 'created_at')::timestamptz, now())
from public.user_assistant_settings s
cross join lateral jsonb_array_elements(coalesce(s.memories, '[]'::jsonb)) m
where coalesce(m ->> 'text', '') <> ''
  and not exists (
    select 1 from public.assistant_memories am
    where am.firm_id = s.firm_id and am.user_email = s.user_email and am.content = left(m ->> 'text', 2000)
  );

-- ---------------------------------------------------------------------------
-- 5. Connectors (workspace integrations)
-- ---------------------------------------------------------------------------
create table if not exists public.connectors (
  id              uuid primary key default gen_random_uuid(),
  firm_id         uuid not null references public.firms (id) on delete cascade,
  type            text not null check (type in (
                    'email', 'webhook', 'slack', 'teams', 'zapier', 'mcp',
                    'google', 'microsoft', 'calendar_feed')),
  name            text not null,
  config          jsonb not null default '{}'::jsonb,
  secret_enc      text,
  status          text not null default 'active' check (status in ('active', 'error', 'disabled')),
  last_tested_at  timestamptz,
  last_error      text,
  created_by      text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists connectors_firm_idx on public.connectors (firm_id, type);
-- Calendar feed tokens are looked up without a session.
create unique index if not exists connectors_feed_token
  on public.connectors ((config ->> 'token')) where type = 'calendar_feed';

drop trigger if exists connectors_updated_at on public.connectors;
create trigger connectors_updated_at
  before update on public.connectors
  for each row execute function public.set_updated_at();

comment on column public.connectors.secret_enc is
  'AES-256-GCM ciphertext (CONNECTOR_ENCRYPTION_KEY) of webhook URLs, API tokens and OAuth tokens. Never returned to clients.';

-- ---------------------------------------------------------------------------
-- 6. Automations engine
-- ---------------------------------------------------------------------------
alter table public.user_automations add column if not exists last_run_at timestamptz;
alter table public.user_automations add column if not exists last_run_status text;
alter table public.user_automations add column if not exists last_run_summary text;

create table if not exists public.automation_runs (
  id              uuid primary key default gen_random_uuid(),
  automation_id   uuid not null references public.user_automations (id) on delete cascade,
  firm_id         uuid not null references public.firms (id) on delete cascade,
  trigger         text not null default 'schedule',
  status          text not null default 'running' check (status in ('running', 'success', 'partial', 'failed')),
  matched         integer not null default 0,
  actions_ok      integer not null default 0,
  actions_failed  integer not null default 0,
  log             jsonb not null default '[]'::jsonb,
  started_at      timestamptz not null default now(),
  finished_at     timestamptz
);

create index if not exists automation_runs_automation_idx on public.automation_runs (automation_id, started_at desc);

create table if not exists public.automation_events (
  id              uuid primary key default gen_random_uuid(),
  automation_id   uuid not null references public.user_automations (id) on delete cascade,
  firm_id         uuid not null references public.firms (id) on delete cascade,
  opportunity_id  text not null references public.opportunities (id) on delete cascade,
  kind            text not null check (kind in ('match', 'deadline')),
  status          text not null default 'done'
                    check (status in ('pending_approval', 'done', 'failed', 'dismissed')),
  fit_score       numeric(5, 2),
  ai_summary      text,
  results         jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now(),
  resolved_at     timestamptz,
  unique (automation_id, opportunity_id, kind)
);

create index if not exists automation_events_firm_idx on public.automation_events (firm_id, status, created_at desc);

-- ---------------------------------------------------------------------------
-- 7. Stored daily briefings
-- ---------------------------------------------------------------------------
create table if not exists public.daily_briefings (
  id             uuid primary key default gen_random_uuid(),
  firm_id        uuid not null references public.firms (id) on delete cascade,
  briefing_date  date not null,
  content        jsonb not null,
  ai_summary     text,
  provider       text,
  emailed_at     timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (firm_id, briefing_date)
);

drop trigger if exists daily_briefings_updated_at on public.daily_briefings;
create trigger daily_briefings_updated_at
  before update on public.daily_briefings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 8. Reference documents (guide the agents when drafting)
-- ---------------------------------------------------------------------------
create table if not exists public.firm_documents (
  id                uuid primary key default gen_random_uuid(),
  firm_id           uuid not null references public.firms (id) on delete cascade,
  title             text not null,
  doc_type          text not null default 'other' check (doc_type in (
                      'capability_statement', 'past_proposal', 'rfi_response', 'sources_sought',
                      'past_performance', 'resume', 'style_guide', 'template', 'other')),
  storage_path      text,
  file_name         text,
  mime_type         text,
  size_bytes        integer,
  extracted_text    text,
  char_count        integer not null default 0,
  use_for_drafting  boolean not null default true,
  notes             text,
  uploaded_by       text not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists firm_documents_firm_idx on public.firm_documents (firm_id, doc_type, created_at desc);

drop trigger if exists firm_documents_updated_at on public.firm_documents;
create trigger firm_documents_updated_at
  before update on public.firm_documents
  for each row execute function public.set_updated_at();

-- Private bucket; objects live under <firm_id>/<document_id>/<file name>.
insert into storage.buckets (id, name, public, file_size_limit)
values ('firm-files', 'firm-files', false, 26214400)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 9. RLS (server uses the service role; these are defence in depth)
-- ---------------------------------------------------------------------------
alter table public.user_profiles enable row level security;
alter table public.firm_invitations enable row level security;
alter table public.assistant_memories enable row level security;
alter table public.connectors enable row level security;
alter table public.automation_runs enable row level security;
alter table public.automation_events enable row level security;
alter table public.daily_briefings enable row level security;
alter table public.firm_documents enable row level security;

drop policy if exists "own_profile" on public.user_profiles;
create policy "own_profile" on public.user_profiles for all to authenticated
  using (email = lower(auth.jwt() ->> 'email'))
  with check (email = lower(auth.jwt() ->> 'email'));

drop policy if exists "own_invitations" on public.firm_invitations;
create policy "own_invitations" on public.firm_invitations for select to authenticated
  using (email = lower(auth.jwt() ->> 'email'));

drop policy if exists "firm_user_memories" on public.assistant_memories;
create policy "firm_user_memories" on public.assistant_memories for all to authenticated
  using (firm_id in (select public.current_firm_ids())
         and (scope = 'firm' or user_email = lower(auth.jwt() ->> 'email')))
  with check (firm_id in (select public.current_firm_ids())
              and user_email = lower(auth.jwt() ->> 'email'));

do $$
declare t text;
begin
  -- connectors intentionally have no authenticated policy: secrets stay server-side.
  foreach t in array array['automation_runs', 'automation_events', 'daily_briefings', 'firm_documents'] loop
    execute format('drop policy if exists "firm_read_rows" on public.%I', t);
    execute format($p$
      create policy "firm_read_rows" on public.%I for select to authenticated
        using (firm_id in (select public.current_firm_ids()))
    $p$, t);
  end loop;
end $$;

commit;
