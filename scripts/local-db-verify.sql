-- Local verification of supabase/add_device_categories.sql (run after applying the migrations)
create table if not exists _verify (check_name text, result text, detail text);
truncate _verify;

-- Seed a user + contract so check 6 works on a fresh database
insert into auth.users (id, email)
values ('22222222-2222-2222-2222-222222222222', 'verify-local@test.local')
on conflict (id) do nothing;

insert into public.contracts (user_id, contract_number, customer, billing_period, invoice_day, start_date, category)
select '22222222-2222-2222-2222-222222222222', 'LEGACY-1', 'Verify Seed', 'MB', 5, '2025-01-01', 'copier'
where not exists (select 1 from public.contracts where contract_number = 'LEGACY-1');

-- Remove leftovers from previous verify runs so the script is idempotent (cascades to models)
delete from public.device_brands
where (category = 'other' and lower(btrim(name)) in ('shredder', 'uniquemodeltest', 'cascadetest'))
   or (category = 'copier' and lower(btrim(name)) = 'shredder');

-- 1. device_brands unique index is case- and whitespace-insensitive
do $$
begin
  insert into public.device_brands (category, name) values ('other', 'Shredder') on conflict do nothing;
  begin
    insert into public.device_brands (category, name) values ('other', '  SHREDDER ');
    insert into _verify values ('device_brands unique (case/whitespace)', 'FAIL', 'duplicate accepted');
  exception when unique_violation then
    insert into _verify values ('device_brands unique (case/whitespace)', 'PASS', 'duplicate rejected');
  end;
end $$;

-- 2. the same name is still allowed in the other category
do $$
begin
  insert into public.device_brands (category, name) values ('copier', 'Shredder');
  insert into _verify values ('same name allowed in other category', 'PASS', 'inserted');
exception when others then
  insert into _verify values ('same name allowed in other category', 'FAIL', sqlerrm);
end $$;

-- 3. device_models unique index is case- and whitespace-insensitive
do $$
declare bid uuid;
begin
  insert into public.device_brands (category, name) values ('other', 'UniqueModelTest') returning id into bid;
  insert into public.device_models (brand_id, name) values (bid, 'MX-3050');
  begin
    insert into public.device_models (brand_id, name) values (bid, ' mx-3050 ');
    insert into _verify values ('device_models unique (case/whitespace)', 'FAIL', 'duplicate accepted');
  exception when unique_violation then
    insert into _verify values ('device_models unique (case/whitespace)', 'PASS', 'duplicate rejected');
  end;
end $$;

-- 4. deleting a brand cascades to its models
do $$
declare bid uuid; n int;
begin
  insert into public.device_brands (category, name) values ('other', 'CascadeTest') returning id into bid;
  insert into public.device_models (brand_id, name) values (bid, 'M1');
  delete from public.device_brands where id = bid;
  select count(*) into n from public.device_models where brand_id = bid;
  if n = 0 then
    insert into _verify values ('device_models ON DELETE CASCADE', 'PASS', 'models removed');
  else
    insert into _verify values ('device_models ON DELETE CASCADE', 'FAIL', n || ' models left');
  end if;
end $$;

-- 5. contracts.category only accepts copier / other
do $$
begin
  insert into public.contracts (user_id, contract_number, customer, billing_period, invoice_day, start_date, category)
  values ('11111111-1111-1111-1111-111111111111', 'BAD-CAT', 'x', 'MB', 5, '2025-01-01', 'bogus');
  insert into _verify values ('contracts.category check constraint', 'FAIL', 'bogus accepted');
exception when check_violation then
  insert into _verify values ('contracts.category check constraint', 'PASS', 'rejected');
end $$;

-- 6. brand / model / serial_number can be written and read back
do $$
declare n int;
begin
  update public.contracts
     set brand = 'Canon', model = 'iR2630', serial_number = 'SN-1', category = 'other'
   where contract_number = 'LEGACY-1';
  select count(*) into n from public.contracts
   where brand = 'Canon' and model = 'iR2630' and serial_number = 'SN-1' and category = 'other';
  if n = 1 then
    insert into _verify values ('contracts brand/model/serial/category columns', 'PASS', 'written and read');
  else
    insert into _verify values ('contracts brand/model/serial/category columns', 'FAIL', 'not persisted');
  end if;
end $$;

-- 7. catalog policies exist
insert into _verify
select 'RLS policies on device_brands/device_models',
       case when count(*) = 4 then 'PASS' else 'FAIL' end,
       count(*)::text || ' policies'
from pg_policies where tablename in ('device_brands', 'device_models');

-- 8. index on contracts(user_id, category) exists
insert into _verify
select 'contracts(user_id, category) index',
       case when count(*) = 1 then 'PASS' else 'FAIL' end,
       'found ' || count(*)::text
from pg_indexes where indexname = 'contracts_user_category_idx';

select check_name, result, detail from _verify order by check_name;
drop table _verify;
