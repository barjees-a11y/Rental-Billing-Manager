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
