-- Epics less often. Finding one: common 60.98%, uncommon 28%, rare 9%, epic 2%, mythic 0.02%.
-- Summoning one: uncommon 37.9%, rare 54%, epic 8%, mythic 0.1%.
create or replace function public.cr_roll_historikal() returns text
language plpgsql security definer set search_path = public as $$
declare r float := random(); v_rar text; v text;
begin
  v_rar := case when r < 0.0002 then 'legendary' when r < 0.0202 then 'epic' when r < 0.1102 then 'rare' when r < 0.3902 then 'uncommon' else 'common' end;
  if v_rar = 'legendary' then
    select slug into v from public.badge_kinds where active and droppable and rarity = 'legendary' and not public.cr_legendary_taken(slug) order by random() limit 1;
    if v is null then v_rar := 'epic'; end if;
  end if;
  if v is null then select slug into v from public.badge_kinds where active and droppable and rarity = v_rar order by random() limit 1; end if;
  if v is null then select slug into v from public.badge_kinds where active and droppable and rarity <> 'legendary' order by random() limit 1; end if;
  return v;
end;
$$;
revoke all on function public.cr_roll_historikal() from public, anon, authenticated;

create or replace function public.cr_roll_main_historikal() returns text
language plpgsql security definer set search_path = public as $$
declare v text; r float := random();
        v_rar text := case when r < 0.001 then 'legendary' when r < 0.081 then 'epic' when r < 0.621 then 'rare' else 'uncommon' end;
begin
  if v_rar = 'legendary' then
    select slug into v from public.badge_kinds where active and droppable and rarity = 'legendary' and not public.cr_legendary_taken(slug) order by random() limit 1;
    if v is null then v_rar := 'epic'; end if;
  end if;
  if v is null then select slug into v from public.badge_kinds where active and droppable and rarity = v_rar order by random() limit 1; end if;
  return coalesce(v, public.cr_roll_historikal());
end;
$$;
revoke all on function public.cr_roll_main_historikal() from public, anon, authenticated;
