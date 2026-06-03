alter table public.gmail_connections
add column if not exists sort_order integer;

with ranked_connections as (
  select
    id,
    row_number() over (order by connected_at asc, email_address asc) - 1 as new_sort_order
  from public.gmail_connections
  where sort_order is null
)
update public.gmail_connections
set sort_order = ranked_connections.new_sort_order
from ranked_connections
where public.gmail_connections.id = ranked_connections.id;
