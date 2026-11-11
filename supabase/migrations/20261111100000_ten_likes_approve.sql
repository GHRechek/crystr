-- A quest post with ten likes counts as approved, no witch needed. The author's own like does
-- not count. A post is approved once, by whichever comes first (a witch's like or the tenth like),
-- so later likes never pay it out again.
alter table public.posts add column if not exists approved_at timestamptz;
alter table public.quest_repeats drop constraint if exists quest_repeats_via_check;
alter table public.quest_repeats add constraint quest_repeats_via_check check (via in ('witch', 'scan', 'grant', 'likes'));

create or replace function public.trg_badge_request_liked() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_author uuid; v_badge text; v_done timestamptz; v_via text;
begin
  select author_id, badge_slug, approved_at into v_author, v_badge, v_done from public.posts where id = new.post_id;
  if v_badge is null or v_author is null or v_author = new.user_id or v_done is not null then return new; end if;
  if not exists (select 1 from public.badges where slug = v_badge and active and witch_approved) then return new; end if;
  if exists (select 1 from public.profiles where id = new.user_id and is_witch) then
    v_via := 'witch';
  elsif (select count(*) from public.post_likes where post_id = new.post_id and user_id <> v_author) >= 10 then
    v_via := 'likes';
  else
    return new;
  end if;
  update public.posts set approved_at = now() where id = new.post_id;
  perform public.cr_quest_done(v_author, v_badge, v_via);
  begin perform public.award_badges(v_author);
  exception when others then raise warning 'award_badges failed: %', sqlerrm; end;
  return new;
end;
$$;
