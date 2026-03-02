-- USER ROLES TABLE
-- Run in Supabase SQL Editor

create table if not exists public.user_roles (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  email text,
  display_name text,
  role text not null default 'view_edit' check (role in ('view_only', 'view_edit')),
  is_super_admin boolean default false,
  created_at timestamptz default now()
);

-- Add columns if table already exists (for existing installations)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_roles' AND column_name = 'email') THEN
    ALTER TABLE public.user_roles ADD COLUMN email text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_roles' AND column_name = 'display_name') THEN
    ALTER TABLE public.user_roles ADD COLUMN display_name text;
  END IF;
END $$;

-- Enable Row Level Security
alter table public.user_roles enable row level security;

-- POLICIES

-- All authenticated users can read their own role
create policy "Users can view their own role" on public.user_roles
  for select using (auth.uid() = user_id);

-- Super admins can read all roles
create policy "Super admins can view all roles" on public.user_roles
  for select using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and is_super_admin = true
    )
  );

-- Super admins can insert roles (when creating new users)
create policy "Super admins can insert roles" on public.user_roles
  for insert with check (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and is_super_admin = true
    )
  );

-- Super admins can update roles
create policy "Super admins can update roles" on public.user_roles
  for update using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and is_super_admin = true
    )
  );

-- Super admins can delete roles
create policy "Super admins can delete roles" on public.user_roles
  for delete using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and is_super_admin = true
    )
  );

-- INDEX
create index if not exists user_roles_user_id_idx on public.user_roles(user_id);

-- SEED: Bootstrap the super admin
-- Matches both 'barjees@saharaedoc' and 'barjees@saharaedoc.com'
insert into public.user_roles (user_id, role, is_super_admin)
select id, 'view_edit', true
from auth.users
where email like 'barjees@saharaedoc%'
on conflict (user_id) do update set is_super_admin = true;
