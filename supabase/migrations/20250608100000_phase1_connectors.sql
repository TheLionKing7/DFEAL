-- Phase 1 connectors: extend opportunity_source enum
-- NOTE: Postgres requires enum additions to commit before new values can be used.
-- Cursor seeds live in 20250608100100_phase1_connectors_cursors.sql

alter type public.opportunity_source add value if not exists 'sba';
alter type public.opportunity_source add value if not exists 'stateuniv_il';
alter type public.opportunity_source add value if not exists 'education_il';
