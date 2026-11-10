-- Mythics have five hearts. Every mythic kind goes to five; a copy already held keeps the hearts it had lost
-- (its hp rises by one with the new heart), and the creature editor's rarity-to-hearts rule learns the five.
update public.badge_kinds set hearts = 5 where rarity = 'legendary' and hearts < 5;
update public.badge_items i set hp = i.hp + 1 from public.badge_kinds k where k.slug = i.kind_slug and i.kind = 'tradable' and k.rarity = 'legendary' and i.hp is not null and i.hp < 5;
do $do$
declare d text; n int;
begin
  select pg_get_functiondef('public.cr_edit_creature'::regproc) into d; n := length(d);
  d := replace(d, $r$hearts = case v_rar when 'common' then 2 when 'uncommon' then 3 when 'rare' then 3 else 4 end$r$, $r$hearts = case v_rar when 'common' then 2 when 'uncommon' then 3 when 'rare' then 3 when 'legendary' then 5 else 4 end$r$);
  if length(d) = n then raise exception 'cr_edit_creature: five hearts patch did not apply'; end if;
  execute d;
end
$do$;
