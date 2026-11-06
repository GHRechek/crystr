-- "Working on" can also name someone's token: "t:<their user id>", any token that exists. A token
-- is earned by being given it, so naming one is a way of saying whose you would like.
create or replace function public.cr_clean_working_on(p_list jsonb)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare e text; out jsonb := '[]'::jsonb; n int := 0; seen text[] := '{}';
begin
  if p_list is null or jsonb_typeof(p_list) <> 'array' then return '[]'::jsonb; end if;
  for e in select jsonb_array_elements_text(p_list) loop
    exit when n >= 5;
    continue when e = any(seen);
    if (e ~ '^a:[a-z0-9-]{1,40}$' and exists (select 1 from public.badges where slug = substr(e, 3) and active))
       or (e ~ '^t:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
           and exists (select 1 from public.tokens where user_id = substr(e, 3)::uuid)) then
      out := out || to_jsonb(e); seen := seen || e; n := n + 1;
    end if;
  end loop;
  return out;
end;
$$;
revoke all on function public.cr_clean_working_on(jsonb) from public, anon, authenticated;
