-- ============================================================
-- UPIGuard — Supabase schema (SIMULATED demo data)
-- Run this in the Supabase SQL Editor, then restart the backend.
-- This app NEVER moves real money; all data is simulated.
-- ============================================================

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  upi_id text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.recipients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  upi_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, upi_id)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  recipient_id uuid references public.recipients(id) on delete set null,
  recipient_name text not null,
  recipient_upi text not null,
  amount numeric(14,2) not null check (amount > 0),
  context text not null,
  note text,
  risk_level text not null,
  -- Explainable risk signals as JSONB: [{label, description, detail, severity, icon}]
  risk_signals jsonb not null default '[]'::jsonb,
  status text not null check (status in ('completed', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists idx_transactions_user on public.transactions(user_id, created_at desc);
create index if not exists idx_recipients_user on public.recipients(user_id);

-- ------------------------------------------------------------
-- Seed data (demo user + simulated payment history).
-- Idempotent: safe to run multiple times.
-- NOTE: service_role bypasses RLS, so no per-user policies are needed
-- while the app talks to Supabase exclusively from the backend.
-- ------------------------------------------------------------
insert into public.users (id, name, upi_id) values
  ('00000000-0000-0000-0000-000000000001', 'Demo User', 'demo@upiguard')
on conflict (id) do nothing;

insert into public.recipients (user_id, name, upi_id) values
  ('00000000-0000-0000-0000-000000000001', 'Priya Sharma', 'priya@okbank'),
  ('00000000-0000-0000-0000-000000000001', 'Amit Patel', 'amit@upi'),
  ('00000000-0000-0000-0000-000000000001', 'Zomato', 'payments@zomato'),
  ('00000000-0000-0000-0000-000000000001', 'Swiggy', 'swiggy@pay'),
  ('00000000-0000-0000-0000-000000000001', 'Landlord - Rajesh', 'rajesh.rent@okbank'),
  ('00000000-0000-0000-0000-000000000001', 'College Fee Portal', 'fees@college.edu'),
  ('00000000-0000-0000-0000-000000000001', 'Neeraj Kumar', 'neeraj@gpay'),
  ('00000000-0000-0000-0000-000000000001', 'Electricity Board', 'eb@billpay')
on conflict (user_id, upi_id) do nothing;

insert into public.transactions
  (user_id, recipient_name, recipient_upi, amount, context, risk_level, risk_signals, status, created_at)
values
  ('00000000-0000-0000-0000-000000000001', 'Priya Sharma', 'priya@okbank', 800,   'Friend',       'LOW_RISK', '[]', 'completed', now() - interval '47 days'),
  ('00000000-0000-0000-0000-000000000001', 'Priya Sharma', 'priya@okbank', 1200,  'Friend',       'LOW_RISK', '[]', 'completed', now() - interval '43 days'),
  ('00000000-0000-0000-0000-000000000001', 'Amit Patel',   'amit@upi',     500,   'Friend',       'LOW_RISK', '[]', 'completed', now() - interval '41 days'),
  ('00000000-0000-0000-0000-000000000001', 'Zomato',       'payments@zomato', 450, 'Food',        'LOW_RISK', '[]', 'completed', now() - interval '38 days'),
  ('00000000-0000-0000-0000-000000000001', 'Swiggy',       'swiggy@pay',   650,   'Food',         'LOW_RISK', '[]', 'completed', now() - interval '36 days'),
  ('00000000-0000-0000-0000-000000000001', 'Landlord - Rajesh', 'rajesh.rent@okbank', 15000, 'Rent', 'LOW_RISK', '[]', 'completed', now() - interval '33 days'),
  ('00000000-0000-0000-0000-000000000001', 'College Fee Portal', 'fees@college.edu', 25000, 'College fee', 'LOW_RISK', '[]', 'completed', now() - interval '30 days'),
  ('00000000-0000-0000-0000-000000000001', 'Priya Sharma', 'priya@okbank', 1500,  'Friend',       'LOW_RISK', '[]', 'completed', now() - interval '28 days'),
  ('00000000-0000-0000-0000-000000000001', 'Amit Patel',   'amit@upi',     750,   'Friend',       'LOW_RISK', '[]', 'completed', now() - interval '26 days'),
  ('00000000-0000-0000-0000-000000000001', 'Neeraj Kumar', 'neeraj@gpay',  200,   'Shopping',     'LOW_RISK', '[]', 'completed', now() - interval '23 days'),
  ('00000000-0000-0000-0000-000000000001', 'Zomato',       'payments@zomato', 380, 'Food',        'LOW_RISK', '[]', 'completed', now() - interval '21 days'),
  ('00000000-0000-0000-0000-000000000001', 'Electricity Board', 'eb@billpay', 1800, 'Bills',     'LOW_RISK', '[]', 'completed', now() - interval '19 days'),
  ('00000000-0000-0000-0000-000000000001', 'Priya Sharma', 'priya@okbank', 1000,  'Friend',       'LOW_RISK', '[]', 'completed', now() - interval '16 days'),
  ('00000000-0000-0000-0000-000000000001', 'Landlord - Rajesh', 'rajesh.rent@okbank', 15000, 'Rent', 'LOW_RISK', '[]', 'completed', now() - interval '12 days'),
  ('00000000-0000-0000-0000-000000000001', 'Swiggy',       'swiggy@pay',   550,   'Food',         'LOW_RISK', '[]', 'completed', now() - interval '9 days'),
  ('00000000-0000-0000-0000-000000000001', 'Amit Patel',   'amit@upi',     900,   'Friend',       'LOW_RISK', '[]', 'completed', now() - interval '7 days'),
  ('00000000-0000-0000-0000-000000000001', 'Neeraj Kumar', 'neeraj@gpay',  350,   'Shopping',     'LOW_RISK', '[]', 'completed', now() - interval '5 days'),
  ('00000000-0000-0000-0000-000000000001', 'Zomato',       'payments@zomato', 520, 'Food',        'LOW_RISK', '[]', 'completed', now() - interval '3 days')
on conflict do nothing;
