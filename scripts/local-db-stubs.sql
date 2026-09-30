-- Supabase-compatible stubs so the app migrations can run on plain Postgres
create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key,
  email text,
  created_at timestamptz default now()
);

create or replace function auth.uid() returns uuid
language sql stable as $$ select null::uuid $$;

create or replace function auth.role() returns text
language sql stable as $$ select 'authenticated'::text $$;

-- Supabase ships these roles; plain Postgres needs them for GRANT/POLICY statements
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated;
  end if;
end $$;
