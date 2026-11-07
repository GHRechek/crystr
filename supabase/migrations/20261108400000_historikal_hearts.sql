-- Historikals are the only collectibles now, and they behave like creatures, not badges:
--  * the last old item (and any other) becomes a common creature; the old kinds retire
--  * they no longer raise max mana (tokens still do)
--  * hearts lost in battle stay lost, written back to the creature; healing costs your own mana, 2 a heart
--  * one comes every 3 confirmed helps (was 10) and every 10 battles won
--  * finishing a main quest always gives a rare, with a small better chance (8%) of a legendary

-- 1. The old items become creatures.
update public.badge_items i set kind_slug = (select slug from public.badge_kinds where droppable and rarity = 'common' order by random() + i.id * 0 limit 1)
 where i.kind = 'tradable' and i.kind_slug in (select slug from public.badge_kinds where not droppable);
update public.badge_kinds set active = false where not droppable;

-- 2. Max mana: badges and tokens only.
create or replace function public.cr_recount_cap(p_user uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare v_on boolean; v_cap int;
begin
  select onboarded into v_on from public.profiles where id = p_user;
  if not found then return null; end if;
  if not v_on then
    v_cap := 10;
  else
    v_cap := 15
      + (select count(*) from public.user_badges where user_id = p_user)
      + (select coalesce(sum(case kind when 'token' then 7 else 0 end), 0) from public.badge_items where owner_id = p_user);
  end if;
  perform set_config('crystr.economy', 'on', true);
  update public.profiles set mana_cap = v_cap, mana = least(mana, v_cap), updated_at = now()
   where id = p_user and (mana_cap <> v_cap or mana > v_cap);
  return v_cap;
end;
$$;
do $$ declare u uuid; begin for u in select id from public.profiles loop perform public.cr_recount_cap(u); end loop; end $$;

-- 3. Hearts carried between battles (null = full), and healing them.
alter table public.badge_items add column if not exists hp int;
alter table public.mana_ledger drop constraint if exists mana_ledger_kind_check;
alter table public.mana_ledger add constraint mana_ledger_kind_check check (kind = any (array['grant', 'post', 'like', 'whisper', 'vote', 'oped', 'quest', 'top8', 'top6', 'wiki', 'trickle', 'heal']));

create or replace function public.cr_hk(p_item bigint) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', i.id, 'slug', k.slug, 'name', k.title, 'rarity', k.rarity, 'element', k.element, 'hearts', k.hearts,
                            'hp', least(k.hearts, coalesce(i.hp, k.hearts)), 'moves', k.moves)
    from public.badge_items i join public.badge_kinds k on k.slug = i.kind_slug where i.id = p_item;
$$;

create or replace function public.cr_heal(p_item bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_hearts int; v_hp int; v_title text; v_cost int;
begin
  select k.hearts, least(k.hearts, coalesce(i.hp, k.hearts)), k.title into v_hearts, v_hp, v_title
    from public.badge_items i join public.badge_kinds k on k.slug = i.kind_slug
   where i.id = p_item and i.owner_id = auth.uid() and i.kind = 'tradable' for update of i;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_yours'); end if;
  if v_hp >= v_hearts then return jsonb_build_object('ok', false, 'code', 'full'); end if;
  -- Not while it's in a battle.
  if exists (select 1 from public.encounters where kind = 'battle' and stage not in ('done', 'off', 'end') and updated_at > now() - interval '20 minutes'
              and (st->'team'->'a' @> to_jsonb(p_item) or st->'team'->'b' @> to_jsonb(p_item))) then
    return jsonb_build_object('ok', false, 'code', 'in_battle'); end if;
  v_cost := 2 * (v_hearts - v_hp);
  if public.cr_balance() < v_cost then return public.cr_short(v_cost); end if;
  perform public.cr_take(v_cost, 'Healed ' || initcap(lower(v_title)), 'heal');
  update public.badge_items set hp = null where id = p_item;
  return jsonb_build_object('ok', true, 'cost', v_cost, 'mana', public.cr_balance());
end;
$$;
revoke all on function public.cr_heal(bigint) from public, anon;
grant execute on function public.cr_heal(bigint) to authenticated;

-- 4. What a main quest gives.
create or replace function public.cr_roll_main_historikal() returns text
language plpgsql volatile security definer set search_path = public as $$
declare v text; v_rar text := case when random() < 0.08 then 'legendary' else 'rare' end;  -- rolled once, then a creature of it
begin
  select slug into v from public.badge_kinds where active and droppable and rarity = v_rar order by random() limit 1;
  return coalesce(v, public.cr_roll_historikal());
end;
$$;
revoke all on function public.cr_roll_main_historikal() from public, anon, authenticated;

-- 5. Battles won, and every tenth bringing a Historikal.
create table if not exists public.battle_results (
  id bigserial primary key,
  winner uuid not null references public.profiles(id) on delete cascade,
  loser uuid not null references public.profiles(id) on delete cascade,
  at timestamptz not null default now()
);
create index if not exists battle_results_winner on public.battle_results (winner);
alter table public.battle_results enable row level security;

create or replace function public.cr_battle_prize(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_won int; v_minted int; v_kind text;
begin
  select count(*) into v_won from public.battle_results where winner = p_user;
  select count(*) into v_minted from public.badge_items where kind = 'tradable' and earned_by = p_user and occasion = 'battle';
  perform set_config('crystr.economy', 'on', true);
  while v_minted < v_won / 10 loop
    v_kind := public.cr_roll_historikal();
    exit when v_kind is null;
    insert into public.badge_items (kind, kind_slug, earned_by, owner_id, occasion) values ('tradable', v_kind, p_user, p_user, 'battle');
    v_minted := v_minted + 1;
  end loop;
end;
$$;
revoke all on function public.cr_battle_prize(uuid) from public, anon, authenticated;

-- 6. Rewrite the pieces that change, from each function's own current definition.
do $do$
declare d text;
begin
  -- helps: every 3; main quests: a rare (or legendary).
  select pg_get_functiondef('public.award_badges(uuid)'::regprocedure) into d;
  d := replace(d, 'v_helped / 10', 'v_helped / 3');
  d := regexp_replace(d, 'v_kind := public\.cr_roll_historikal\(\);(\s+if v_kind is not null then\s+insert into public\.badge_items \(kind, kind_slug, earned_by, owner_id, occasion\)\s+values \(''tradable'', v_kind, p_user, p_user, ''epic''\))',
                      'v_kind := public.cr_roll_main_historikal();\1');
  execute d;

  -- battles: knocked-out creatures can't fight; hearts start where they were; and are written back at the end.
  select pg_get_functiondef('public.cr_enc_tick(bigint)'::regprocedure) into d;
  d := replace(d, 'to_jsonb((public.cr_hk(x::bigint)->>''hearts'')::int)', 'to_jsonb((public.cr_hk(x::bigint)->>''hp'')::int)');
  execute d;

  select pg_get_functiondef('public.cr_enc_act(bigint, jsonb)'::regprocedure) into d;
  d := replace(d, 'and i.kind = ''tradable'' and k.element is not null) <> 3', 'and i.kind = ''tradable'' and k.element is not null and coalesce(i.hp, k.hearts) > 0) <> 3');
  d := replace(d, 'if not (s->''team''->me) @> to_jsonb(it) then return jsonb_build_object(''ok'', false, ''code'', ''not_team''); end if;',
                  'if not (s->''team''->me) @> to_jsonb(it) or (public.cr_hk(it)->>''hp'')::int <= 0 then return jsonb_build_object(''ok'', false, ''code'', ''not_team''); end if;');
  d := replace(d, 'if not (s->''team''->me) @> to_jsonb(it) or it = (s->''pick''->>me)::bigint then',
                  'if not (s->''team''->me) @> to_jsonb(it) or it = (s->''pick''->>me)::bigint or (public.cr_hk(it)->>''hp'')::int <= 0 then');
  d := replace(d, '  update public.encounters set stage = vs, st = s, seq = seq + 1, updated_at = now() where id = p_id;',
$$  -- A fight that ends (or is walked away from) leaves its marks: hearts are written back to each creature.
  if e.kind = 'battle' and e.stage in ('fight', 'replace') and vs in ('end', 'off') then
    foreach sd in array sides loop
      for x in select jsonb_array_elements_text(s->'team'->sd) loop
        update public.badge_items i set hp = case when (s->'hp'->sd->>x)::int >= k.hearts then null else greatest(0, (s->'hp'->sd->>x)::int) end
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
  update public.encounters set stage = vs, st = s, seq = seq + 1, updated_at = now() where id = p_id;$$);
  execute d;
end
$do$;
