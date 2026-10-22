-- The Top 6 keeps the order people pick their friends in.
--
-- NOT APPLIED YET. The database tool used so far holds back statements that
-- contain a DELETE (it times out), and this function has one. Run this file in the
-- Supabase SQL editor (Dashboard -> SQL Editor) to apply it.
--
-- Two bugs fixed:
--  1. The old version cleaned the list with array_agg(distinct id), which sorts by
--     id. So the saved ranking was by id, not by the order picked, even though the
--     screen says "order matters and is the order you pick them in". A change of
--     order only was also treated as "unchanged": no effect, no charge.
--  2. Its check that each person exists, `p.id = id`, compared the profile's id to
--     itself and so always passed. A made-up id slipped through and then failed on
--     the foreign key with an unhelpful error. It now checks u.id.

create or replace function public.cr_set_top_friends(p_ids uuid[])
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_current uuid[];
        v_clean   uuid[];
begin
  select array_agg(t.friend_id order by t."position") into v_current
    from public.top_friends t where t.user_id = auth.uid();

  -- The order the person picked them in is the ranking, so keep it: take each
  -- person once (their first pick), drop yourself and anyone who does not exist,
  -- and number what is left in pick order.
  select array_agg(x.id order by x.ord) into v_clean
    from (
      select distinct on (u.id) u.id, u.ord
        from unnest(p_ids) with ordinality as u(id, ord)
       where u.id is not null
         and u.id <> auth.uid()
         and exists (select 1 from public.profiles p where p.id = u.id)
       order by u.id, u.ord
    ) x;

  v_clean := coalesce(v_clean, '{}'::uuid[]);
  if array_length(v_clean, 1) > 6 then
    return jsonb_build_object('ok', false, 'code', 'too_many');
  end if;

  -- Same people in the same order: nothing to do, and nothing to charge.
  if coalesce(v_current, '{}'::uuid[]) = v_clean then
    return jsonb_build_object('ok', true, 'unchanged', true);
  end if;
  if public.cr_balance() < 4 then return public.cr_short(4); end if;

  perform public.cr_take(4, 'Top 6 rearranged', 'top6');
  delete from public.top_friends where user_id = auth.uid();
  insert into public.top_friends (user_id, "position", friend_id)
  select auth.uid(), ord::smallint, id
    from unnest(v_clean) with ordinality as u(id, ord);

  return jsonb_build_object('ok', true, 'mana', public.cr_balance());
end;
$$;
