create extension if not exists pgcrypto;

create table if not exists public.gmail_connections (
  id uuid primary key default gen_random_uuid(),
  email_address text not null unique,
  provider text not null default 'gmail',
  messages_total integer not null default 0,
  threads_total integer not null default 0,
  history_id text,
  encrypted_payload jsonb not null,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gmail_connections enable row level security;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_gmail_connections_updated_at on public.gmail_connections;

create trigger set_gmail_connections_updated_at
before update on public.gmail_connections
for each row
execute function public.set_updated_at();
