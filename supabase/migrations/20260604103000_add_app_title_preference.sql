alter table public.app_preferences
add column if not exists app_title text default 'Centro de correo';

update public.app_preferences
set app_title = coalesce(app_title, 'Centro de correo')
where id = 'default';
