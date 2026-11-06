-- Max mana starts at 15, not 40: 15, plus 1 for every badge earned, plus 2 for every tradable badge
-- held, plus 7 for every token held. Everyone is recounted (mana above the new ceiling is lost).
create or replace function public.cr_recount_cap(p_user uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare v_on boolean; v_cap int;
begin
  select onboarded into v_on from public.profiles where id = p_user;
  if not found then return null; end if;
  if not v_on then
    v_cap := 10;
  else
    v_cap := 15
      + (select count(*) from public.user_badges where user_id = p_user)
      + (select coalesce(sum(case kind when 'tradable' then 2 when 'token' then 7 else 0 end), 0)
           from public.badge_items where owner_id = p_user);
  end if;
  perform set_config('crystr.economy', 'on', true);
  update public.profiles
     set mana_cap = v_cap, mana = least(mana, v_cap), updated_at = now()
   where id = p_user and (mana_cap <> v_cap or mana > v_cap);
  return v_cap;
end;
$$;
select public.cr_recount_cap(id) from public.profiles;
