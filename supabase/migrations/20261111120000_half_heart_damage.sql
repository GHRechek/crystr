-- Damage in two halves: the attacker's primary type and the move's element, each half a heart. A half whose
-- element beats the defender (beats one of their types and neither beats it) is a full heart; one their type beats
-- (and it beats neither) is nothing. Everyone tops out at two hearts; a mythic's double super effective is four.
-- Both halves resisted is a bad matchup: nothing lands and the attacker takes half a heart.
create or replace function public.cr_verdict(el text, t jsonb) returns int language sql immutable set search_path to 'public' as $$
  select case when exists (select 1 from jsonb_array_elements_text(coalesce(t, '[]'::jsonb)) x where public.cr_beats(el, x))
                   and not exists (select 1 from jsonb_array_elements_text(coalesce(t, '[]'::jsonb)) x where public.cr_beats(x, el)) then 2
              when exists (select 1 from jsonb_array_elements_text(coalesce(t, '[]'::jsonb)) x where public.cr_beats(x, el))
                   and not exists (select 1 from jsonb_array_elements_text(coalesce(t, '[]'::jsonb)) x where public.cr_beats(el, x)) then 0
              else 1 end;
$$;

drop function if exists public.cr_match_el(jsonb, jsonb);
-- f: the move's elements (a two-element move uses whichever fares better); t: the defender's types;
-- p_primary: the attacker's first type; p_rarity: the attacker's rarity. Returns halves: hit, recoil; label; weak (halves that beat).
create or replace function public.cr_match_el(f jsonb, t jsonb, p_primary text default null, p_rarity text default null) returns jsonb language sql immutable set search_path to 'public' as $$
  with v as (
    select coalesce((select max(public.cr_verdict(a, t)) from jsonb_array_elements_text(coalesce(f, '[]'::jsonb)) a), 1) as m,
           case when p_primary is null then 1 else public.cr_verdict(p_primary, t) end as p)
  select jsonb_build_object(
    'hit', case when m = 2 and p = 2 then (case when p_rarity = 'legendary' then 8 else 4 end) else m + p end,
    'recoil', case when m = 0 and p = 0 then 1 else 0 end,
    'label', case when m = 2 and p = 2 then 'DOUBLE SUPER EFFECTIVE!'
                  when m + p = 3 then 'SUPER EFFECTIVE!'
                  when m + p = 2 and m <> p then 'CANCELS OUT'
                  when m = 0 and p = 0 then 'BAD MATCHUP!'
                  when m + p = 1 then 'NOT VERY EFFECTIVE' else '' end,
    'weak', (case when m = 2 then 1 else 0 end) + (case when p = 2 then 1 else 0 end))
    from v;
$$;

-- The engine, passing the attacker's primary type and rarity along; a charge that comes out lands first.
create or replace function public.cr_enc_act(p_id bigint, p_act jsonb)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare e public.encounters; me text; th text; s jsonb; act text := p_act->>'do'; vs text; it bigint; ids bigint[];
        ga bigint; gb bigint; ok boolean;
        sides text[] := array['a', 'b']; sd text; ot text; x text;
        mv jsonb; cur bigint; h jsonb; nm int; f jsonb; g jsonb; fa jsonb; fb jsonb; ma jsonb; mb jsonb; ka text; kb text;
        hit_a int := 0; hit_b int := 0; ra jsonb; rb jsonb; line text; extra text := ''; swa boolean; swb boolean; from_a text; from_b text;
        alive_a boolean; alive_b boolean; down_a boolean; down_b boolean; w text;
        ca boolean; cb boolean; ua boolean; ub boolean; ta jsonb; tb jsonb; ea jsonb; eb jsonb; sc int;
begin
  perform public.cr_enc_tick(p_id);
  select * into e from public.encounters where id = p_id for update;
  if not found or auth.uid() is null or auth.uid() not in (e.a, e.b) then return jsonb_build_object('ok', false, 'code', 'missing'); end if;
  me := case when auth.uid() = e.a then 'a' else 'b' end; th := case when me = 'a' then 'b' else 'a' end;
  s := e.st; vs := e.stage;

  if act = 'leave' then
    if vs not in ('done', 'off', 'end') then vs := 'off'; s := s || jsonb_build_object('off_by', me); end if;
  elsif vs = 'invite' then
    if me <> 'b' then return jsonb_build_object('ok', false, 'code', 'not_yours'); end if;
    if act = 'yes' and e.kind = 'trade' then vs := 'pick';
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
      s := s - 'want_epic';
    elsif act = 'no' then vs := 'off'; s := s || jsonb_build_object('off_by', me);
    else return jsonb_build_object('ok', false, 'code', 'bad'); end if;

  elsif e.kind = 'trade' and vs = 'pick' then
    if act = 'pick' then
      it := (p_act->>'item')::bigint;
      if not exists (select 1 from public.badge_items where id = it and owner_id = auth.uid() and kind = 'tradable') then
        return jsonb_build_object('ok', false, 'code', 'not_yours'); end if;
      s := jsonb_set(s, array['pick', me], to_jsonb(it));
    elsif act = 'unpick' then s := jsonb_set(s, array['pick', me], 'null'::jsonb);
    elsif act = 'swap' then
      ga := (s->'pick'->>'a')::bigint; gb := (s->'pick'->>'b')::bigint;
      if ga is null or gb is null then return jsonb_build_object('ok', false, 'code', 'not_ready'); end if;
      if not exists (select 1 from public.badge_items where id = ga and owner_id = e.a)
         or not exists (select 1 from public.badge_items where id = gb and owner_id = e.b) then
        return jsonb_build_object('ok', false, 'code', 'stale'); end if;
      perform set_config('crystr.economy', 'on', true);
      update public.badge_items set owner_id = e.b, acquired_at = now(), seen = true where id = ga;
      update public.badge_items set owner_id = e.a, acquired_at = now(), seen = true where id = gb;
      insert into public.badge_trades (from_user, to_user, give_item, want_item, status, answered_at)
      values (e.a, e.b, ga, gb, 'accepted', now());
      update public.badge_trades set status = 'cancelled', answered_at = now()
       where status = 'pending' and (give_item in (ga, gb) or want_item in (ga, gb));
      s := s || jsonb_build_object('got', jsonb_build_object('a', gb, 'b', ga));
      vs := 'done';
    else return jsonb_build_object('ok', false, 'code', 'bad'); end if;

  elsif e.kind = 'battle' and vs = 'team' then
    if act <> 'team' then return jsonb_build_object('ok', false, 'code', 'bad'); end if;
    select array_agg(distinct v::bigint) into ids from jsonb_array_elements_text(p_act->'ids') v;
    if coalesce(array_length(ids, 1), 0) <> 4 or (select count(*) from public.badge_items i join public.badge_kinds k on k.slug = i.kind_slug
        where i.id = any(ids) and i.owner_id = auth.uid() and i.kind = 'tradable' and k.element is not null and coalesce(i.hp, k.hearts) > 0) <> 4 then
      return jsonb_build_object('ok', false, 'code', 'bad_team'); end if;
    s := s || jsonb_build_object('stake', coalesce(s->'stake', '{"a":null,"b":null}'::jsonb));
    s := jsonb_set(jsonb_set(s, array['team', me], to_jsonb(ids)), array['ready', me], 'true'::jsonb);
    s := jsonb_set(s, array['stake', me], coalesce(public.cr_stake_check(auth.uid(), p_act->'stake'), 'null'::jsonb));
    if (s->'ready'->>th)::boolean then s := public.cr_stake_settle(s); vs := s->>'next'; s := s - 'next'; end if;
  elsif e.kind = 'battle' and vs = 'stake' then
    if act <> 'answer' or s->>'ask' <> me then return jsonb_build_object('ok', false, 'code', 'bad'); end if;
    if public.cr_stake_check(auth.uid(), p_act->'stake') ? 'item' then
      s := jsonb_set(s, array['stake', me], public.cr_stake_check(auth.uid(), p_act->'stake')) || '{"epic":"historikal"}'::jsonb;
    else
      s := (s - 'epic') || '{"stake":{"a":null,"b":null}}'::jsonb;
    end if;
    s := s - 'ask'; vs := 'pick';
  elsif e.kind = 'battle' and vs = 'pick' then
    if (s->'lock'->>me)::boolean then return jsonb_build_object('ok', false, 'code', 'locked'); end if;
    if act = 'pick' then
      it := (p_act->>'item')::bigint;
      if not (s->'team'->me) @> to_jsonb(it) or (public.cr_hk(it)->>'hp')::int <= 0 then return jsonb_build_object('ok', false, 'code', 'not_team'); end if;
      s := jsonb_set(s, array['pick', me], to_jsonb(it));
    elsif act = 'unpick' then s := jsonb_set(s, array['pick', me], 'null'::jsonb);
    elsif act = 'lock' then
      if s->'pick'->>me is null then return jsonb_build_object('ok', false, 'code', 'no_pick'); end if;
      s := jsonb_set(s, array['lock', me], 'true'::jsonb);
      if (s->'lock'->>th)::boolean then
        vs := 'shadow';
        s := s || jsonb_build_object('shown', s->'pick', 'swapped', '{"a":false,"b":false}'::jsonb, 'deadline', extract(epoch from now()) + 6);
      end if;
    else return jsonb_build_object('ok', false, 'code', 'bad'); end if;
  elsif e.kind = 'battle' and vs = 'shadow' then
    if act <> 'swapin' or (s->'swapped'->>me)::boolean then return jsonb_build_object('ok', false, 'code', 'bad'); end if;
    it := (p_act->>'item')::bigint;
    if not (s->'team'->me) @> to_jsonb(it) or it = (s->'pick'->>me)::bigint or (public.cr_hk(it)->>'hp')::int <= 0 then return jsonb_build_object('ok', false, 'code', 'not_team'); end if;
    s := jsonb_set(jsonb_set(s, array['pick', me], to_jsonb(it)), array['swapped', me], 'true'::jsonb);
  elsif e.kind = 'battle' and vs = 'replace' then
    if act <> 'next' or not (s->'need'->>me)::boolean then return jsonb_build_object('ok', false, 'code', 'bad'); end if;
    it := (p_act->>'item')::bigint;
    if not (s->'team'->me) @> to_jsonb(it) or coalesce((s->'hp'->me->>it::text)::int, 0) <= 0 then return jsonb_build_object('ok', false, 'code', 'not_team'); end if;
    s := jsonb_set(jsonb_set(s, array['pick', me], to_jsonb(it)), array['need', me], 'false'::jsonb);
    if not (s->'need'->>th)::boolean then vs := 'fight'; end if;
  elsif e.kind = 'battle' and vs = 'end' and act = 'rematch' then
    s := s || '{"pick":{"a":null,"b":null},"lock":{"a":false,"b":false},"need":{"a":false,"b":false},"move":{"a":null,"b":null}}'::jsonb;
    s := s - 'last' - 'charge';
    vs := 'pick';
  elsif e.kind = 'battle' and vs = 'fight' then
    if act <> 'move' or s->'move'->>me is not null then return jsonb_build_object('ok', false, 'code', 'bad'); end if;
    cur := (s->'pick'->>me)::bigint; h := public.cr_hk(cur);
    if s->'charge'->me is not null and s->'charge'->me->>'item' is not null and (s->'charge'->me->>'item')::bigint = cur then
      -- Charged last round: this round is spoken for. Whatever was sent, the charge comes out.
      mv := jsonb_build_object('m', (s->'charge'->me->>'m')::int, 'unleash', true);
    elsif p_act ? 'swap' then
      it := (p_act->>'swap')::bigint;
      if not (s->'team'->me) @> to_jsonb(it) or it = cur or coalesce((s->'hp'->me->>it::text)::int, 0) <= 0 then
        return jsonb_build_object('ok', false, 'code', 'not_team'); end if;
      mv := jsonb_build_object('swap', it);
    else
      nm := (p_act->>'m')::int;
      if nm is null or nm < 0 or nm >= jsonb_array_length(h->'moves') then return jsonb_build_object('ok', false, 'code', 'bad'); end if;
      mv := jsonb_build_object('m', nm);
      if coalesce((h->'moves'->nm->>'charge')::boolean, false) then mv := mv || '{"charge":true}'::jsonb; end if;
    end if;
    s := jsonb_set(s, array['move', me], mv);

    if s->'move'->>th is not null then
      ma := s->'move'->'a'; mb := s->'move'->'b';
      from_a := public.cr_hk((s->'pick'->>'a')::bigint)->>'name'; from_b := public.cr_hk((s->'pick'->>'b')::bigint)->>'name';
      swa := ma ? 'swap'; swb := mb ? 'swap';
      if swa then s := jsonb_set(s, '{pick,a}', ma->'swap'); end if;
      if swb then s := jsonb_set(s, '{pick,b}', mb->'swap'); end if;
      fa := public.cr_hk((s->'pick'->>'a')::bigint); fb := public.cr_hk((s->'pick'->>'b')::bigint);
      ca := coalesce((ma->>'charge')::boolean, false); cb := coalesce((mb->>'charge')::boolean, false);
      ua := coalesce((ma->>'unleash')::boolean, false); ub := coalesce((mb->>'unleash')::boolean, false);
      ea := case when ua or ca then fa->'moves'->((ma->>'m')::int)->'el' end;
      eb := case when ub or cb then fb->'moves'->((mb->>'m')::int)->'el' end;
      -- A side charging or swapping has no kind this round; every attack reads its move's own elements.
      ka := case when swa or ca then null else fa->'moves'->((ma->>'m')::int)->>'kind' end;
      kb := case when swb or cb then null else fb->'moves'->((mb->>'m')::int)->>'kind' end;
      ta := case when swa then fa->'types' else coalesce(fa->'moves'->((ma->>'m')::int)->'el', fa->'types') end;
      tb := case when swb then fb->'types' else coalesce(fb->'moves'->((mb->>'m')::int)->'el', fb->'types') end;
      if (swa or ca) and (swb or cb) then
        line := case when ca and cb then 'BOTH CHARGING UP!' when swa and swb then 'BOTH SWAP!' when ca then upper(from_a) || ' IS CHARGING UP!' else upper(from_b) || ' IS CHARGING UP!' end;
        extra := case when ca or cb then 'GET READY!' else '' end;
      elsif swa or ca then
        ra := public.cr_match_el(tb, fa->'types', fb->'types'->>0, fb->>'rarity'); hit_a := (ra->>'hit')::int + (case when ub then 2 else 0 end); hit_b := (ra->>'recoil')::int; extra := ra->>'label';
        line := upper(fb->'moves'->((mb->>'m')::int)->>'name') || ' HITS ' || upper(fa->>'name');
      elsif swb or cb then
        rb := public.cr_match_el(ta, fb->'types', fa->'types'->>0, fa->>'rarity'); hit_b := (rb->>'hit')::int + (case when ua then 2 else 0 end); hit_a := (rb->>'recoil')::int; extra := rb->>'label';
        line := upper(fa->'moves'->((ma->>'m')::int)->>'name') || ' HITS ' || upper(fb->>'name');
      elsif ua <> ub then
        -- A charge comes out first, clear of the kind triangle. If it downs them, their move never lands;
        -- otherwise theirs follows, judged against the charger's kind as usual.
        if ua then
          rb := public.cr_match_el(ta, fb->'types', fa->'types'->>0, fa->>'rarity'); hit_b := (rb->>'hit')::int + 2; extra := rb->>'label';
          line := upper(fa->'moves'->((ma->>'m')::int)->>'name') || ' COMES OUT FIRST!';
          if (s->'hp'->'b'->>(s->'pick'->>'b'))::int - hit_b > 0 then
            sc := public.cr_kind_score(ka, kb);
            if sc < 0 then
              ra := public.cr_match_el(tb, fa->'types', fb->'types'->>0, fb->>'rarity'); hit_a := (ra->>'hit')::int; hit_b := hit_b + (ra->>'recoil')::int;
            elsif sc = 0 then
              ra := public.cr_match_el(tb, fa->'types', fb->'types'->>0, fb->>'rarity'); if (ra->>'weak')::int > 0 then hit_a := (ra->>'hit')::int - 1; end if;
            end if;
          end if;
        else
          ra := public.cr_match_el(tb, fa->'types', fb->'types'->>0, fb->>'rarity'); hit_a := (ra->>'hit')::int + 2; extra := ra->>'label';
          line := upper(fb->'moves'->((mb->>'m')::int)->>'name') || ' COMES OUT FIRST!';
          if (s->'hp'->'a'->>(s->'pick'->>'a'))::int - hit_a > 0 then
            sc := public.cr_kind_score(kb, ka);
            if sc < 0 then
              rb := public.cr_match_el(ta, fb->'types', fa->'types'->>0, fa->>'rarity'); hit_b := (rb->>'hit')::int; hit_a := hit_a + (rb->>'recoil')::int;
            elsif sc = 0 then
              rb := public.cr_match_el(ta, fb->'types', fa->'types'->>0, fa->>'rarity'); if (rb->>'weak')::int > 0 then hit_b := (rb->>'hit')::int - 1; end if;
            end if;
          end if;
        end if;
      else
        sc := public.cr_kind_score(ka, kb);
        if sc = 0 then
          line := 'CLANG!';
          ra := public.cr_match_el(ta, fb->'types', fa->'types'->>0, fa->>'rarity'); if (ra->>'weak')::int > 0 then hit_b := (ra->>'hit')::int - 1; end if;
          rb := public.cr_match_el(tb, fa->'types', fb->'types'->>0, fb->>'rarity'); if (rb->>'weak')::int > 0 then hit_a := (rb->>'hit')::int - 1; end if;
          -- The charge's bonus heart lands even on a clang.
          if ua then hit_b := hit_b + 2; end if;
          if ub then hit_a := hit_a + 2; end if;
          extra := case when hit_a + hit_b = 0 then 'NOTHING HAPPENS' when greatest((ra->>'weak')::int, (rb->>'weak')::int) = 2 then 'DOUBLE SUPER EFFECTIVE!'
                        when greatest((ra->>'weak')::int, (rb->>'weak')::int) = 1 then 'SUPER EFFECTIVE!' else 'THE CHARGE GETS THROUGH!' end;
        elsif sc > 0 then
          line := public.cr_kind_line(ka, kb);
          rb := public.cr_match_el(ta, fb->'types', fa->'types'->>0, fa->>'rarity'); hit_b := (rb->>'hit')::int + (case when ua then 2 else 0 end); hit_a := (rb->>'recoil')::int; extra := rb->>'label';
        else
          line := public.cr_kind_line(kb, ka);
          ra := public.cr_match_el(tb, fa->'types', fb->'types'->>0, fb->>'rarity'); hit_a := (ra->>'hit')::int + (case when ub then 2 else 0 end); hit_b := (ra->>'recoil')::int; extra := ra->>'label';
        end if;
      end if;
      -- A charging creature takes half, rounded down, and has no recoil of its own.
      if ca then hit_a := hit_a / 2; end if;
      if cb then hit_b := hit_b / 2; end if;
      s := jsonb_set(s, array['hp', 'a', s->'pick'->>'a'], to_jsonb(greatest(0, (s->'hp'->'a'->>(s->'pick'->>'a'))::int - hit_a)));
      s := jsonb_set(s, array['hp', 'b', s->'pick'->>'b'], to_jsonb(greatest(0, (s->'hp'->'b'->>(s->'pick'->>'b'))::int - hit_b)));
      down_a := (s->'hp'->'a'->>(s->'pick'->>'a'))::int <= 0; down_b := (s->'hp'->'b'->>(s->'pick'->>'b'))::int <= 0;
      -- The charge, held for next round; cleared once it is out, or when its creature swaps or goes down.
      s := s || jsonb_build_object('charge', jsonb_build_object(
        'a', case when ca and not down_a then jsonb_build_object('item', (s->'pick'->>'a')::bigint, 'm', (ma->>'m')::int, 'el', ea) else null end,
        'b', case when cb and not down_b then jsonb_build_object('item', (s->'pick'->>'b')::bigint, 'm', (mb->>'m')::int, 'el', eb) else null end));
      foreach sd in array sides loop
        x := s->'pick'->>sd;
        s := jsonb_set(s, array['known', sd, x], 'true'::jsonb);
        mv := s->'move'->sd;
        if mv ? 'm' and not coalesce(s->'seen'->sd->x, '[]'::jsonb) @> (mv->'m') then
          s := jsonb_set(s, array['seen', sd, x], coalesce(s->'seen'->sd->x, '[]'::jsonb) || jsonb_build_array(mv->'m'));
        end if;
      end loop;
      s := jsonb_set(s, '{quiet}', to_jsonb(case when hit_a + hit_b > 0 or swa or swb or ca or cb then 0 else (s->>'quiet')::int + 1 end));
      s := s || jsonb_build_object('last', jsonb_build_object('turn', (s->>'turn')::int, 'line', line, 'extra', extra,
             'a', jsonb_build_object('swap', swa, 'from', from_a, 'to', fa->>'name', 'move', case when swa then null else fa->'moves'->((ma->>'m')::int)->>'name' end, 'hit', hit_a, 'charge', ca, 'unleash', case when ua then ea end),
             'b', jsonb_build_object('swap', swb, 'from', from_b, 'to', fb->>'name', 'move', case when swb then null else fb->'moves'->((mb->>'m')::int)->>'name' end, 'hit', hit_b, 'charge', cb, 'unleash', case when ub then eb end)),
             'move', '{"a":null,"b":null}'::jsonb);
      alive_a := exists (select 1 from jsonb_array_elements_text(s->'team'->'a') y where (s->'hp'->'a'->>y)::int > 0);
      alive_b := exists (select 1 from jsonb_array_elements_text(s->'team'->'b') y where (s->'hp'->'b'->>y)::int > 0);
      if not alive_a or not alive_b or (s->>'quiet')::int >= 3 then vs := 'end';
      else
        s := jsonb_set(s, '{turn}', to_jsonb((s->>'turn')::int + 1));
        if down_a or down_b then vs := 'replace'; s := jsonb_set(s, '{need}', jsonb_build_object('a', down_a, 'b', down_b)); end if;
      end if;
    end if;
  else
    return jsonb_build_object('ok', false, 'code', 'bad');
  end if;

  -- A fight that ends (or is walked away from) leaves its marks: hearts are written back to each creature.
  if e.kind = 'battle' and e.stage in ('fight', 'replace') and vs in ('end', 'off') then
    foreach sd in array sides loop
      for x in select jsonb_array_elements_text(s->'team'->sd) loop
        update public.badge_items i set hp = case when (s->'hp'->sd->>x)::int >= k.hearts * 2 then null else greatest(0, ceil((s->'hp'->sd->>x)::int / 2.0))::int end
          from public.badge_kinds k
         where i.id = x::bigint and k.slug = i.kind_slug and i.owner_id = (case when sd = 'a' then e.a else e.b end);
      end loop;
    end loop;
    if vs = 'end' then
      alive_a := exists (select 1 from jsonb_array_elements_text(s->'team'->'a') y where (s->'hp'->'a'->>y)::int > 0);
      alive_b := exists (select 1 from jsonb_array_elements_text(s->'team'->'b') y where (s->'hp'->'b'->>y)::int > 0);
      if alive_a and not alive_b then
        insert into public.battle_results (winner, loser) values (e.a, e.b); perform public.cr_battle_prize(e.a);
      elsif alive_b and not alive_a then
        insert into public.battle_results (winner, loser) values (e.b, e.a); perform public.cr_battle_prize(e.b);
      end if;
    end if;
  end if;
  if e.kind = 'battle' and e.stage in ('fight', 'replace') and vs in ('end', 'off') and s->>'epic' is not null then
    if vs = 'end' then
      alive_a := exists (select 1 from jsonb_array_elements_text(s->'team'->'a') y where (s->'hp'->'a'->>y)::int > 0);
      alive_b := exists (select 1 from jsonb_array_elements_text(s->'team'->'b') y where (s->'hp'->'b'->>y)::int > 0);
      w := case when alive_a and not alive_b then 'a' when alive_b and not alive_a then 'b' end;
    else
      w := case s->>'off_by' when 'a' then 'b' when 'b' then 'a' end;
    end if;
    if w is not null then s := s || jsonb_build_object('prize', public.cr_epic_payout(e, s, w)); end if;
  end if;
  update public.encounters set stage = vs, st = s, seq = seq + 1, updated_at = now() where id = p_id;
  return jsonb_build_object('ok', true);
end;
$function$;

-- The creature editor's save: its loop counter was named o, which clashed with a column alias and threw on every save.
create or replace function public.cr_edit_creature(p_slug text, p jsonb)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare k public.badge_kinds; v_name text; v_rar text; v_types text[]; v_moves jsonb; m jsonb; n int; before jsonb; oi int := 0;
begin
  if not public.cr_is_editor() then return jsonb_build_object('ok', false, 'code', 'not_editor'); end if;
  select * into k from public.badge_kinds where slug = p_slug and types is not null for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'missing'); end if;
  before := public.cr_creature_row(k);
  v_name := upper(btrim(coalesce(p->>'name', k.title)));
  if length(v_name) not between 1 and 40 or v_name ~ '[|;:]' then return jsonb_build_object('ok', false, 'code', 'bad_name'); end if;
  v_rar := coalesce(p->>'rarity', k.rarity);
  if v_rar not in ('common', 'uncommon', 'rare', 'epic', 'legendary') then return jsonb_build_object('ok', false, 'code', 'bad_rarity'); end if;
  if p ? 'types' then select array_agg(t order by o) into v_types from jsonb_array_elements_text(p->'types') with ordinality x(t, o) where t <> ''; else v_types := k.types; end if;
  if coalesce(array_length(v_types, 1), 0) not between 1 and 2 or not v_types <@ array['fire', 'tide', 'nature', 'ward', 'feral', 'dark', 'spirit']
     or (array_length(v_types, 1) = 2 and v_types[1] = v_types[2]) then return jsonb_build_object('ok', false, 'code', 'bad_types'); end if;
  v_moves := coalesce(p->'moves', k.moves);
  n := case v_rar when 'common' then 3 when 'uncommon' then 3 else 4 end;
  if jsonb_typeof(v_moves) <> 'array' or jsonb_array_length(v_moves) <> n then return jsonb_build_object('ok', false, 'code', 'bad_moves', 'need', n); end if;
  for m in select * from jsonb_array_elements(v_moves) loop
    oi := oi + 1;
    if coalesce(m->>'kind', '') not in ('sword', 'spell', 'armor') or length(btrim(coalesce(m->>'name', ''))) not between 1 and 24 or m->>'name' ~ '[|;:]' then
      return jsonb_build_object('ok', false, 'code', 'bad_moves', 'need', n); end if;
    -- Elements: one on every move, two only on the fourth of an epic or a mythic; a mythic's fourth charges.
    if jsonb_typeof(m->'el') <> 'array' or jsonb_array_length(m->'el') not between 1 and 2
       or exists (select 1 from jsonb_array_elements_text(m->'el') t where t not in ('fire', 'tide', 'nature', 'ward', 'feral', 'dark', 'spirit'))
       or (jsonb_array_length(m->'el') = 2 and (oi < 4 or v_rar not in ('epic', 'legendary') or m->'el'->>0 = m->'el'->>1)) then
      return jsonb_build_object('ok', false, 'code', 'bad_el'); end if;
    if coalesce((m->>'charge')::boolean, false) <> (oi = 4 and v_rar = 'legendary') then return jsonb_build_object('ok', false, 'code', 'bad_charge'); end if;
  end loop;
  v_moves := (select jsonb_agg(jsonb_build_object('name', btrim(x->>'name'), 'kind', x->>'kind', 'el', x->'el') || case when coalesce((x->>'charge')::boolean, false) then '{"charge":true}'::jsonb else '{}'::jsonb end order by o) from jsonb_array_elements(v_moves) with ordinality e(x, o));
  update public.badge_kinds set title = v_name, rarity = v_rar, types = v_types, moves = v_moves,
         hearts = case when (p->>'hearts') ~ '^[1-5]$' then (p->>'hearts')::int else case v_rar when 'common' then 2 when 'uncommon' then 3 when 'rare' then 3 when 'legendary' then 5 else 4 end end,
         element = case v_types[1] when 'fire' then 'fire' when 'tide' then 'water' when 'nature' then 'grass' when 'ward' then 'rock' when 'feral' then 'rock' when 'dark' then 'dark' when 'spirit' then 'light' end,
         blurb = 'A ' || v_rar || ' ' || initcap(v_types[1]) || coalesce('/' || initcap(v_types[2]), '') || ' Historikal.',
         droppable = coalesce((p->>'droppable')::boolean, k.droppable), hover = coalesce((p->>'hover')::boolean, k.hover),
         rnd = coalesce((p->>'rnd')::boolean, k.rnd), shift = coalesce((p->>'shift')::boolean, k.shift)
   where slug = p_slug returning * into k;
  insert into public.creature_edits (by, slug, before, after) values (auth.uid(), p_slug, before, public.cr_creature_row(k));
  return jsonb_build_object('ok', true, 'creature', public.cr_creature_row(k));
end;
$function$;

-- The kinds by their new names.
create or replace function public.cr_kind_line(w text, l text) returns text language sql immutable set search_path = public as $$
  select case w when 'sword' then 'PIERCE THROUGH SOFT!' when 'spell' then 'SOFT COVERS HARD!' else 'HARD BREAKS PIERCE!' end;
$$;
