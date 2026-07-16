create table if not exists public.reservations (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  status text not null default 'new',
  locale text default 'ko',
  studio_id text,
  studio_name text,
  name text not null,
  phone text not null,
  email text,
  preferred_date text,
  message text,
  find_line boolean not null default false,
  uploads jsonb not null default '[]'::jsonb,
  notifications jsonb not null default '{}'::jsonb,
  admin_reply text,
  reply_history jsonb not null default '[]'::jsonb,
  admin_memo text
);

create index if not exists reservations_created_at_idx
  on public.reservations (created_at desc);

create index if not exists reservations_status_idx
  on public.reservations (status);

alter table public.reservations enable row level security;

create policy "service role manages reservations"
  on public.reservations
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create table if not exists public.admin_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.admin_settings enable row level security;

create policy "service role manages admin settings"
  on public.admin_settings
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
