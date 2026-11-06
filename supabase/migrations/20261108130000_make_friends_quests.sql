-- Make Friends (epic quest) counts the "make friends with a ..." quests you finish, of any kind: each one
-- someone has said yes to since you picked it. Five of them.
create or replace function public.cr_goal_count(p_user uuid, p_slug text, p_since timestamptz)
returns bigint language plpgsql stable security definer set search_path = public as $$
declare v bigint := 0;
begin
  case p_slug
    when 'first-words' then
      select count(*) into v from public.posts where author_id = p_user and parent_id is null and created_at >= p_since;
    when 'show-and-tell' then
      select count(*) into v from public.posts where author_id = p_user and has_image and created_at >= p_since;
    when 'three-days' then
      select coalesce(max(c), 0) into v from (
        select count(*) c from (
          select dd, dd - (row_number() over (order by dd))::int as grp
            from (select distinct created_at::date dd from public.posts where author_id = p_user and created_at >= p_since) d
        ) g group by grp) x;
    when 'first-like-given' then
      select coalesce(max(c), 0) into v from (
        select count(*) c from (
          select dd, dd - (row_number() over (order by dd))::int as grp
            from (select distinct created_at::date dd from public.post_likes where user_id = p_user and created_at >= p_since) d
        ) g group by grp) x;
    when 'first-like-got' then
      select coalesce(max(c), 0) into v from (
        select count(*) c from public.post_likes l join public.posts p on p.id = l.post_id
         where p.author_id = p_user and l.user_id <> p_user and l.created_at >= p_since group by l.post_id) x;
    when 'got-replied' then
      select coalesce(max(c), 0) into v from (
        select count(*) c from public.posts r join public.posts root on root.id = r.parent_id
         where root.author_id = p_user and r.author_id <> p_user and r.created_at >= p_since group by r.parent_id) x;
    when 'a-helping-hand' then
      select count(distinct other) into v from public.vouches
       where kind = 'helped' and status = 'confirmed' and claimant = p_user and answered_at >= p_since;
    when 'meet-in-person' then
      select count(distinct case when claimant = p_user then other else claimant end) into v from public.vouches
       where kind = 'meetup' and status = 'confirmed' and (claimant = p_user or other = p_user) and answered_at >= p_since;
    when 'full-well' then
      select coalesce(max(c), 0) into v from (
        select count(*) c from (
          select day, day - (row_number() over (order by day))::int as grp
            from public.mana_dawn where user_id = p_user and cap > 0 and mana >= cap and day >= p_since::date
        ) g group by grp) x;
    when 'picture-wall' then
      select count(distinct created_at::date) into v from public.posts where author_id = p_user and has_image and created_at >= p_since;
    when 'well-regular' then
      select count(distinct created_at::date) into v from public.quest_submissions where user_id = p_user and created_at >= p_since;
    when 'daily-whisper' then
      select coalesce(max(c), 0) into v from (
        select count(*) c from (
          select dd, dd - (row_number() over (order by dd))::int as grp
            from (select distinct created_at::date dd from public.dm_messages
                   where sender_id = p_user and deleted_at is null and created_at >= p_since) d
        ) g group by grp) x;
    when 'pen-pal' then
      select coalesce(max(c), 0) into v from (
        select count(*) c from public.dm_messages m join public.dm_threads t on t.id = m.thread_id
         where (t.user_a = p_user or t.user_b = p_user) and m.deleted_at is null and m.created_at >= p_since
         group by m.thread_id) x;
    when 'open-hand' then
      select count(distinct answered_at::date) into v from public.vouches
       where kind = 'helped' and status = 'confirmed' and claimant = p_user and answered_at >= p_since;
    when 'town-talk' then
      select count(distinct root.author_id) into v from public.posts r join public.posts root on root.id = r.parent_id
       where r.author_id = p_user and root.author_id <> p_user and r.created_at >= p_since;
    when 'spread-the-love' then
      select count(distinct p.author_id) into v from public.post_likes l join public.posts p on p.id = l.post_id
       where l.user_id = p_user and p.author_id <> p_user and l.created_at >= p_since;
    when 'conversation-starter' then
      select count(*) into v from (
        select r.parent_id from public.posts r join public.posts root on root.id = r.parent_id
         where root.author_id = p_user and root.created_at >= p_since and r.author_id <> p_user
         group by r.parent_id having count(*) >= 3) x;
    when 'keep-talking' then
      select coalesce(max(c), 0) into v from (
        select count(*) c from (
          select dd, dd - (row_number() over (order by dd))::int as grp
            from (select distinct created_at::date dd from public.posts
                   where author_id = p_user and parent_id is not null and created_at >= p_since) d
        ) g group by grp) x;
    when 'joined-in' then
      select count(distinct r.parent_id) into v from public.posts r join public.posts root on root.id = r.parent_id
       where r.author_id = p_user and r.parent_id is not null and root.author_id <> p_user and r.created_at >= p_since;
    when 'whisper-web' then
      select count(distinct case when t.user_a = p_user then t.user_b else t.user_a end) into v from public.dm_threads t
       where (t.user_a = p_user or t.user_b = p_user)
         and exists (select 1 from public.dm_messages m where m.thread_id = t.id and m.sender_id = p_user and m.created_at >= p_since);
    when 'a-voice-in-council' then
      select count(*) into v from public.motion_votes where user_id = p_user and created_at >= p_since;
    when 'make-friends' then
      select count(distinct badge_slug) into v from public.badge_claims
       where claimant = p_user and status = 'confirmed' and answered_at >= p_since;
    else v := 0;
  end case;
  return coalesce(v, 0);
end;
$$;
revoke all on function public.cr_goal_count(uuid, text, timestamptz) from public, anon, authenticated;

update public.badges set how = 'Make friends with five different kinds of people: finish five of the Make Friends quests, of any kind.',
       blurb = 'Made friends with five kinds of people.' where slug = 'make-friends';

-- A yes also checks the asker's badges at once, so Make Friends moves along.
create or replace function public.cr_badge_claim_answer(p_id bigint, p_yes boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c public.badge_claims%rowtype; v_thread bigint;
begin
  select * into c from public.badge_claims where id = p_id for update;
  if not found or c.other <> auth.uid() or c.status <> 'pending' then
    return jsonb_build_object('ok', false, 'code', 'missing');
  end if;
  update public.badge_claims set status = case when p_yes then 'confirmed' else 'declined' end, answered_at = now() where id = p_id;
  if p_yes then
    insert into public.user_badges (user_id, badge_slug) values (c.claimant, c.badge_slug) on conflict do nothing;
    begin perform public.award_badges(c.claimant);
    exception when others then raise warning 'award_badges failed: %', sqlerrm; end;
  end if;
  select id into v_thread from public.dm_threads where user_a = least(c.claimant, c.other) and user_b = greatest(c.claimant, c.other);
  if v_thread is not null then
    insert into public.dm_messages (thread_id, sender_id, body)
    values (v_thread, auth.uid(), case when p_yes then 'Yes, that happened.' else 'No, not quite.' end);
    update public.dm_threads set last_message_at = now() where id = v_thread;
  end if;
  return jsonb_build_object('ok', true, 'yes', p_yes);
end;
$$;
