-- Topline Intake: one row per company dossier. Run once in Supabase → SQL Editor.
create table if not exists public.dossiers (
  id         text primary key,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- Row Level Security on with no policies: the browser can never read or write this table
-- directly. Only the app's server (using the secret / service_role key) can, after the team
-- password check.
alter table public.dossiers enable row level security;
