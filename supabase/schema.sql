-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- CONTRACTS TABLE
create table public.contracts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) not null,
  contract_number text not null,
  customer text not null,
  machine_site text not null default '',
  billing_period text not null,
  invoice_day integer not null check (invoice_day in (5, 15, 25)),
  quarterly_months text, -- e.g., 'JAN-APR-JUL-OCT'
  rental_fee numeric default 0,
  start_date date not null,
  end_date date,
  pullout_date date,
  status text not null default 'active' check (status in ('active', 'pending', 'expired', 'pulled_out', 'suspended', 'archived')),
  si_no serial, -- Auto-incrementing SI No
  excess_count_bw integer default 0,
  excess_count_clr integer default 0,
  excess_rate_bw numeric default 0,
  excess_rate_clr numeric default 0,
  notes text,
  termination_date date,
  termination_reason text,
  last_invoice_date date,
  next_invoice_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security (RLS)
alter table public.contracts enable row level security;

-- POLICIES (Users can only access their own data)

-- SELECT
create policy "Users can view their own contracts" on public.contracts
  for select using (auth.uid() = user_id);

-- INSERT
create policy "Users can insert their own contracts" on public.contracts
  for insert with check (auth.uid() = user_id);

-- UPDATE
create policy "Users can update their own contracts" on public.contracts
  for update using (auth.uid() = user_id);

-- DELETE
create policy "Users can delete their own contracts" on public.contracts
  for delete using (auth.uid() = user_id);

-- INDEXES
create index contracts_user_id_idx on public.contracts(user_id);
create index contracts_status_idx on public.contracts(status);
create index contracts_invoice_day_idx on public.contracts(invoice_day);
