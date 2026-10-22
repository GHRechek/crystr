-- Audit items 7, 8, 10 and 11.
--
-- 7. Every free-text profile field is capped at 40 characters (the handle, at 15, is
--    held by check_handle). Existing rows were all within 40.
-- 8. Nobody can insert their own profile row through the API any more. Profiles are
--    created only by the sign-in trigger (handle_new_user, security definer), so the
--    guard on mana / witch status, which only runs on updates, cannot be sidestepped
--    by inserting a row with chosen values. (The policy is narrowed to "never" rather
--    than dropped; it can be dropped by hand in the SQL editor.)
-- 10. Deleting a person no longer fails because of wiki and article links. Those links go
--    to null ("someone who has left") so the lore they wrote stays.
-- 11. A bug in a badge rule can no longer break posting, whispering or voting: the badge
--    check runs inside its own error trap and only logs a warning. And SHOW AND TELL
--    now needs a picture that really exists (an uploaded image), not a ticked box.

alter table public.profiles
  add constraint profiles_display_name_len check (char_length(display_name) <= 40),
  add constraint profiles_bio_len          check (char_length(bio) <= 40),
  add constraint profiles_likes_len        check (char_length(likes) <= 40),
  add constraint profiles_dislikes_len     check (char_length(dislikes) <= 40),
  add constraint profiles_food_len         check (char_length(food) <= 40),
  add constraint profiles_obsession_len    check (char_length(obsession) <= 40),
  add constraint profiles_mood_len         check (char_length(mood) <= 40);

alter policy "Users can insert their own profile" on public.profiles with check (false);
revoke insert on public.profiles from anon, authenticated;

create or replace function public.trg_award_badges()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_user uuid;
begin
  v_user := nullif(to_jsonb(new) ->> (case tg_table_name
    when 'posts'        then 'author_id'
    when 'dm_messages'  then 'sender_id'
    else 'user_id'
  end), '')::uuid;
  if v_user is not null then
    begin
      perform public.award_badges(v_user);
    exception when others then
      raise warning 'award_badges failed for %: %', v_user, sqlerrm;
    end;
  end if;
  return null;
end;
$$;

create or replace function public.award_badges(p_user uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare b record; ok boolean; n int := 0;
begin
  for b in select slug from public.badges where active loop
    if exists (select 1 from public.user_badges where user_id = p_user and badge_slug = b.slug) then
      continue;
    end if;

    ok := case b.slug
      when 'first-words' then
        exists (select 1 from public.posts where author_id = p_user and parent_id is null)
      when 'show-and-tell' then
        exists (select 1 from public.posts where author_id = p_user and has_image and image_url is not null)
      when 'joined-in' then
        (select count(distinct r.parent_id)
           from public.posts r
           join public.posts root on root.id = r.parent_id
          where r.author_id = p_user and r.parent_id is not null
            and root.author_id <> p_user) >= 5
      when 'whisper-web' then
        (select count(distinct case when t.user_a = p_user then t.user_b else t.user_a end)
           from public.dm_threads t
          where (t.user_a = p_user or t.user_b = p_user)
            and exists (select 1 from public.dm_messages m
                         where m.thread_id = t.id and m.sender_id = p_user)) >= 5
      when 'a-voice-in-council' then
        (select count(*) from public.motion_votes where user_id = p_user) >= 10
      when 'meet-in-person' then
        exists (select 1 from public.vouches
                 where kind = 'meetup' and status = 'confirmed'
                   and (claimant = p_user or other = p_user))
      when 'a-helping-hand' then
        exists (select 1 from public.vouches
                 where kind = 'helped' and status = 'confirmed' and claimant = p_user)
      when 'registered-plaintiff' then
        exists (select 1 from public.plaintiffs where user_id = p_user)
      else false
    end;

    if ok then
      insert into public.user_badges (user_id, badge_slug) values (p_user, b.slug)
        on conflict do nothing;
      n := n + 1;
    end if;
  end loop;
  return n;
end;
$$;

-- 10: who wrote or reviewed something becomes null when that person is deleted.
alter table public.wiki_pages alter column created_by drop not null, alter column updated_by drop not null;
alter table public.wiki_facts alter column author drop not null;

alter table public.wiki_pages drop constraint wiki_pages_created_by_fkey,
  add constraint wiki_pages_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null;
alter table public.wiki_pages drop constraint wiki_pages_updated_by_fkey,
  add constraint wiki_pages_updated_by_fkey foreign key (updated_by) references public.profiles(id) on delete set null;
alter table public.wiki_facts drop constraint wiki_facts_author_fkey,
  add constraint wiki_facts_author_fkey foreign key (author) references public.profiles(id) on delete set null;
alter table public.wiki_facts drop constraint wiki_facts_reviewed_by_fkey,
  add constraint wiki_facts_reviewed_by_fkey foreign key (reviewed_by) references public.profiles(id) on delete set null;
alter table public.articles drop constraint articles_reviewed_by_fkey,
  add constraint articles_reviewed_by_fkey foreign key (reviewed_by) references public.profiles(id) on delete set null;
