-- The new first-five badges were only checked when something else awarded badges, so asking for
-- help, answering a quest and publishing an op-ed never crossed anything off. Check on each.
create or replace function public.trg_award_badges_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if nullif(btrim(coalesce(new.mood, '')), '') is not null then
    begin perform public.award_badges(new.id);
    exception when others then raise warning 'award_badges failed for %: %', new.id, sqlerrm; end;
  end if;
  return null;
end;
$$;
drop trigger if exists award_badges_mood on public.profiles;
create trigger award_badges_mood after update of mood on public.profiles
  for each row execute function public.trg_award_badges_profile();

create or replace function public.trg_award_badges_article()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'published' and new.author_id is not null then
    begin perform public.award_badges(new.author_id);
    exception when others then raise warning 'award_badges failed for %: %', new.author_id, sqlerrm; end;
  end if;
  return null;
end;
$$;
drop trigger if exists award_badges_articles on public.articles;
create trigger award_badges_articles after insert or update of status on public.articles
  for each row execute function public.trg_award_badges_article();

drop trigger if exists award_badges_quests on public.quest_submissions;
create trigger award_badges_quests after insert on public.quest_submissions
  for each row execute function public.trg_award_badges();

-- Catch up everyone who already did these.
select public.award_badges(id) from public.profiles;
