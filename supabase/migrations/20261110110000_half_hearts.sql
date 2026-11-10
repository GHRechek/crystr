-- Hearts come in halves in a battle. A hit does one heart; one and a half when the attacker's first type
-- beats one of the defender's types, two when it beats both; half when a defender's type beats the attacker's,
-- half when one is beaten and the other beats (they cancel), and half, with half back on the attacker, when
-- both of the defender's types beat it: a bad matchup. Battle state keeps hearts as half-hearts (an int),
-- the view hands them out as hearts (2.5), and what is written back to a creature is rounded up to whole.
create or replace function public.cr_match(f jsonb, t jsonb) returns jsonb language sql immutable as $$
  with d as (
    select count(*) filter (where public.cr_beats(f->>0, x)) as w, count(*) filter (where public.cr_beats(x, f->>0)) as r
      from jsonb_array_elements_text(coalesce(t, '[]'::jsonb)) x)
  select case when w = 2 then jsonb_build_object('hit', 4, 'recoil', 0, 'label', 'DOUBLE SUPER EFFECTIVE!', 'weak', 2)
              when w = 1 and r = 0 then jsonb_build_object('hit', 3, 'recoil', 0, 'label', 'SUPER EFFECTIVE!', 'weak', 1)
              when w = 1 and r = 1 then jsonb_build_object('hit', 1, 'recoil', 0, 'label', 'CANCELS OUT', 'weak', 1)
              when r = 2 then jsonb_build_object('hit', 1, 'recoil', 1, 'label', 'BAD MATCHUP!', 'weak', 0)
              when r = 1 then jsonb_build_object('hit', 1, 'recoil', 0, 'label', 'NOT VERY EFFECTIVE', 'weak', 0)
              else jsonb_build_object('hit', 2, 'recoil', 0, 'label', '', 'weak', 0) end
    from d;
$$;
alter function public.cr_match(jsonb, jsonb) set search_path = public;

do $do$
declare d text;
begin
  -- Hearts go into the fight as halves.
  select pg_get_functiondef('public.cr_enc_tick(bigint)'::regprocedure) into d;
  d := replace(d, 'to_jsonb((public.cr_hk(x::bigint)->>''hp'')::int)', 'to_jsonb((public.cr_hk(x::bigint)->>''hp'')::int * 2)');
  execute d;

  select pg_get_functiondef('public.cr_enc_act(bigint, jsonb)'::regprocedure) into d;
  d := replace(d, 'hit_a int := 0; hit_b int := 0;', 'hit_a int := 0; hit_b int := 0; ra jsonb; rb jsonb;');
  -- A swap on one side: the other's move lands, with any recoil on the mover's side.
  d := replace(d, 'elsif swa then hit_a := public.cr_dmg(fb->''types'', fa->''types''); line :=',
                  'elsif swa then ra := public.cr_match(fb->''types'', fa->''types''); hit_a := (ra->>''hit'')::int; hit_b := (ra->>''recoil'')::int; extra := ra->>''label''; line :=');
  d := replace(d, 'elsif swb then hit_b := public.cr_dmg(fa->''types'', fb->''types''); line :=',
                  'elsif swb then rb := public.cr_match(fa->''types'', fb->''types''); hit_b := (rb->>''hit'')::int; hit_a := (rb->>''recoil'')::int; extra := rb->>''label''; line :=');
  -- Clang: only a side with the type advantage gets through, a half-heart less than its clean hit.
  d := replace(d, 'if public.cr_dmg(fa->''types'', fb->''types'') = 2 then hit_b := 1; end if;',
                  'ra := public.cr_match(fa->''types'', fb->''types''); if (ra->>''weak'')::int > 0 then hit_b := (ra->>''hit'')::int - 1; end if;');
  d := replace(d, 'if public.cr_dmg(fb->''types'', fa->''types'') = 2 then hit_a := 1; end if;',
                  'rb := public.cr_match(fb->''types'', fa->''types''); if (rb->>''weak'')::int > 0 then hit_a := (rb->>''hit'')::int - 1; end if;');
  d := replace(d, 'extra := case when hit_a + hit_b > 0 then ''SUPER EFFECTIVE!'' else ''NOTHING HAPPENS'' end;',
                  'extra := case when hit_a + hit_b = 0 then ''NOTHING HAPPENS'' when greatest((ra->>''weak'')::int, (rb->>''weak'')::int) = 2 then ''DOUBLE SUPER EFFECTIVE!'' else ''SUPER EFFECTIVE!'' end;');
  -- One kind beats the other: the winner's move lands.
  d := replace(d, E'        hit_b := public.cr_dmg(fa->''types'', fb->''types'');\n      else',
                  E'        rb := public.cr_match(fa->''types'', fb->''types''); hit_b := (rb->>''hit'')::int; hit_a := (rb->>''recoil'')::int; extra := rb->>''label'';\n      else');
  d := replace(d, E'        hit_a := public.cr_dmg(fb->''types'', fa->''types'');\n      end if;',
                  E'        ra := public.cr_match(fb->''types'', fa->''types''); hit_a := (ra->>''hit'')::int; hit_b := (ra->>''recoil'')::int; extra := ra->>''label'';\n      end if;');
  -- The old summing-up of the label: each branch names its own now.
  d := replace(d, E'      if extra = '''' and (swa or swb or ka <> kb) then\n        extra := case when greatest(hit_a, hit_b) = 2 then ''SUPER EFFECTIVE!'' when not (swa and swb) and hit_a + hit_b = 0 then ''IT HAD NO EFFECT'' else '''' end;\n      end if;\n', '');
  -- Written back as whole hearts, rounded up: half a heart left is still a heart to fight with next time.
  d := replace(d, 'set hp = case when (s->''hp''->sd->>x)::int >= k.hearts then null else greatest(0, (s->''hp''->sd->>x)::int) end',
                  'set hp = case when (s->''hp''->sd->>x)::int >= k.hearts * 2 then null else greatest(0, ceil((s->''hp''->sd->>x)::int / 2.0))::int end');
  execute d;

  -- The view hands hearts out as hearts: 2.5, not 5 halves.
  select pg_get_functiondef('public.cr_enc_view(bigint)'::regprocedure) into d;
  d := replace(d, 'jsonb_build_object(''hp'', (s->''hp''->me->>x)::int)', 'jsonb_build_object(''hp'', (s->''hp''->me->>x)::int / 2.0)');
  d := replace(d, '''hp'', (s->''hp''->th->>tp::text)::int,', '''hp'', (s->''hp''->th->>tp::text)::int / 2.0,');
  execute d;
end $do$;
