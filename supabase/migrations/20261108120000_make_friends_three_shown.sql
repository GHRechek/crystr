-- Three shown badges, beside the avatar. And a new epic quest: Make Friends (whisper back and forth with
-- five different people).
create or replace function public.cr_clean_shown_badges(p_user uuid, p_list jsonb)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare e text; out jsonb := '[]'::jsonb; n int := 0; seen text[] := '{}'; ok boolean;
begin
  if p_list is null or jsonb_typeof(p_list) <> 'array' then return '[]'::jsonb; end if;
  for e in select jsonb_array_elements_text(p_list) loop
    exit when n >= 3;
    continue when e = any(seen);
    ok := false;
    if e ~ '^a:[a-z0-9-]{1,40}$' then
      ok := exists (select 1 from public.user_badges where user_id = p_user and badge_slug = substr(e, 3));
    elsif e ~ '^i:[0-9]{1,18}$' then
      ok := exists (select 1 from public.badge_items where id = substr(e, 3)::bigint and owner_id = p_user and kind = 'tradable');
    end if;
    if ok then
      out := out || to_jsonb(e); seen := seen || e; n := n + 1;
    end if;
  end loop;
  return out;
end;
$$;
revoke all on function public.cr_clean_shown_badges(uuid, jsonb) from public, anon, authenticated;
update public.profiles set shown_badges = public.cr_clean_shown_badges(id, shown_badges) where jsonb_array_length(shown_badges) > 3;
update public.badges set how = 'Show three badges on your profile.', blurb = 'Showed three badges.', threshold = 3 where slug = 'show-five';

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
      select count(*) into v from public.dm_threads t
       where (t.user_a = p_user or t.user_b = p_user)
         and exists (select 1 from public.dm_messages m where m.thread_id = t.id and m.sender_id = p_user and m.deleted_at is null and m.created_at >= p_since)
         and exists (select 1 from public.dm_messages m where m.thread_id = t.id and m.sender_id <> p_user and m.deleted_at is null and m.created_at >= p_since);
    else v := 0;
  end case;
  return coalesce(v, 0);
end;
$$;
revoke all on function public.cr_goal_count(uuid, text, timestamptz) from public, anon, authenticated;

insert into public.badges (slug, title, how, blurb, art, sort, active, witch_approved, kind, threshold) values
  ('make-friends', 'Make Friends', 'Trade whispers with five different people. They have to write back.', 'Made five friends.', 'set/351.png', 309, true, false, 'goal', 5)
on conflict (slug) do nothing;
