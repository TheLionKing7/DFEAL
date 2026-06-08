-- Phase 1 connectors: ingest cursor seeds (run after enum migration commits)

insert into public.ingest_cursors (source) values
  ('sba'),
  ('stateuniv_il'),
  ('education_il')
on conflict (source) do nothing;
