-- The six copies people still held of creatures that left the roster become their nearest new creature, of
-- the same rarity. Each copy keeps its id, hearts, lineup place and where it came from; only what it is changes.
-- The Jade Dragon becomes Ancient Wyrm, which rolls its type: this one is Nature, as the Jade Dragon was.
update public.badge_items set kind_slug = 'wood-elf' where kind = 'tradable' and kind_slug = 'rogue';
update public.badge_items set kind_slug = 'footman' where kind = 'tradable' and kind_slug = 'warrior';
update public.badge_items set kind_slug = 'storm-eagle' where kind = 'tradable' and kind_slug = 'brown-owl';
update public.badge_items set kind_slug = 'blood-fiend' where kind = 'tradable' and kind_slug = 'marilith';
update public.badge_items set kind_slug = 'shadow-wyvern' where kind = 'tradable' and kind_slug = 'wyvern';
update public.badge_items set kind_slug = 'red-dragon', rolled = 'nature' where kind = 'tradable' and kind_slug = 'jade-dragon';

-- Legendaries turn up half as often. Finding one: common 59%, uncommon 25%, rare 11%, epic 4%, legendary 1%.
create or replace function public.cr_roll_historikal() returns text
language plpgsql security definer set search_path = public as $$
declare r float := random(); v_rar text; v text;
begin
  v_rar := case when r < 0.01 then 'legendary' when r < 0.05 then 'epic' when r < 0.16 then 'rare' when r < 0.41 then 'uncommon' else 'common' end;
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

-- Summoning one (main quests): legendary 2%, epic 10%, rare 58%, uncommon 30%.
create or replace function public.cr_roll_main_historikal() returns text
language plpgsql security definer set search_path = public as $$
declare v text; r float := random();
        v_rar text := case when r < 0.02 then 'legendary' when r < 0.12 then 'epic' when r < 0.70 then 'rare' else 'uncommon' end;
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
