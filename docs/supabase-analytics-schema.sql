create table if not exists public.analytics_events (
  id text primary key,
  created_at timestamptz not null default now(),
  page text not null,
  path text,
  region text,
  city text,
  country text,
  user_key text
);

create index if not exists analytics_events_created_at_idx
  on public.analytics_events (created_at desc);

create index if not exists analytics_events_page_idx
  on public.analytics_events (page);

alter table public.analytics_events enable row level security;

create policy "service role manages analytics events"
  on public.analytics_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
