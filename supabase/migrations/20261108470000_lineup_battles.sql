-- Battles use your lineup: the Historikals on show in your badge display (at most three of them).
-- The pick-your-team screen goes. A battle starts from the Historikals menu, plain or epic; an epic one
-- carries your stake (your Proof, or a Historikal) from the start, and whoever accepts answers it with
-- theirs, or just fights.

-- The badge display: five badges, at most three of them Historikals.
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
    elsif e ~ '^i:[0-9]{1,18}$' and nh < 3 then
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

-- Someone's lineup: their shown Historikals, in order.
create or replace function public.cr_lineup(p_user uuid) returns bigint[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(substr(e, 3)::bigint order by n), '{}')
    from public.profiles p, jsonb_array_elements_text(coalesce(p.shown_badges, '[]'::jsonb)) with ordinality t(e, n)
   where p.id = p_user and e ~ '^i:[0-9]{1,18}$'
     and exists (select 1 from public.badge_items i join public.badge_kinds k on k.slug = i.kind_slug
                  where i.id = substr(e, 3)::bigint and i.owner_id = p_user and i.kind = 'tradable' and k.element is not null);
$$;
-- Ready to fight: three in the lineup, all with hearts left.
create or replace function public.cr_lineup_ok(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(array_length(public.cr_lineup(p_user), 1), 0) = 3
     and not exists (select 1 from unnest(public.cr_lineup(p_user)) x where (public.cr_hk(x)->>'hp')::int <= 0);
$$;
revoke all on function public.cr_lineup(uuid), public.cr_lineup_ok(uuid) from public, anon, authenticated;

-- Starting one, with a stake for an epic battle.
create or replace function public.cr_enc_start(p_kind text, p_other uuid, p_stake jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); v_id bigint; v_st jsonb;
begin
  if me is null or p_other is null or p_other = me or p_kind not in ('trade', 'battle') then
    return jsonb_build_object('ok', false, 'code', 'bad');
  end if;
  if not exists (select 1 from public.profiles where id = p_other) then return jsonb_build_object('ok', false, 'code', 'missing'); end if;
  if p_kind = 'battle' and not public.cr_lineup_ok(me) then return jsonb_build_object('ok', false, 'code', 'no_lineup'); end if;
  if p_kind = 'battle' and p_stake is not null and public.cr_stake_check(me, p_stake) is null then
    return jsonb_build_object('ok', false, 'code', case when p_stake ? 'token' then 'proof_resting' else 'bad_stake' end);
  end if;
  update public.encounters set stage = 'off', st = st || '{"off_by":"x"}'::jsonb, seq = seq + 1, updated_at = now()
   where (a in (me, p_other) or b in (me, p_other)) and stage not in ('done', 'off', 'end');
  v_st := case when p_kind = 'trade' then '{"pick":{"a":null,"b":null}}'::jsonb
         else '{"team":{"a":[],"b":[]},"ready":{"a":false,"b":false},"pick":{"a":null,"b":null},"lock":{"a":false,"b":false},
                "shown":{"a":null,"b":null},"swapped":{"a":false,"b":false},"hp":{"a":{},"b":{}},"seen":{"a":{},"b":{}},
                "known":{"a":{},"b":{}},"move":{"a":null,"b":null},"need":{"a":false,"b":false},"turn":1,"quiet":0,
                "stake":{"a":null,"b":null}}'::jsonb end;
  if p_kind = 'battle' and p_stake is not null then
    v_st := jsonb_set(v_st, '{stake,a}', public.cr_stake_check(me, p_stake)) || '{"want_epic":true}'::jsonb;
  end if;
  insert into public.encounters (kind, a, b, stage, st) values (p_kind, me, p_other, 'invite', v_st) returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;
create or replace function public.cr_enc_start(p_kind text, p_other uuid) returns jsonb
language sql security definer set search_path = public as $$ select public.cr_enc_start(p_kind, p_other, null::jsonb); $$;
revoke all on function public.cr_enc_start(text, uuid, jsonb) from public, anon;
grant execute on function public.cr_enc_start(text, uuid, jsonb), public.cr_enc_start(text, uuid) to authenticated;

do $do$
declare d text; n int;
begin
  -- Accepting a battle brings both lineups in; an epic one takes the answer to its stake.
  select pg_get_functiondef('public.cr_enc_act(bigint, jsonb)'::regprocedure) into d;
  n := length(d);
  d := replace(d, $r$    if act = 'yes' then vs := case when e.kind = 'trade' then 'pick' else 'team' end;$r$,
$r$    if act = 'yes' and e.kind = 'trade' then vs := 'pick';
    elsif act = 'yes' then
      if not public.cr_lineup_ok(e.b) then return jsonb_build_object('ok', false, 'code', 'no_lineup'); end if;
      if not public.cr_lineup_ok(e.a) then return jsonb_build_object('ok', false, 'code', 'their_lineup'); end if;
      s := jsonb_set(jsonb_set(s, '{team,a}', to_jsonb(public.cr_lineup(e.a))), '{team,b}', to_jsonb(public.cr_lineup(e.b)));
      s := jsonb_set(s, '{ready}', '{"a":true,"b":true}'::jsonb);
      if coalesce((s->>'want_epic')::boolean, false) then
        s := jsonb_set(s, '{stake,b}', coalesce(public.cr_stake_check(auth.uid(), p_act->'stake'), 'null'::jsonb));
        s := public.cr_stake_settle(s); vs := s->>'next'; s := s - 'next';
      else
        vs := 'pick';
      end if;
      s := s - 'want_epic';$r$);
  if length(d) = n then raise exception 'cr_enc_act: invite patch did not apply'; end if;
  execute d;

  -- Seeing it: at an epic invite, what they put up and what you could put up.
  select pg_get_functiondef('public.cr_enc_view(bigint)'::regprocedure) into d;
  n := length(d);
  d := replace(d, $r$(e.kind = 'battle' and e.stage in ('team', 'stake'))$r$, $r$(e.kind = 'battle' and e.stage in ('team', 'stake', 'invite'))$r$);
  if length(d) = n then raise exception 'cr_enc_view: mine patch did not apply'; end if;
  n := length(d);
  d := replace(d, $r$    'epic', s->>'epic', 'ask', e.stage = 'stake' and s->>'ask' = me,$r$,
                  $r$    'epic', s->>'epic', 'ask', e.stage = 'stake' and s->>'ask' = me, 'want_epic', coalesce((s->>'want_epic')::boolean, false),
    'lineup_ok', public.cr_lineup_ok(auth.uid()),$r$);
  if length(d) = n then raise exception 'cr_enc_view: epic patch did not apply'; end if;
  execute d;
end
$do$;
