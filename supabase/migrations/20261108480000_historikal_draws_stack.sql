-- Historikals aren't handed out any more: draws are. They stack up, and you open them yourself from the
-- Historikals menu, a chest at a time: FIND ONE! for a normal draw (60% common, 25% uncommon, 12% rare,
-- 3% legendary), SUMMON ONE! for a main draw (30% uncommon, 65% rare, 5% legendary).
--   main quest finished  -> a main draw      every 3 confirmed helps -> a main draw
--   every 5 battles won  -> a normal draw    your birthday           -> a normal draw

create table if not exists public.historikal_draws (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('normal', 'main')),
  source text not null check (source in ('quest', 'helped', 'battle', 'birthday', 'gift')),
  created_at timestamptz not null default now(),
  used_at timestamptz,
  item bigint
);
create index if not exists historikal_draws_open on public.historikal_draws (user_id, kind) where used_at is null;
create index if not exists historikal_draws_source on public.historikal_draws (user_id, source);
alter table public.historikal_draws enable row level security;

-- How many you have waiting, of each kind.
create or replace function public.cr_draws_open() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'normal', (select count(*) from public.historikal_draws where user_id = auth.uid() and kind = 'normal' and used_at is null),
    'main', (select count(*) from public.historikal_draws where user_id = auth.uid() and kind = 'main' and used_at is null));
$$;

-- Open one: rolls the rarity for its kind, and the creature is yours.
create or replace function public.cr_draw(p_kind text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_draw public.historikal_draws; v_slug text; it bigint;
begin
  if auth.uid() is null or p_kind not in ('normal', 'main') then return jsonb_build_object('ok', false, 'code', 'bad'); end if;
  select * into v_draw from public.historikal_draws where user_id = auth.uid() and kind = p_kind and used_at is null order by id limit 1 for update skip locked;
  if not found then return jsonb_build_object('ok', false, 'code', 'none'); end if;
  v_slug := case when p_kind = 'main' then public.cr_roll_main_historikal() else public.cr_roll_historikal() end;
  if v_slug is null then return jsonb_build_object('ok', false, 'code', 'no_kinds'); end if;
  perform set_config('crystr.economy', 'on', true);
  insert into public.badge_items (kind, kind_slug, earned_by, owner_id, occasion, seen)
  values ('tradable', v_slug, auth.uid(), auth.uid(),
          case v_draw.source when 'quest' then 'epic' when 'gift' then 'pick' else v_draw.source end, true)
  returning id into it;
  update public.historikal_draws set used_at = now(), item = it where id = v_draw.id;
  return jsonb_build_object('ok', true, 'hk', public.cr_hk(it)) || public.cr_draws_open();
end;
$$;
revoke all on function public.cr_draws_open(), public.cr_draw(text) from public, anon;
grant execute on function public.cr_draws_open(), public.cr_draw(text) to authenticated;

-- Battles: every fifth win is a normal draw. Counted against the Historikals already given for wins
-- before draws existed, so nobody is owed one twice.
create or replace function public.cr_battle_prize(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_won int; v_given int;
begin
  select count(*) into v_won from public.battle_results where winner = p_user;
  select (select count(*) from public.historikal_draws where user_id = p_user and source = 'battle')
       + (select count(*) from public.badge_items i where i.kind = 'tradable' and i.earned_by = p_user and i.occasion = 'battle'
           and not exists (select 1 from public.historikal_draws d where d.item = i.id))
    into v_given;
  while v_given < v_won / 5 loop
    insert into public.historikal_draws (user_id, kind, source) values (p_user, 'normal', 'battle');
    v_given := v_given + 1;
  end loop;
end;
$$;

-- Birthdays: a normal draw.
create or replace function public.cr_birthday_badge() returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_bday date; v_last int; v_on boolean; v_year int := extract(year from current_date)::int;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  select birthday, birthday_badge_year, onboarded into v_bday, v_last, v_on from public.profiles where id = auth.uid();
  if not found or v_bday is null or not v_on then return jsonb_build_object('ok', true, 'given', false); end if;
  if v_last is not null and v_last >= v_year then return jsonb_build_object('ok', true, 'given', false); end if;
  if public.birthday_in(v_bday, v_year) > current_date then return jsonb_build_object('ok', true, 'given', false); end if;
  insert into public.historikal_draws (user_id, kind, source) values (auth.uid(), 'normal', 'birthday');
  update public.profiles set birthday_badge_year = v_year, updated_at = now() where id = auth.uid();
  return jsonb_build_object('ok', true, 'given', true, 'draw', true, 'year', v_year);
end;
$$;

-- Main quests and helps: main draws.
do $do$
declare d text; n int;
begin
  select pg_get_functiondef('public.award_badges(uuid)'::regprocedure) into d;
  n := length(d);
  d := regexp_replace(d, 'v_kind := public\.cr_roll_main_historikal\(\);\s*if v_kind is not null then\s*insert into public\.badge_items \(kind, kind_slug, earned_by, owner_id, occasion\)\s*values \(''tradable'', v_kind, p_user, p_user, ''epic''\);\s*n := n \+ 1;\s*end if;',
                      'insert into public.historikal_draws (user_id, kind, source) values (p_user, ''main'', ''quest''); n := n + 1;');
  if length(d) = n then raise exception 'award_badges: main quest patch did not apply'; end if;
  n := length(d);
  d := regexp_replace(d, 'select count\(\*\) into v_minted from public\.badge_items where kind = ''tradable'' and earned_by = p_user and occasion = ''helped'';',
                      'select (select count(*) from public.historikal_draws where user_id = p_user and source = ''helped'') + (select count(*) from public.badge_items i where i.kind = ''tradable'' and i.earned_by = p_user and i.occasion = ''helped'' and not exists (select 1 from public.historikal_draws hd where hd.item = i.id)) into v_minted;');
  if length(d) = n then raise exception 'award_badges: helped count patch did not apply'; end if;
  n := length(d);
  d := regexp_replace(d, 'v_kind := public\.cr_roll_main_historikal\(\);\s*exit when v_kind is null;\s*insert into public\.badge_items \(kind, kind_slug, earned_by, owner_id, occasion\)\s*values \(''tradable'', v_kind, p_user, p_user, ''helped''\);',
                      'insert into public.historikal_draws (user_id, kind, source) values (p_user, ''main'', ''helped'');');
  if length(d) = n then raise exception 'award_badges: helped draw patch did not apply'; end if;
  execute d;
end
$do$;
