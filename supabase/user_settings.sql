-- USER SETTINGS TABLE
create table public.user_settings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) not null unique,
  company_name text default 'Rental Billing Co.',
  email_notifications boolean default true,
  billing_periods jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security (RLS)
alter table public.user_settings enable row level security;

-- POLICIES (Users can only access their own settings)

-- SELECT
create policy "Users can view their own settings" on public.user_settings
  for select using (auth.uid() = user_id);

-- INSERT
create policy "Users can insert their own settings" on public.user_settings
  for insert with check (auth.uid() = user_id);

-- UPDATE
create policy "Users can update their own settings" on public.user_settings
  for update using (auth.uid() = user_id);

-- DELETE
create policy "Users can delete their own settings" on public.user_settings
  for delete using (auth.uid() = user_id);

-- INDEXES
create index user_settings_user_id_idx on public.user_settings(user_id);
