-- Not every mythic is a titan: Mr. Hammy is a Hammy with one more heart. Hearts are now set per creature
-- (the roster carries an override; the creature editor has a hearts field), and the mythics that are a
-- regular creature with a heart added get three or four instead of five.
update public.badge_kinds set hearts = 3 where slug in ('mr-hammy', 'mr-rat', 'justababy', 'lil-legs');
update public.badge_kinds set hearts = 4 where slug in ('mr-ghost', 'mr-ghost-sr', 'crystal-spider', 'barbossi', 'girt', 'ol-monarke', 'crystipher', 'bill', 'thagg', 'steve', 'her', 'gottesixe', 'daytona', 'goldy', 'nessie', 'couatl', 'angel', 'genie', 'manticore', 'cosmic-elder', 'dawn-beholder', 'fallen-angel', 'stone-djinn', 'tide-couatl', 'jade-dragon', 'frost-manticore');
update public.badge_items i set hp = least(i.hp, k.hearts) from public.badge_kinds k where k.slug = i.kind_slug and i.kind = 'tradable' and i.hp is not null and i.hp > k.hearts;

do $do$
declare d text; n int;
begin
  select pg_get_functiondef('public.cr_edit_creature'::regproc) into d; n := length(d);
  d := replace(d, $r$hearts = case v_rar when 'common' then 2 when 'uncommon' then 3 when 'rare' then 3 when 'legendary' then 5 else 4 end$r$,
                  $r$hearts = case when (p->>'hearts') ~ '^[1-5]$' then (p->>'hearts')::int else case v_rar when 'common' then 2 when 'uncommon' then 3 when 'rare' then 3 when 'legendary' then 5 else 4 end end$r$);
  if length(d) = n then raise exception 'cr_edit_creature: hearts patch did not apply'; end if;
  execute d;
end
$do$;
