-- Run once in your Supabase project's SQL Editor.
begin;

create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(btrim(full_name)) between 2 and 100),
  email text not null check (char_length(email) between 3 and 254 and position('@' in email) > 1),
  service text not null check (service in ('workflow', 'ai', 'integration', 'custom')),
  description text not null check (char_length(btrim(description)) between 20 and 2000),
  created_at timestamptz not null default now()
);

alter table public.service_requests enable row level security;
-- No public policies: browser roles have no access. The server key bypasses RLS.
revoke all on public.service_requests from public, anon, authenticated;
grant insert on public.service_requests to service_role;
grant select (id) on public.service_requests to service_role;

commit;
