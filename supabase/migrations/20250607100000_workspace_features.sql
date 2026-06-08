-- Pursuit pipeline + inline document content for Phase 1/2 workspace tools

alter table public.watchlists
  add column if not exists pursuit_stage text not null default 'tracking';

alter table public.watchlists
  add column if not exists updated_at timestamptz not null default now();

alter table public.generated_documents
  add column if not exists content_text text;

alter table public.generated_documents
  alter column storage_path drop not null;

comment on column public.watchlists.pursuit_stage is
  'tracking | qualifying | bid_decision | proposal | submitted | won | lost';
