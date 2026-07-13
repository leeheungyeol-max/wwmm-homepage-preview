alter table public.reservations
  add column if not exists admin_reply text,
  add column if not exists reply_history jsonb not null default '[]'::jsonb;
