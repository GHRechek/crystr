-- Five shown badges again, with the token and a trade icon on the same row.
create or replace function public.cr_clean_shown_badges(p_user uuid, p_list jsonb)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare e text; out jsonb := '[]'::jsonb; n int := 0; seen text[] := '{}'; ok boolean;
begin
  if p_list is null or jsonb_typeof(p_list) <> 'array' then return '[]'::jsonb; end if;
  for e in select jsonb_array_elements_text(p_list) loop
    exit when n >= 5;
    continue when e = any(seen);
    ok := false;
    if e ~ '^a:[a-z0-9-]{1,40}$' then
      ok := exists (select 1 from public.user_badges where user_id = p_user and badge_slug = substr(e, 3));
    elsif e ~ '^i:[0-9]{1,18}$' then
      ok := exists (select 1 from public.badge_items where id = substr(e, 3)::bigint and owner_id = p_user and kind = 'tradable');
    end if;
    if ok then
      out := out || to_jsonb(e); seen := seen || e; n := n + 1;
    end if;
  end loop;
  return out;
end;
$$;
revoke all on function public.cr_clean_shown_badges(uuid, jsonb) from public, anon, authenticated;

update public.badges set how = 'Show five badges on your profile.', blurb = 'Showed five badges.', threshold = 5 where slug = 'show-five';
