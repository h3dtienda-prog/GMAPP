alter table public.app_preferences
add column if not exists login_title text default 'Acceso privado',
add column if not exists login_subtitle text default 'Ingresa para abrir tu centro de correo.',
add column if not exists login_logo_url text;
