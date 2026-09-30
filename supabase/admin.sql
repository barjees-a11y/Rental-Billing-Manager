-- ADMIN SQL SCRIPTS
-- Usage: Run these queries in the Supabase SQL Editor

-- 1. View All Users
-- Requires permissions to access auth schema
select id, email, created_at, last_sign_in_at from auth.users;

-- 2. View All Contracts (Bypassing RLS if run as Admin)
-- Use this to audit data across all users
select * from public.contracts order by created_at desc;

-- 3. Reset User Password (Example)
-- Replace 'new_password' and 'email@example.com'
-- update auth.users 
-- set encrypted_password = crypt('new_password', gen_salt('bf')) 
-- where email = 'email@example.com';

-- 4. Force Delete a Contract (Admin)
-- delete from public.contracts where contract_number = 'C-000';

-- 5. Check Database Size
select pg_size_pretty(pg_database_size(current_database()));

-- 6. List Active Connections
select * from pg_stat_activity where datname = current_database();

-- 7. Grant Admin Access (Example RLS Bypass Policy)
-- create policy "Admins can view all" on public.contracts
-- for select using (auth.email() = 'barjees@saharaedoc');

-- 8. Promote an existing user to Super Admin (Device Catalog management)
-- The device_brands / device_models catalog tables only allow writes for
-- users with user_roles.is_super_admin = true (checked via the security
-- definer function public.is_super_admin() created in add_device_categories.sql).
-- If the Settings > Device Category add/rename/delete buttons are hidden for
-- the owner account, promote that user here. Idempotent — safe to re-run.
-- Step 1: find the owner's user id:
--   select id, email from auth.users;
-- Step 2: promote (replace '<owner-user-id>' with the id from step 1):
--   insert into public.user_roles (user_id, is_super_admin)
--   values ('<owner-user-id>', true)
--   on conflict (user_id) do update set is_super_admin = true;
-- If the row already exists this is equivalent to:
--   update public.user_roles set is_super_admin = true where user_id = '<owner-user-id>';
-- Step 3: verify:
--   select user_id, is_super_admin from public.user_roles;
