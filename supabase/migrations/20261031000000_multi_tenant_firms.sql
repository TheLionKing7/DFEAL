-- Smart Capture — multi-tenant firms
--
-- Turns the single-tenant DFEAL deployment into a multi-firm platform:
--   * firms            — one row per onboarded contractor (NAICS, industry, profile, go/no-go rules)
--   * firm_members     — which users belong to which firm, with a role
--   * firm_id columns  — every tenant-owned table is scoped to a firm
--   * opportunity_scores becomes "latest score per (firm, opportunity)"
--   * hot_opportunities view is firm-aware
--   * RLS tightened (the earlier `using (true)` policies exposed rows to the anon key)
--
-- Existing data is backfilled to a seeded DFEAL firm (slug 'dfeal'), so the
-- current production workspace keeps working unchanged.
--
-- Idempotent where practical. Run with `supabase db push` or in the SQL editor.

begin;

-- ---------------------------------------------------------------------------
-- 1. Firms
-- ---------------------------------------------------------------------------
create table if not exists public.firms (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,48}$'),
  status                text not null default 'active' check (status in ('active', 'suspended')),

  -- Identity
  legal_name            text not null,
  short_name            text not null,
  uei                   text,
  cage                  text,
  duns                  text,
  sam_status            text not null default 'unknown'
                          check (sam_status in ('active', 'expired', 'inactive', 'unknown')),
  sam_expiration_date   date,

  -- Market focus
  industry              text not null,
  primary_naics         text not null check (primary_naics ~ '^\d{6}$'),
  naics_codes           text[] not null default '{}',
  psc_codes             text[] not null default '{}',
  keywords              text[] not null default '{}',
  set_asides            text[] not null default '{}',
  certifications        text[] not null default '{}',
  home_state            char(2),
  target_states         text[] not null default '{}',

  -- Narrative profile (feeds AI prompts + document generation)
  capability_statement  text not null default '',
  core_competencies     text[] not null default '{}',
  differentiators       text[] not null default '{}',
  past_performance      jsonb not null default '[]'::jsonb,

  -- Scoring rules
  go_no_go              jsonb not null default '{}'::jsonb,

  -- Contact + branding
  contact_email         text,
  phone                 text,
  website               text,
  address               text,
  assistant_name        text,

  -- Access + notifications
  allowed_email_domains text[] not null default '{}',
  digest_recipients     text[] not null default '{}',

  created_by            text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint firms_primary_in_naics check (primary_naics = any (naics_codes))
);

create index if not exists firms_status_idx on public.firms (status);
create index if not exists firms_naics_gin on public.firms using gin (naics_codes);
create index if not exists firms_domains_gin on public.firms using gin (allowed_email_domains);

drop trigger if exists firms_updated_at on public.firms;
create trigger firms_updated_at
  before update on public.firms
  for each row execute function public.set_updated_at();

comment on table public.firms is 'Onboarded contractor firms (tenants).';
comment on column public.firms.naics_codes is 'All NAICS codes the firm pursues, including primary_naics.';
comment on column public.firms.keywords is 'Capability keywords used for SLED/grant relevance filtering and scoring.';
comment on column public.firms.go_no_go is 'GoNoGoRules JSON: minContractValueUsd, preferredSetAsides, priorityAgencies, minDaysToDeadline, ...';

-- ---------------------------------------------------------------------------
-- 2. Firm members
-- ---------------------------------------------------------------------------
create table if not exists public.firm_members (
  id          uuid primary key default gen_random_uuid(),
  firm_id     uuid not null references public.firms (id) on delete cascade,
  email       text not null check (email = lower(email)),
  user_id     uuid,
  role        text not null default 'member' check (role in ('owner', 'admin', 'member')),
  invited_by  text,
  created_at  timestamptz not null default now(),
  unique (firm_id, email)
);

create index if not exists firm_members_email_idx on public.firm_members (email);
create index if not exists firm_members_user_idx on public.firm_members (user_id);

-- ---------------------------------------------------------------------------
-- 3. Seed DFEAL (the original tenant) so existing rows can be backfilled
-- ---------------------------------------------------------------------------
insert into public.firms (
  slug, legal_name, short_name, uei, cage, duns, sam_status,
  industry, primary_naics, naics_codes, keywords, set_asides, certifications,
  home_state, target_states, capability_statement, core_competencies,
  differentiators, past_performance, go_no_go, contact_email, phone, website,
  address, assistant_name, allowed_email_domains, digest_recipients, created_by
) values (
  'dfeal', 'DFEAL LLC', 'DFEAL', 'G1XCPA2ANMC3', '15RT3', '11-926-8200', 'unknown',
  'healthcare_consulting', '541611',
  array['541611','541618','541714','541512','561320','423450'],
  array['healthcare','clinical','research','program management','consulting','medical',
        'information technology','training','compliance','hipaa','fda','procurement'],
  array['8(a)','WOSB','None','Unrestricted'],
  array['Small Business (SB)','SAM.gov registered (UEI/CAGE on file)',
        'Government Purchase Card (GPC) Accepted','Project Management Professional (PMP)',
        'Certified ScrumMaster (CSM)','Lean Six Sigma',
        'Clinical Documentation Improvement Specialist (CDIS)',
        'Clinical Research Coordinator (CRC)','Registered Nurse (RN)'],
  'IL', array['IL','DE','OH','GA'],
  'DFEAL LLC is a healthcare and program management consulting firm providing specialized support to mission-critical organizations through healthcare program coordination, clinical and research administration, operational support services, and medical supply procurement. DFEAL also delivers R&D, Health IT (AI/ML-powered systems), scientific and technical consulting, project management aligned with PMI standards, and training & capacity building. Solutions are architected with FAR, HIPAA, and NIST SP 800-171 compliance in mind.',
  array['Healthcare Program Management & PMO Support',
        'Clinical & Research Support (IRB, SOP, trial coordination)',
        'Government Medical Supply Procurement',
        'Research & Development (biomedical, healthcare technologies)',
        'Health IT & Analytics (AI/ML-powered systems)',
        'Scientific & Technical Consulting','Project Management (PMI standards)',
        'Training & Capacity Building'],
  array['Integrated service model — research, program management & procurement through one relationship',
        'Regulatory fluency — deep FDA & IRB compliance expertise',
        'Clinical credibility — leadership grounded in ICU, research ops & healthcare management',
        'Agile delivery — PMP-certified with Lean Six Sigma & Agile/Scrum execution',
        'AI & ML integration for healthcare and research analytics',
        'Federal compliance by design — FAR, HIPAA, NIST SP 800-171',
        'Medical supply — GSA Schedule 65 relationships, rapid emergency response, GPC accepted'],
  '[{"contractName":"Healthcare Program Coordination","agency":"Holy Cross Health","period":"Ongoing","scope":"Healthcare program coordination and clinical research administration."},
    {"contractName":"PMO & Grant Administration","agency":"Adventist HealthCare","period":"Ongoing","scope":"PMO operations and grant/contract administration."},
    {"contractName":"Clinical Trial & IRB Support","agency":"Johns Hopkins Medicine","period":"Ongoing","scope":"IRB coordination, regulatory documentation, and clinical trial support."},
    {"contractName":"Program Management","agency":"Encompass Health","period":"Ongoing","scope":"Operational support and program management."},
    {"contractName":"Consulting / Program Management","agency":"Phison Gate LLC","period":"Ongoing","scope":"Consulting and program management services."},
    {"contractName":"Consulting / Program Management","agency":"STAKK A LLC","period":"Ongoing","scope":"Consulting and program management services."}]'::jsonb,
  '{"minContractValueUsd":500000,"preferredSetAsides":["8(a)","WOSB","None","Unrestricted"],"excludedSetAsides":[],"priorityAgencies":[],"excludedAgencies":[],"minDaysToDeadline":5}'::jsonb,
  'bdev@dfeal.com', '+1 (844) 442-0529', 'https://www.dfeal.com',
  '254 Chapman Rd, Ste 208, Newark, DE 19702', 'DFEAL''s Assistant',
  array['dfeal.com'], array['bdev@dfeal.com'], 'migration'
)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- 4. firm_id on every tenant-owned table (backfill → DFEAL)
-- ---------------------------------------------------------------------------
do $$
declare
  dfeal uuid := (select id from public.firms where slug = 'dfeal');
  t text;
begin
  foreach t in array array[
    'opportunity_scores', 'analysis_runs', 'generated_documents', 'compliance_runs',
    'watchlists', 'chat_sessions', 'user_opportunity_lists', 'user_assistant_settings',
    'user_automations', 'digest_runs'
  ] loop
    execute format('alter table public.%I add column if not exists firm_id uuid references public.firms (id) on delete cascade', t);
    execute format('update public.%I set firm_id = %L where firm_id is null', t, dfeal);
  end loop;
end $$;

-- digest_runs may be platform-wide (ingest) or per-firm — keep nullable.
alter table public.opportunity_scores      alter column firm_id set not null;
alter table public.analysis_runs           alter column firm_id set not null;
alter table public.generated_documents     alter column firm_id set not null;
alter table public.compliance_runs         alter column firm_id set not null;
alter table public.watchlists              alter column firm_id set not null;
alter table public.chat_sessions           alter column firm_id set not null;
alter table public.user_opportunity_lists  alter column firm_id set not null;
alter table public.user_assistant_settings alter column firm_id set not null;
alter table public.user_automations        alter column firm_id set not null;

-- ---------------------------------------------------------------------------
-- 5. Scores: one current row per (firm, opportunity) instead of unbounded history
-- ---------------------------------------------------------------------------
delete from public.opportunity_scores s
using public.opportunity_scores newer
where s.firm_id = newer.firm_id
  and s.opportunity_id = newer.opportunity_id
  and (s.scored_at, s.id) < (newer.scored_at, newer.id);

do $$ begin
  alter table public.opportunity_scores
    add constraint opportunity_scores_firm_opp_key unique (firm_id, opportunity_id);
exception when duplicate_object or duplicate_table then null; end $$;

create index if not exists opportunity_scores_firm_hot_idx
  on public.opportunity_scores (firm_id, fit_score desc);

-- ---------------------------------------------------------------------------
-- 6. Uniqueness now includes firm_id
-- ---------------------------------------------------------------------------
alter table public.watchlists drop constraint if exists watchlists_user_email_opportunity_id_key;
do $$ begin
  alter table public.watchlists
    add constraint watchlists_firm_user_opp_key unique (firm_id, user_email, opportunity_id);
exception when duplicate_object or duplicate_table then null; end $$;

alter table public.user_opportunity_lists
  drop constraint if exists user_opportunity_lists_user_email_opportunity_id_list_type_key;
do $$ begin
  alter table public.user_opportunity_lists
    add constraint user_lists_firm_user_opp_type_key unique (firm_id, user_email, opportunity_id, list_type);
exception when duplicate_object or duplicate_table then null; end $$;

alter table public.user_assistant_settings drop constraint if exists user_assistant_settings_pkey;
do $$ begin
  alter table public.user_assistant_settings
    add constraint user_assistant_settings_pkey primary key (firm_id, user_email);
exception when invalid_table_definition or duplicate_object or duplicate_table then null; end $$;

create index if not exists analysis_runs_firm_opp_idx on public.analysis_runs (firm_id, opportunity_id, created_at desc);
create index if not exists generated_documents_firm_idx on public.generated_documents (firm_id, created_at desc);
create index if not exists compliance_runs_firm_opp_idx on public.compliance_runs (firm_id, opportunity_id, created_at desc);
create index if not exists watchlists_firm_user_idx on public.watchlists (firm_id, user_email, updated_at desc);
create index if not exists chat_sessions_firm_user_idx on public.chat_sessions (firm_id, user_email, updated_at desc);
create index if not exists user_lists_firm_user_idx on public.user_opportunity_lists (firm_id, user_email, list_type);
create index if not exists user_automations_firm_user_idx on public.user_automations (firm_id, user_email);

-- ---------------------------------------------------------------------------
-- 7. Backfill DFEAL members from existing activity + auth users on dfeal.com
-- ---------------------------------------------------------------------------
insert into public.firm_members (firm_id, email, role, invited_by)
select f.id, lower(e.email), 'admin', 'migration'
from public.firms f
cross join (
  select user_email as email from public.watchlists
  union select user_email from public.chat_sessions where user_email is not null
  union select user_email from public.user_opportunity_lists
  union select user_email from public.user_assistant_settings
  union select created_by from public.generated_documents where created_by like '%@%'
  union select email from auth.users where email ilike '%@dfeal.com'
) e
where f.slug = 'dfeal' and e.email is not null
on conflict (firm_id, email) do nothing;

-- ---------------------------------------------------------------------------
-- 8. Firm-aware hot opportunities view
-- ---------------------------------------------------------------------------
drop view if exists public.hot_opportunities;
create view public.hot_opportunities
with (security_invoker = true) as
select
  o.*,
  s.firm_id,
  s.fit_score,
  s.go_no_go,
  s.rationale as score_rationale,
  s.scored_at
from public.opportunities o
join public.opportunity_scores s on s.opportunity_id = o.id
where s.go_no_go in ('go', 'review')
  and s.fit_score >= 60
  and o.status = 'active';

-- ---------------------------------------------------------------------------
-- 9. Row level security
--    The server uses the service-role key (bypasses RLS) and enforces firm
--    scoping in code. These policies are defence in depth for any client that
--    uses the anon key with a user JWT.
-- ---------------------------------------------------------------------------
create or replace function public.current_firm_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select firm_id from public.firm_members
  where email = lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

revoke all on function public.current_firm_ids() from public;
grant execute on function public.current_firm_ids() to authenticated;

alter table public.firms enable row level security;
alter table public.firm_members enable row level security;

drop policy if exists "members_read_own_firm" on public.firms;
create policy "members_read_own_firm" on public.firms
  for select to authenticated using (id in (select public.current_firm_ids()));

drop policy if exists "members_read_own_membership" on public.firm_members;
create policy "members_read_own_membership" on public.firm_members
  for select to authenticated using (firm_id in (select public.current_firm_ids()));

-- Remove permissive policies that applied to every role (including anon)
drop policy if exists "service_role_user_opportunity_lists" on public.user_opportunity_lists;
drop policy if exists "service_role_user_assistant_settings" on public.user_assistant_settings;
drop policy if exists "service_role_user_automations" on public.user_automations;
drop policy if exists "authenticated_read_scores" on public.opportunity_scores;
drop policy if exists "authenticated_manage_own_watchlist" on public.watchlists;
drop policy if exists "authenticated_manage_own_chat" on public.chat_sessions;
drop policy if exists "authenticated_read_own_chat_messages" on public.chat_messages;

drop policy if exists "firm_read_scores" on public.opportunity_scores;
create policy "firm_read_scores" on public.opportunity_scores
  for select to authenticated using (firm_id in (select public.current_firm_ids()));

do $$
declare t text;
begin
  foreach t in array array['watchlists', 'chat_sessions', 'user_opportunity_lists',
                           'user_assistant_settings', 'user_automations'] loop
    execute format('drop policy if exists "firm_user_own_rows" on public.%I', t);
    execute format($p$
      create policy "firm_user_own_rows" on public.%I for all to authenticated
        using (firm_id in (select public.current_firm_ids())
               and user_email = lower(auth.jwt() ->> 'email'))
        with check (firm_id in (select public.current_firm_ids())
               and user_email = lower(auth.jwt() ->> 'email'))
    $p$, t);
  end loop;

  foreach t in array array['analysis_runs', 'generated_documents', 'compliance_runs'] loop
    execute format('drop policy if exists "firm_read_rows" on public.%I', t);
    execute format($p$
      create policy "firm_read_rows" on public.%I for select to authenticated
        using (firm_id in (select public.current_firm_ids()))
    $p$, t);
  end loop;
end $$;

drop policy if exists "firm_user_own_chat_messages" on public.chat_messages;
create policy "firm_user_own_chat_messages" on public.chat_messages
  for select to authenticated using (
    exists (
      select 1 from public.chat_sessions cs
      where cs.id = chat_messages.session_id
        and cs.firm_id in (select public.current_firm_ids())
        and cs.user_email = lower(auth.jwt() ->> 'email')
    )
  );

commit;
