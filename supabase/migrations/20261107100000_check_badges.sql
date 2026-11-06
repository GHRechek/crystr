-- Things that happen to you (being put in someone's Top 5) and slow ones (a day more in the City)
-- had no moment that checked your badges. Now: being added to a Top 5 checks the friend, and
-- cr_check_badges() checks the caller; the app calls it when you open your profile.
create or replace function public.cr_check_badges()
returns integer language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return 0; end if;
  return public.award_badges(auth.uid());
end;
$$;
revoke all on function public.cr_check_badges() from public, anon;
grant execute on function public.cr_check_badges() to authenticated;

create or replace function public.trg_award_top_friend()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  begin perform public.award_badges(new.friend_id);
  exception when others then raise warning 'award_badges failed for %: %', new.friend_id, sqlerrm; end;
  return null;
end;
$$;
drop trigger if exists award_badges_top_friend on public.top_friends;
create trigger award_badges_top_friend after insert on public.top_friends
  for each row execute function public.trg_award_top_friend();
