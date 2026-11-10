-- In a battle, the ones they have left to send out show as silhouettes above the one that is up.
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
      -- Their lineup, in order: which are out, which is up, and for the ones still waiting, their shape (a
      -- silhouette shows what is left to face, not who).
      'their_pips', (select coalesce(jsonb_agg(jsonb_build_object('ko', coalesce((s->'hp'->th->>x)::int, 0) <= 0, 'cur', x::bigint = tp,
                       'slug', case when coalesce((s->'hp'->th->>x)::int, 0) > 0 and x::bigint <> tp then public.cr_hk(x::bigint)->>'slug' end) order by n), '[]'::jsonb)
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

