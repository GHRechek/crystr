-- More long-term goals, streak-based changes, and a progress readout for goals.
--  On a Roll: post on five days in a row (then ten, thirty).  Kind Word: like a post on five days in a row.
--  Brimming: be at full mana at 6 am, five days in a row.
-- Nine new goals. cr_goal_progress() says how far along each goal is, for "3/5" on the profile.
create or replace function public.cr_metric_x(p_user uuid, p_metric text)
returns bigint language plpgsql stable security definer set search_path = public as $$
declare v bigint := 0;
begin
  case p_metric
    when 'image_posts' then select count(*) into v from public.posts where author_id = p_user and has_image;
    when 'profile_fields' then
      select (case when char_length(btrim(coalesce(bio, ''))) > 0 then 1 else 0 end
            + case when char_length(btrim(coalesce(likes, ''))) > 0 then 1 else 0 end
            + case when char_length(btrim(coalesce(dislikes, ''))) > 0 then 1 else 0 end
            + case when char_length(btrim(coalesce(food, ''))) > 0 then 1 else 0 end
            + case when char_length(btrim(coalesce(obsession, ''))) > 0 then 1 else 0 end
            + case when birthday is not null then 1 else 0 end) into v from public.profiles where id = p_user;
    when 'token_stage' then
      select (case when exists (select 1 from public.tokens where user_id = p_user) then 1 else 0 end
            + case when exists (select 1 from public.tokens where user_id = p_user and nullif(btrim(coalesce(how, '')), '') is not null) then 1 else 0 end
            + case when exists (select 1 from public.tokens where user_id = p_user and last_given_at is not null) then 1 else 0 end) into v;
    when 'dawn_streak' then
      select coalesce(max(c), 0) into v from (
        select count(*) c from (
          select day, day - (row_number() over (order by day))::int as grp
            from public.mana_dawn where user_id = p_user and mana >= 15
        ) g group by grp) x;
    when 'dawn_full' then
      select coalesce(max(c), 0) into v from (
        select count(*) c from (
          select day, day - (row_number() over (order by day))::int as grp
            from public.mana_dawn where user_id = p_user and cap > 0 and mana >= cap
        ) g group by grp) x;
    when 'like_streak' then
      select coalesce(max(c), 0) into v from (
        select count(*) c from (
          select dd, dd - (row_number() over (order by dd))::int as grp
            from (select distinct created_at::date dd from public.post_likes where user_id = p_user) d
        ) g group by grp) x;
    when 'reply_streak' then
      select coalesce(max(c), 0) into v from (
        select count(*) c from (
          select dd, dd - (row_number() over (order by dd))::int as grp
            from (select distinct created_at::date dd from public.posts where author_id = p_user and parent_id is not null) d
        ) g group by grp) x;
    when 'whisper_streak' then
      select coalesce(max(c), 0) into v from (
        select count(*) c from (
          select dd, dd - (row_number() over (order by dd))::int as grp
            from (select distinct created_at::date dd from public.dm_messages where sender_id = p_user and deleted_at is null) d
        ) g group by grp) x;
    when 'quest_days' then select count(distinct created_at::date) into v from public.quest_submissions where user_id = p_user;
    when 'whisper_thread_max' then
      select coalesce(max(c), 0) into v from (
        select count(*) c from public.dm_messages m join public.dm_threads t on t.id = m.thread_id
         where (t.user_a = p_user or t.user_b = p_user) and m.deleted_at is null group by m.thread_id) x;
    when 'helps_days' then
      select count(distinct answered_at::date) into v from public.vouches
       where kind = 'helped' and status = 'confirmed' and claimant = p_user and answered_at is not null;
    when 'replies_people' then
      select count(distinct root.author_id) into v from public.posts r join public.posts root on root.id = r.parent_id
       where r.author_id = p_user and root.author_id <> p_user;
    when 'likes_people' then
      select count(distinct p.author_id) into v from public.post_likes l join public.posts p on p.id = l.post_id
       where l.user_id = p_user and p.author_id <> p_user;
    when 'starters' then
      select count(*) into v from (
        select r.parent_id from public.posts r join public.posts root on root.id = r.parent_id
         where root.author_id = p_user and r.author_id <> p_user group by r.parent_id having count(*) >= 3) x;
    else v := 0;
  end case;
  return coalesce(v, 0);
end;
$$;
revoke all on function public.cr_metric_x(uuid, text) from public, anon, authenticated;

create or replace function public.cr_metric_all(p_user uuid, p_metric text)
returns bigint language sql stable security definer set search_path = public as $$
  select case when p_metric in ('image_posts', 'profile_fields', 'token_stage', 'dawn_streak', 'dawn_full', 'like_streak',
                                'reply_streak', 'whisper_streak', 'quest_days', 'whisper_thread_max', 'helps_days',
                                'replies_people', 'likes_people', 'starters')
              then public.cr_metric_x(p_user, p_metric) else public.cr_metric(p_user, p_metric) end;
$$;
revoke all on function public.cr_metric_all(uuid, text) from public, anon, authenticated;

update public.badges set steps = array[5,10,30], tiers = 3, metric = 'post_streak', threshold = null,
       how = 'Post on five days in a row.', blurb = 'Posted days running.' where slug = 'three-days';
update public.badges set metric = 'like_streak', steps = null, tiers = 1, threshold = 5,
       how = 'Like a post on five days in a row.', blurb = 'Liked a post five days running.' where slug = 'first-like-given';
update public.badges set metric = 'dawn_full', steps = null, tiers = 1, threshold = 5,
       how = 'Be at full mana at 6 am, five days in a row.', blurb = 'Was at full mana at dawn five days running.' where slug = 'full-well';

insert into public.badges (slug, title, how, blurb, art, sort, active, witch_approved, kind, metric, threshold) values
  ('picture-wall', 'Picture Wall', 'Post pictures on five different days.', 'Posted pictures on five different days.', 'set/116.png', 300, true, false, 'goal', 'image_days', 5),
  ('well-regular', 'Well Regular', 'Answer a quest on five different days.', 'Answered quests on five different days.', 'set/169.png', 301, true, false, 'goal', 'quest_days', 5),
  ('daily-whisper', 'Daily Whisper', 'Send a whisper on five days in a row.', 'Whispered five days running.', 'set/117.png', 302, true, false, 'goal', 'whisper_streak', 5),
  ('pen-pal', 'Pen Pal', 'Trade twenty whispers with one person.', 'Traded twenty whispers with one person.', 'set/149.png', 303, true, false, 'goal', 'whisper_thread_max', 20),
  ('open-hand', 'Open Hand', 'Help someone on five different days.', 'Helped people on five different days.', 'set/103.png', 304, true, false, 'goal', 'helps_days', 5),
  ('town-talk', 'Town Talk', 'Reply to ten different people.', 'Replied to ten different people.', 'set/115.png', 305, true, false, 'goal', 'replies_people', 10),
  ('spread-the-love', 'Spread the Love', 'Like posts from ten different people.', 'Liked posts from ten different people.', 'set/131.png', 306, true, false, 'goal', 'likes_people', 10),
  ('conversation-starter', 'Conversation Starter', 'Write three posts that each get three replies.', 'Started three conversations.', 'set/112.png', 307, true, false, 'goal', 'starters', 3),
  ('keep-talking', 'Keep Talking', 'Reply on five days in a row.', 'Replied five days running.', 'set/99.png', 308, true, false, 'goal', 'reply_streak', 5)
on conflict (slug) do nothing;

create or replace function public.cr_goal_progress()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare out jsonb := '{}'::jsonb; b record; n bigint; u uuid := auth.uid();
begin
  if u is null then return out; end if;
  for b in select slug, metric from public.badges where kind = 'goal' and active loop
    n := case
      when b.metric is not null then public.cr_metric_all(u, b.metric)
      when b.slug = 'joined-in' then
        (select count(distinct r.parent_id) from public.posts r join public.posts root on root.id = r.parent_id
          where r.author_id = u and r.parent_id is not null and root.author_id <> u)
      when b.slug = 'whisper-web' then
        (select count(distinct case when t.user_a = u then t.user_b else t.user_a end) from public.dm_threads t
          where (t.user_a = u or t.user_b = u)
            and exists (select 1 from public.dm_messages m where m.thread_id = t.id and m.sender_id = u))
      when b.slug = 'a-voice-in-council' then (select count(*) from public.motion_votes where user_id = u)
      else 0 end;
    out := out || jsonb_build_object(b.slug, coalesce(n, 0));
  end loop;
  return out;
end;
$$;
revoke all on function public.cr_goal_progress() from public, anon;
grant execute on function public.cr_goal_progress() to authenticated;

select public.award_badges(id) from public.profiles;
