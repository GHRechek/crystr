-- Main draws (always rare, 5% legendary) for main quests and for every 3 people helped; a normal draw for every 5 battles won.
create or replace function public.cr_roll_main_historikal() returns text
language plpgsql volatile security definer set search_path = public as $$
declare v text; v_rar text := case when random() < 0.05 then 'legendary' else 'rare' end;  -- rolled once, then a creature of it
begin
  select slug into v from public.badge_kinds where active and droppable and rarity = v_rar order by random() limit 1;
  return coalesce(v, public.cr_roll_historikal());
end;
$$;
revoke all on function public.cr_roll_main_historikal() from public, anon, authenticated;

do $do$
declare d text;
begin
  select pg_get_functiondef('public.award_badges(uuid)'::regprocedure) into d;
  d := replace(d, 'v_kind := public.cr_roll_historikal();', 'v_kind := public.cr_roll_main_historikal();');
  execute d;
  select pg_get_functiondef('public.cr_battle_prize(uuid)'::regprocedure) into d;
  d := replace(d, 'v_won / 10', 'v_won / 5');
  execute d;
end
$do$;
