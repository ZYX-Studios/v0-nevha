-- RPC for public status lookup by ref_code (safe subset only)

begin;

create or replace function public.get_issue_status(ref text)
returns table (
  ref_code text,
  title text,
  status text,
  priority text,
  category text,
  location_text text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select i.ref_code,
         i.title,
         i.status,
         i.priority,
         i.category,
         i.location_text,
         i.created_at,
         i.updated_at
  from issues i
  where i.ref_code = ref
  limit 1
$$;

-- Tighten permissions and allow web access
revoke all on function public.get_issue_status(text) from public;
grant execute on function public.get_issue_status(text) to anon, authenticated;

commit;
