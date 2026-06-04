alter table public.app_preferences
add column if not exists id text default 'default',
add column if not exists light_background text default '#f6f8fc',
add column if not exists light_surface text default '#ffffff',
add column if not exists light_sidebar text default '#f6f8fc',
add column if not exists light_accent text default '#0b57d0',
add column if not exists light_button text default '#c2e7ff',
add column if not exists dark_background text default '#1f1f1f',
add column if not exists dark_surface text default '#202124',
add column if not exists dark_sidebar text default '#1f1f1f',
add column if not exists dark_accent text default '#8ab4f8',
add column if not exists dark_button text default '#2d5f7a';

update public.app_preferences
set
  light_background = coalesce(light_background, '#f6f8fc'),
  light_surface = coalesce(light_surface, '#ffffff'),
  light_sidebar = coalesce(light_sidebar, '#f6f8fc'),
  light_accent = coalesce(light_accent, '#0b57d0'),
  light_button = coalesce(light_button, '#c2e7ff'),
  dark_background = coalesce(dark_background, '#1f1f1f'),
  dark_surface = coalesce(dark_surface, '#202124'),
  dark_sidebar = coalesce(dark_sidebar, '#1f1f1f'),
  dark_accent = coalesce(dark_accent, '#8ab4f8'),
  dark_button = coalesce(dark_button, '#2d5f7a')
where id = 'default';

update public.app_preferences
set id = 'default'
where id is null;
