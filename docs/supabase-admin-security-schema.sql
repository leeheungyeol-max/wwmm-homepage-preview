create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  role text not null default 'manager',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_email text,
  actor_role text,
  action text not null,
  page text,
  detail text,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists admin_users_email_idx
  on public.admin_users (email);

create index if not exists admin_audit_logs_created_at_idx
  on public.admin_audit_logs (created_at desc);

alter table public.admin_users enable row level security;
alter table public.admin_audit_logs enable row level security;

create policy "service role manages admin users"
  on public.admin_users
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service role manages admin audit logs"
  on public.admin_audit_logs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
