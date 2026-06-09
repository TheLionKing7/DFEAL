-- Assistant workspace: track/favorite lists, settings, automations

create table if not exists public.user_opportunity_lists (
  id          uuid primary key default gen_random_uuid(),
  user_email  text not null,
  opportunity_id text not null references public.opportunities (id) on delete cascade,
  list_type   text not null check (list_type in ('track', 'favorite')),
  created_at  timestamptz not null default now(),
  unique (user_email, opportunity_id, list_type)
);

create index if not exists user_opportunity_lists_user_type_idx
  on public.user_opportunity_lists (user_email, list_type, created_at desc);

create table if not exists public.user_assistant_settings (
  user_email           text primary key,
  custom_instructions  text,
  personalization      jsonb not null default '{}'::jsonb,
  memories             jsonb not null default '[]'::jsonb,
  connector_prefs      jsonb not null default '{}'::jsonb,
  updated_at           timestamptz not null default now()
);

create table if not exists public.user_automations (
  id          uuid primary key default gen_random_uuid(),
  user_email  text not null,
  name        text not null,
  enabled     boolean not null default true,
  description text,
  config      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists user_automations_user_idx
  on public.user_automations (user_email, enabled, updated_at desc);

alter table public.user_opportunity_lists enable row level security;
alter table public.user_assistant_settings enable row level security;
alter table public.user_automations enable row level security;

create policy "service_role_user_opportunity_lists"
  on public.user_opportunity_lists for all using (true) with check (true);

create policy "service_role_user_assistant_settings"
  on public.user_assistant_settings for all using (true) with check (true);

create policy "service_role_user_automations"
  on public.user_automations for all using (true) with check (true);
