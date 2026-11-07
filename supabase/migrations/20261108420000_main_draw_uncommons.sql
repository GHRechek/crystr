-- A main draw: 5% legendary, 65% rare, 30% uncommon.
create or replace function public.cr_roll_main_historikal() returns text
language plpgsql volatile security definer set search_path = public as $$
declare v text; r float := random();
        v_rar text := case when r < 0.05 then 'legendary' when r < 0.70 then 'rare' else 'uncommon' end;  -- rolled once, then a creature of it
begin
  select slug into v from public.badge_kinds where active and droppable and rarity = v_rar order by random() limit 1;
  return coalesce(v, public.cr_roll_historikal());
end;
$$;
revoke all on function public.cr_roll_main_historikal() from public, anon, authenticated;
