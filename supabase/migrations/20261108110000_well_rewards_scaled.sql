-- The Well gives back somewhere between the old amounts and the scaled-down ones (max mana now starts
-- at 15): poem 12 to 9, photo 15 to 11, sit still 8 to 6, compliment 10 to 7, draw 14 to 10.
update public.quests set reward = case slug when 'poem' then 9 when 'photo' then 11 when 'still' then 6 when 'compliment' then 7 when 'draw' then 10 else reward end;

-- Every day at sunrise (6 am US Eastern standard time, the same moment mana is written down for
-- Brimming) everyone who has registered gets 4 mana back, up to their ceiling; then the dawn
-- snapshot and badge check run, so the snapshot sees the mana after the gift.
create or replace function public.cr_dawn_snapshot()
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  perform set_config('crystr.economy', 'on', true);
  with up as (
    update public.profiles p set mana = least(p.mana_cap, p.mana + 4), updated_at = now()
      from (select id, mana from public.profiles where onboarded and mana < mana_cap for update) old
     where p.id = old.id
    returning p.id, p.mana - old.mana as gain
  )
  insert into public.mana_ledger (user_id, amount, reason, kind)
  select id, gain, 'Sunrise', 'trickle' from up where gain > 0;

  insert into public.mana_dawn (user_id, day, mana, cap)
  select id, (now() at time zone 'America/New_York')::date, mana, mana_cap from public.profiles
  on conflict do nothing;
  for r in select id from public.profiles loop
    begin perform public.award_badges(r.id);
    exception when others then raise warning 'award_badges failed for %: %', r.id, sqlerrm; end;
  end loop;
end;
$$;
revoke all on function public.cr_dawn_snapshot() from public, anon, authenticated;
