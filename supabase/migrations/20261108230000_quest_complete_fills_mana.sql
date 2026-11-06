-- Earning a badge (finishing a quest or an epic quest) fills mana to the ceiling. The trigger is named
-- z_… so it fires after the cap recount. The epic quests others confirm lead the picker.
create or replace function public.trg_badge_fills_mana()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_old int; v_cap int;
begin
  select mana, mana_cap into v_old, v_cap from public.profiles where id = new.user_id and onboarded;
  if not found or v_old >= v_cap then return null; end if;
  perform set_config('crystr.economy', 'on', true);
  update public.profiles set mana = mana_cap, updated_at = now() where id = new.user_id;
  insert into public.mana_ledger (user_id, amount, reason, kind)
  values (new.user_id, v_cap - v_old, 'Quest completed', 'quest');
  return null;
end;
$$;
drop trigger if exists z_badge_fills_mana on public.user_badges;
create trigger z_badge_fills_mana after insert on public.user_badges
  for each row execute function public.trg_badge_fills_mana();

update public.badges set sort = case slug when 'make-friends' then -6 when 'culture-five' then -5 when 'cast-five-spells' then -4 when 'brew-five-potions' then -3 when 'workshops-five' then -2 when 'support-groups-five' then -1 end
 where slug in ('make-friends','culture-five','cast-five-spells','brew-five-potions','workshops-five','support-groups-five');
