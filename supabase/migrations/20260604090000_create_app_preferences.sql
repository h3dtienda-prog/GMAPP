create table if not exists public.app_preferences (
  id text primary key default 'default',
  app_name text,
  app_title text default 'Centro de correo',
  app_logo_url text,
  favicon_url text,
  theme text default 'light',
  updated_at timestamptz not null default now(),
  constraint app_preferences_singleton check (id = 'default'),
  constraint app_preferences_theme_check check (theme in ('light', 'dark'))
);

insert into public.app_preferences (id, app_name, app_title, app_logo_url, favicon_url, theme)
values ('default', 'MAILS', 'Centro de correo', null, null, 'light')
on conflict (id) do nothing;
