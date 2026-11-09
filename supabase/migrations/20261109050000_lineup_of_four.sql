-- A lineup is four Historikals now (was three): the display keeps up to four of them, and a battle wants four
-- with hearts left. Battles already under way keep the teams they started with.
create or replace function public.cr_clean_shown_badges(p_user uuid, p_list jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare e text; out jsonb := '[]'::jsonb; n int := 0; nh int := 0; seen text[] := '{}'; ok boolean;
begin
  if p_list is null or jsonb_typeof(p_list) <> 'array' then return '[]'::jsonb; end if;
  for e in select jsonb_array_elements_text(p_list) loop
    exit when n >= 5;
    continue when e = any(seen);
    ok := false;
    if e ~ '^a:[a-z0-9-]{1,40}$' then
      ok := exists (select 1 from public.user_badges where user_id = p_user and badge_slug = substr(e, 3));
    elsif e ~ '^i:[0-9]{1,18}$' and nh < 4 then
      ok := exists (select 1 from public.badge_items i join public.badge_kinds k on k.slug = i.kind_slug
                     where i.id = substr(e, 3)::bigint and i.owner_id = p_user and i.kind = 'tradable' and k.element is not null);
      if ok then nh := nh + 1; end if;
    end if;
    if ok then
      out := out || to_jsonb(e); seen := seen || e; n := n + 1;
    end if;
  end loop;
  return out;
end;
$$;

create or replace function public.cr_lineup_ok(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(array_length(public.cr_lineup(p_user), 1), 0) = 4
     and not exists (select 1 from unnest(public.cr_lineup(p_user)) x where (public.cr_hk(x)->>'hp')::int <= 0);
$$;

-- The battle's team check: four, not three. Only those two numbers in cr_enc_act change.
do $do$
declare d text; a text := $x$if coalesce(array_length(ids, 1), 0) <> 3 or (select count(*)$x$; b text := $x$and k.element is not null and coalesce(i.hp, k.hearts) > 0) <> 3 then$x$;
begin
  d := pg_get_functiondef('public.cr_enc_act(bigint, jsonb)'::regprocedure);
  if position(a in d) = 0 or position(b in d) = 0 then raise exception 'cr_enc_act: team check not found'; end if;
  d := replace(replace(d, a, replace(a, '<> 3', '<> 4')), b, replace(b, '<> 3', '<> 4'));
  execute d;
end
$do$;
