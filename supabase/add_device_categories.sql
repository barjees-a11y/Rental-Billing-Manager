-- DEVICE CATEGORIES MIGRATION
-- Adds contract "category" (copier | other) plus brand / model / serial number,
-- and a global (shared) device brand/model catalog managed by super admins.
-- Run in Supabase SQL Editor. Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. CONTRACTS: category + brand / model / serial number
-- ---------------------------------------------------------------------------
alter table public.contracts
  add column if not exists category text not null default 'copier';

-- Existing rows are backfilled to 'copier' by the DEFAULT above.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'contracts_category_check'
  ) then
    alter table public.contracts
      add constraint contracts_category_check check (category in ('copier', 'other'));
  end if;
end $$;

alter table public.contracts add column if not exists brand text;
alter table public.contracts add column if not exists model text;
alter table public.contracts add column if not exists serial_number text;

create index if not exists contracts_user_category_idx
  on public.contracts(user_id, category);

-- ---------------------------------------------------------------------------
-- 2. GLOBAL DEVICE CATALOG (shared across all users)
--    device_brands.category = 'copier'  -> name is a copier BRAND (Canon, Ricoh...)
--    device_brands.category = 'other'   -> name is a DEVICE TYPE (Shredder, Paper Cut...)
-- ---------------------------------------------------------------------------
create table if not exists public.device_brands (
  id uuid default uuid_generate_v4() primary key,
  category text not null check (category in ('copier', 'other')),
  name text not null,
  created_at timestamptz default now()
);

-- Case/whitespace-insensitive uniqueness (recreated so an older form is upgraded)
drop index if exists public.device_brands_category_name_key;
create unique index device_brands_category_name_key
  on public.device_brands (category, lower(btrim(name)));

create table if not exists public.device_models (
  id uuid default uuid_generate_v4() primary key,
  brand_id uuid not null references public.device_brands(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

drop index if exists public.device_models_brand_name_key;
create unique index device_models_brand_name_key
  on public.device_models (brand_id, lower(btrim(name)));

create index if not exists device_brands_category_idx on public.device_brands(category);
create index if not exists device_models_brand_id_idx on public.device_models(brand_id);

-- ---------------------------------------------------------------------------
-- 3. SUPER-ADMIN HELPER (security definer -> avoids RLS recursion on user_roles)
-- ---------------------------------------------------------------------------
create or replace function public.is_super_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and is_super_admin = true
  );
$$;

grant execute on function public.is_super_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
--    Everyone (authenticated) can READ the catalog; only super admins WRITE.
-- ---------------------------------------------------------------------------
alter table public.device_brands enable row level security;
alter table public.device_models enable row level security;

drop policy if exists "Authenticated users can view device brands" on public.device_brands;
create policy "Authenticated users can view device brands" on public.device_brands
  for select using (auth.role() = 'authenticated');

drop policy if exists "Super admins can manage device brands" on public.device_brands;
create policy "Super admins can manage device brands" on public.device_brands
  for all using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "Authenticated users can view device models" on public.device_models;
create policy "Authenticated users can view device models" on public.device_models
  for select using (auth.role() = 'authenticated');

drop policy if exists "Super admins can manage device models" on public.device_models;
create policy "Super admins can manage device models" on public.device_models
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- 5. SEED the default "other device" types (user-extensible from Settings)
-- ---------------------------------------------------------------------------
insert into public.device_brands (category, name)
values
  ('other', 'Shredder'),
  ('other', 'Paper Cut'),
  ('other', 'PVC Card Printer'),
  ('other', 'Print Management Software'),
  ('other', 'AMC'),
  ('other', 'Misc')
on conflict do nothing;
