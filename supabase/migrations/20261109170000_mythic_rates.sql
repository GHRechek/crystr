-- The top rarity is called Mythic on screen (its key stays 'legendary' in the data), and the odds follow
-- the new pyramid of creatures. Finding one: common 59.98%, uncommon 27%, rare 9%, epic 4%, mythic 0.02%.
-- Summoning one: uncommon 34.9%, rare 50%, epic 15%, mythic 0.1%.
update public.badge_kinds set blurb = replace(blurb, 'A legendary ', 'A mythic ') where rarity = 'legendary' and blurb like 'A legendary %';

create or replace function public.cr_roll_historikal() returns text
language plpgsql security definer set search_path = public as $$
declare r float := random(); v_rar text; v text;
begin
  v_rar := case when r < 0.0002 then 'legendary' when r < 0.0402 then 'epic' when r < 0.1302 then 'rare' when r < 0.4002 then 'uncommon' else 'common' end;
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
        v_rar text := case when r < 0.001 then 'legendary' when r < 0.151 then 'epic' when r < 0.651 then 'rare' else 'uncommon' end;
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
