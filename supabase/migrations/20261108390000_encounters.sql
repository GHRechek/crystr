-- Face to face: a trade or a battle between two people standing together, after one scans the other.
-- One row holds the whole thing. Nobody reads it directly: cr_enc_view gives each side only what that side
-- may see (the other's secret pick, team and unseen moves stay hidden), and cr_enc_act is the only way to
-- change it, so the server runs the rules.
create table if not exists public.encounters (
  id bigserial primary key,
  kind text not null check (kind in ('trade', 'battle')),
  a uuid not null references public.profiles(id) on delete cascade,   -- who scanned
  b uuid not null references public.profiles(id) on delete cascade,   -- who was scanned
  stage text not null,
  st jsonb not null default '{}'::jsonb,
  seq int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists encounters_a on public.encounters (a, id desc);
create index if not exists encounters_b on public.encounters (b, id desc);
alter table public.encounters enable row level security;

-- A Historikal you hold, with what it can do.
create or replace function public.cr_hk(p_item bigint) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', i.id, 'slug', k.slug, 'name', k.title, 'rarity', k.rarity, 'element', k.element, 'hearts', k.hearts, 'moves', k.moves)
    from public.badge_items i join public.badge_kinds k on k.slug = i.kind_slug where i.id = p_item;
$$;

-- How hard a winning hit lands: 2 super effective, 0 no effect (Light and Dark), else 1.
create or replace function public.cr_dmg(f text, t text) returns int language sql immutable as $$
  select case when (f = 'dark' and t = 'light') or (f = 'light' and t = 'dark') then 0
              when (f = 'fire' and t = 'grass') or (f = 'water' and t in ('fire', 'rock')) or (f = 'grass' and t in ('water', 'rock'))
                or (f = 'rock' and t = 'fire') or (f = 'dark' and t = 'dark') then 2
              else 1 end;
$$;

-- Start one: anything either of you still had open is closed first.
create or replace function public.cr_enc_start(p_kind text, p_other uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); v_id bigint;
begin
  if me is null or p_other is null or p_other = me or p_kind not in ('trade', 'battle') then
    return jsonb_build_object('ok', false, 'code', 'bad');
  end if;
  if not exists (select 1 from public.profiles where id = p_other) then return jsonb_build_object('ok', false, 'code', 'missing'); end if;
  update public.encounters set stage = 'off', st = st || '{"off_by":"x"}'::jsonb, seq = seq + 1, updated_at = now()
   where (a in (me, p_other) or b in (me, p_other)) and stage not in ('done', 'off', 'end');
  insert into public.encounters (kind, a, b, stage, st) values (p_kind, me, p_other, 'invite',
    case when p_kind = 'trade' then '{"pick":{"a":null,"b":null}}'::jsonb
         else '{"team":{"a":[],"b":[]},"ready":{"a":false,"b":false},"pick":{"a":null,"b":null},"lock":{"a":false,"b":false},
                "shown":{"a":null,"b":null},"swapped":{"a":false,"b":false},"hp":{"a":{},"b":{}},"seen":{"a":{},"b":{}},
                "known":{"a":{},"b":{}},"move":{"a":null,"b":null},"need":{"a":false,"b":false},"turn":1,"quiet":0}'::jsonb end)
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

-- The one that's open for you right now, if any (the other phone uses this to pop up).
create or replace function public.cr_enc_mine() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce((select jsonb_build_object('id', id, 'kind', kind, 'seq', seq) from public.encounters
                    where (a = auth.uid() or b = auth.uid()) and stage not in ('done', 'off', 'end')
                      and updated_at > now() - interval '20 minutes'
                    order by id desc limit 1), 'null'::jsonb);
$$;

-- Time passing: the five-second swap window closes on its own.
create or replace function public.cr_enc_tick(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare e public.encounters; s jsonb; x text; sd text;
begin
  select * into e from public.encounters where id = p_id for update;
  if not found or e.kind <> 'battle' or e.stage <> 'shadow' or now() < to_timestamp((e.st->>'deadline')::float8) then return; end if;
  s := e.st;
  foreach sd in array array['a', 'b'] loop
    for x in select jsonb_array_elements_text(s->'team'->sd) loop
      s := jsonb_set(s, array['hp', sd, x], to_jsonb((public.cr_hk(x::bigint)->>'hearts')::int));
    end loop;
  end loop;
  s := s || '{"turn":1,"quiet":0,"move":{"a":null,"b":null},"need":{"a":false,"b":false},"seen":{"a":{},"b":{}},"known":{"a":{},"b":{}}}'::jsonb;
  s := s - 'last';
  update public.encounters set stage = 'fight', st = s, seq = seq + 1, updated_at = now() where id = p_id;
end;
$$;

-- What one side may see.
create or replace function public.cr_enc_view(p_id bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare e public.encounters; me text; th text; o uuid; s jsonb; v jsonb; tp bigint; mp bigint;
begin
  perform public.cr_enc_tick(p_id);
  select * into e from public.encounters where id = p_id;
  if not found or auth.uid() is null or auth.uid() not in (e.a, e.b) then return jsonb_build_object('ok', false, 'code', 'missing'); end if;
  me := case when auth.uid() = e.a then 'a' else 'b' end; th := case when me = 'a' then 'b' else 'a' end;
  o := case when me = 'a' then e.b else e.a end; s := e.st;
  v := jsonb_build_object('ok', true, 'id', e.id, 'kind', e.kind, 'stage', e.stage, 'seq', e.seq, 'me', me,
    'them', (select jsonb_build_object('handle', handle, 'name', display_name) from public.profiles where id = o),
    'off_by', case when s->>'off_by' is null then null when s->>'off_by' = me then 'me' else 'them' end);
  -- Your own Historikals, when you need to choose from them.
  if (e.kind = 'trade' and e.stage = 'pick') or (e.kind = 'battle' and e.stage = 'team') then
    v := v || jsonb_build_object('mine', (select coalesce(jsonb_agg(public.cr_hk(i.id) order by k.sort, i.id), '[]'::jsonb)
             from public.badge_items i join public.badge_kinds k on k.slug = i.kind_slug
            where i.owner_id = auth.uid() and i.kind = 'tradable' and k.element is not null));
  end if;
  if e.kind = 'trade' then
    return v || jsonb_build_object(
      'my_pick', case when s->'pick'->>me is null then null else public.cr_hk((s->'pick'->>me)::bigint) end,
      'their_pick', case when s->'pick'->>th is null then null else public.cr_hk((s->'pick'->>th)::bigint) end,
      'got', case when s->'got'->>me is null then null else public.cr_hk((s->'got'->>me)::bigint) end);
  end if;

  mp := (s->'pick'->>me)::bigint; tp := (s->'pick'->>th)::bigint;
  v := v || jsonb_build_object(
    'team', (select coalesce(jsonb_agg(public.cr_hk(x::bigint) || jsonb_build_object('hp', (s->'hp'->me->>x)::int) order by n), '[]'::jsonb)
               from jsonb_array_elements_text(s->'team'->me) with ordinality t(x, n)),
    'ready', s->'ready'->me, 'their_ready', s->'ready'->th,
    'pick', mp, 'their_picked', tp is not null, 'lock', s->'lock'->me, 'their_lock', s->'lock'->th,
    'swapped', s->'swapped'->me, 'turn', s->'turn', 'quiet', s->'quiet',
    'move', s->'move'->me, 'their_moved', s->'move'->th is not null and s->'move'->>th is not null,
    'need', s->'need'->me, 'their_need', s->'need'->th);
  if e.stage = 'shadow' then
    -- Only the shape they first locked in: a swap since is theirs to know.
    v := v || jsonb_build_object('shadow', public.cr_hk((s->'shown'->>th)::bigint)->'slug',
                                 'left', greatest(0, ceil((s->>'deadline')::float8 - extract(epoch from now())))::int);
  end if;
  if e.stage in ('fight', 'replace', 'end') then
    v := v || jsonb_build_object(
      'their_pips', (select coalesce(jsonb_agg(jsonb_build_object('ko', coalesce((s->'hp'->th->>x)::int, 0) <= 0, 'cur', x::bigint = tp) order by n), '[]'::jsonb)
                       from jsonb_array_elements_text(s->'team'->th) with ordinality t(x, n)),
      'theirs', (select h - 'moves' - (case when coalesce((s->'known'->th->>tp::text)::boolean, false) then 'nothing' else 'element' end)
                   || jsonb_build_object('hp', (s->'hp'->th->>tp::text)::int,
                        'seen', (select coalesce(jsonb_agg(h->'moves'->(m::int)->>'name'), '[]'::jsonb) from jsonb_array_elements_text(coalesce(s->'seen'->th->tp::text, '[]'::jsonb)) m))
                   from (select public.cr_hk(tp) h) q),
      'last', s->'last',
      'alive', (select count(*) from jsonb_array_elements_text(s->'team'->me) x where (s->'hp'->me->>x)::int > 0),
      'their_alive', (select count(*) from jsonb_array_elements_text(s->'team'->th) x where (s->'hp'->th->>x)::int > 0));
  end if;
  return v;
end;
$$;

-- Do something.
create or replace function public.cr_enc_act(p_id bigint, p_act jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare e public.encounters; me text; th text; s jsonb; act text := p_act->>'do'; vs text; it bigint; ids bigint[];
        ga bigint; gb bigint; ok boolean;
        sides text[] := array['a', 'b']; sd text; ot text; x text;
        mv jsonb; cur bigint; h jsonb; nm int; f jsonb; g jsonb; fa jsonb; fb jsonb; ma jsonb; mb jsonb; ka text; kb text;
        hit_a int := 0; hit_b int := 0; line text; extra text := ''; swa boolean; swb boolean; from_a text; from_b text;
        alive_a boolean; alive_b boolean; down_a boolean; down_b boolean;
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
    if act = 'yes' then vs := case when e.kind = 'trade' then 'pick' else 'team' end;
    elsif act = 'no' then vs := 'off'; s := s || jsonb_build_object('off_by', me);
    else return jsonb_build_object('ok', false, 'code', 'bad'); end if;

  -- ----- trade -----
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

  -- ----- battle -----
  elsif e.kind = 'battle' and vs = 'team' then
    if act <> 'team' then return jsonb_build_object('ok', false, 'code', 'bad'); end if;
    select array_agg(distinct v::bigint) into ids from jsonb_array_elements_text(p_act->'ids') v;
    if coalesce(array_length(ids, 1), 0) <> 3 or (select count(*) from public.badge_items i join public.badge_kinds k on k.slug = i.kind_slug
        where i.id = any(ids) and i.owner_id = auth.uid() and i.kind = 'tradable' and k.element is not null) <> 3 then
      return jsonb_build_object('ok', false, 'code', 'bad_team'); end if;
    s := jsonb_set(jsonb_set(s, array['team', me], to_jsonb(ids)), array['ready', me], 'true'::jsonb);
    if (s->'ready'->>th)::boolean then vs := 'pick'; end if;
  elsif e.kind = 'battle' and vs = 'pick' then
    if (s->'lock'->>me)::boolean then return jsonb_build_object('ok', false, 'code', 'locked'); end if;
    if act = 'pick' then
      it := (p_act->>'item')::bigint;
      if not (s->'team'->me) @> to_jsonb(it) then return jsonb_build_object('ok', false, 'code', 'not_team'); end if;
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
    if not (s->'team'->me) @> to_jsonb(it) or it = (s->'pick'->>me)::bigint then return jsonb_build_object('ok', false, 'code', 'not_team'); end if;
    s := jsonb_set(jsonb_set(s, array['pick', me], to_jsonb(it)), array['swapped', me], 'true'::jsonb);
  elsif e.kind = 'battle' and vs = 'replace' then
    if act <> 'next' or not (s->'need'->>me)::boolean then return jsonb_build_object('ok', false, 'code', 'bad'); end if;
    it := (p_act->>'item')::bigint;
    if not (s->'team'->me) @> to_jsonb(it) or coalesce((s->'hp'->me->>it::text)::int, 0) <= 0 then return jsonb_build_object('ok', false, 'code', 'not_team'); end if;
    s := jsonb_set(jsonb_set(s, array['pick', me], to_jsonb(it)), array['need', me], 'false'::jsonb);
    if not (s->'need'->>th)::boolean then vs := 'fight'; end if;
  elsif e.kind = 'battle' and vs = 'end' and act = 'rematch' then
    s := s || '{"pick":{"a":null,"b":null},"lock":{"a":false,"b":false},"need":{"a":false,"b":false},"move":{"a":null,"b":null}}'::jsonb;
    s := s - 'last';
    vs := 'pick';
  elsif e.kind = 'battle' and vs = 'fight' then
    if act <> 'move' or s->'move'->>me is not null then return jsonb_build_object('ok', false, 'code', 'bad'); end if;
    cur := (s->'pick'->>me)::bigint; h := public.cr_hk(cur);
    if p_act ? 'swap' then
      it := (p_act->>'swap')::bigint;
      if not (s->'team'->me) @> to_jsonb(it) or it = cur or coalesce((s->'hp'->me->>it::text)::int, 0) <= 0 then
        return jsonb_build_object('ok', false, 'code', 'not_team'); end if;
      mv := jsonb_build_object('swap', it);
    else
      nm := (p_act->>'m')::int;
      if nm is null or nm < 0 or nm >= jsonb_array_length(h->'moves') then return jsonb_build_object('ok', false, 'code', 'bad'); end if;
      mv := jsonb_build_object('m', nm);
    end if;
    s := jsonb_set(s, array['move', me], mv);

    -- Both have chosen: settle the turn.
    if s->'move'->>th is not null then
      ma := s->'move'->'a'; mb := s->'move'->'b';
      from_a := public.cr_hk((s->'pick'->>'a')::bigint)->>'name'; from_b := public.cr_hk((s->'pick'->>'b')::bigint)->>'name';
      swa := ma ? 'swap'; swb := mb ? 'swap';
      if swa then s := jsonb_set(s, '{pick,a}', ma->'swap'); end if;   -- swaps happen first
      if swb then s := jsonb_set(s, '{pick,b}', mb->'swap'); end if;
      fa := public.cr_hk((s->'pick'->>'a')::bigint); fb := public.cr_hk((s->'pick'->>'b')::bigint);
      ka := case when swa then null else fa->'moves'->((ma->>'m')::int)->>'kind' end;
      kb := case when swb then null else fb->'moves'->((mb->>'m')::int)->>'kind' end;
      if swa and swb then line := 'BOTH SWAP!';
      elsif swa then hit_a := public.cr_dmg(fb->>'element', fa->>'element'); line := upper(fb->'moves'->((mb->>'m')::int)->>'name') || ' HITS ' || (fa->>'name');
      elsif swb then hit_b := public.cr_dmg(fa->>'element', fb->>'element'); line := upper(fa->'moves'->((ma->>'m')::int)->>'name') || ' HITS ' || (fb->>'name');
      elsif ka = kb then
        line := 'CLANG!';
        if public.cr_dmg(fa->>'element', fb->>'element') = 2 then hit_b := 1; end if;
        if public.cr_dmg(fb->>'element', fa->>'element') = 2 then hit_a := 1; end if;
        extra := case when hit_a + hit_b > 0 then 'SUPER EFFECTIVE!' else 'NOTHING HAPPENS' end;
      elsif (ka = 'sword' and kb = 'spell') or (ka = 'spell' and kb = 'armor') or (ka = 'armor' and kb = 'sword') then
        line := case ka when 'sword' then 'SWORD CUTS SPELL!' when 'spell' then 'SPELL BREAKS ARMOR!' else 'ARMOR BLOCKS SWORD!' end;
        hit_b := public.cr_dmg(fa->>'element', fb->>'element');
      else
        line := case kb when 'sword' then 'SWORD CUTS SPELL!' when 'spell' then 'SPELL BREAKS ARMOR!' else 'ARMOR BLOCKS SWORD!' end;
        hit_a := public.cr_dmg(fb->>'element', fa->>'element');
      end if;
      if extra = '' and (swa or swb or ka <> kb) then
        extra := case when greatest(hit_a, hit_b) = 2 then 'SUPER EFFECTIVE!' when not (swa and swb) and hit_a + hit_b = 0 then 'IT HAD NO EFFECT' else '' end;
      end if;
      s := jsonb_set(s, array['hp', 'a', s->'pick'->>'a'], to_jsonb(greatest(0, (s->'hp'->'a'->>(s->'pick'->>'a'))::int - hit_a)));
      s := jsonb_set(s, array['hp', 'b', s->'pick'->>'b'], to_jsonb(greatest(0, (s->'hp'->'b'->>(s->'pick'->>'b'))::int - hit_b)));
      -- What each side has now seen of the other.
      foreach sd in array sides loop
        x := s->'pick'->>sd;
        s := jsonb_set(s, array['known', sd, x], 'true'::jsonb);
        mv := s->'move'->sd;
        if mv ? 'm' and not coalesce(s->'seen'->sd->x, '[]'::jsonb) @> (mv->'m') then
          s := jsonb_set(s, array['seen', sd, x], coalesce(s->'seen'->sd->x, '[]'::jsonb) || jsonb_build_array(mv->'m'));
        end if;
      end loop;
      s := jsonb_set(s, '{quiet}', to_jsonb(case when hit_a + hit_b > 0 or swa or swb then 0 else (s->>'quiet')::int + 1 end));
      s := s || jsonb_build_object('last', jsonb_build_object('turn', (s->>'turn')::int, 'line', line, 'extra', extra,
             'a', jsonb_build_object('swap', swa, 'from', from_a, 'to', fa->>'name', 'move', case when swa then null else fa->'moves'->((ma->>'m')::int)->>'name' end, 'hit', hit_a),
             'b', jsonb_build_object('swap', swb, 'from', from_b, 'to', fb->>'name', 'move', case when swb then null else fb->'moves'->((mb->>'m')::int)->>'name' end, 'hit', hit_b)),
             'move', '{"a":null,"b":null}'::jsonb);
      alive_a := exists (select 1 from jsonb_array_elements_text(s->'team'->'a') y where (s->'hp'->'a'->>y)::int > 0);
      alive_b := exists (select 1 from jsonb_array_elements_text(s->'team'->'b') y where (s->'hp'->'b'->>y)::int > 0);
      down_a := (s->'hp'->'a'->>(s->'pick'->>'a'))::int <= 0; down_b := (s->'hp'->'b'->>(s->'pick'->>'b'))::int <= 0;
      if not alive_a or not alive_b or (s->>'quiet')::int >= 3 then vs := 'end';
      else
        s := jsonb_set(s, '{turn}', to_jsonb((s->>'turn')::int + 1));
        if down_a or down_b then vs := 'replace'; s := jsonb_set(s, '{need}', jsonb_build_object('a', down_a, 'b', down_b)); end if;
      end if;
    end if;
  else
    return jsonb_build_object('ok', false, 'code', 'bad');
  end if;

  update public.encounters set stage = vs, st = s, seq = seq + 1, updated_at = now() where id = p_id;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.cr_hk(bigint), public.cr_enc_tick(bigint) from public, anon, authenticated;
revoke all on function public.cr_enc_start(text, uuid), public.cr_enc_mine(), public.cr_enc_view(bigint), public.cr_enc_act(bigint, jsonb) from public, anon;
grant execute on function public.cr_enc_start(text, uuid), public.cr_enc_mine(), public.cr_enc_view(bigint), public.cr_enc_act(bigint, jsonb) to authenticated;
