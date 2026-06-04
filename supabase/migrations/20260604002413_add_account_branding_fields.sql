alter table public.gmail_connections
add column if not exists display_name text,
add column if not exists logo_url text;
