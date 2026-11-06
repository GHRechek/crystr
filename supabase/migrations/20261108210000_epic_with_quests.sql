-- Epic quests someone else confirms: Make 5 Friends, Talk Culture with 5, Cast 5 Spells, Brew 5 Potions,
-- Attend 5 Workshops, Attend 5 Support Groups. Pick one as an epic quest, then ask people one at a time; it is done
-- when five different people have said yes. (First Words and Show and Tell stop being epic quests.)
update public.badges set kind = 'quest' where slug in ('first-words', 'show-and-tell');

create or replace function public.cr_goal_count(p_user uuid, p_slug text, p_since timestamptz)
returns bigint language plpgsql stable security definer set search_path = public as $$
declare v bigint := 0;
begin
  -- An epic quest someone else confirms: how many different people have said yes since it was picked.
  if exists (select 1 from public.badges where slug = p_slug and peer_approved and kind = 'goal') then
    select count(distinct other) into v from public.badge_claims
     where claimant = p_user and badge_slug = p_slug and status = 'confirmed' and answered_at >= p_since;
    return coalesce(v, 0);
  end if;
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
    when 'first-spend' then
      select coalesce(-sum(amount), 0) into v from public.mana_ledger where user_id = p_user and amount < 0 and created_at >= p_since;
    else v := 0;
  end case;
  return coalesce(v, 0);
end;
$$;
revoke all on function public.cr_goal_count(uuid, text, timestamptz) from public, anon, authenticated;

create or replace function public.cr_badge_claim(p_slug text, p_other uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare b public.badges%rowtype; v_a uuid; v_b uuid; v_thread bigint; v_id bigint; v_body text; o public.profiles%rowtype;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'auth'); end if;
  select * into b from public.badges where slug = p_slug and active and peer_approved;
  if not found then return jsonb_build_object('ok', false, 'code', 'bad_badge'); end if;
  select * into o from public.profiles where id = p_other;
  if not found or p_other = auth.uid() then
    return jsonb_build_object('ok', false, 'code', 'bad_person');
  end if;
  if b.peer_target is not null and not (
       (b.peer_target = 'spellcaster' and o.spellcaster) or (b.peer_target = 'witch' and o.is_witch)
       or (b.peer_target not in ('spellcaster', 'witch') and o.species = b.peer_target)) then
    return jsonb_build_object('ok', false, 'code', 'wrong_kind');
  end if;
  if exists (select 1 from public.user_badges where user_id = auth.uid() and badge_slug = p_slug and coalesce(tier, 1) >= b.tiers) then
    return jsonb_build_object('ok', false, 'code', 'have_it');
  end if;
  -- An epic quest only counts while it is picked, and each person counts once.
  if b.kind = 'goal' then
    if not exists (select 1 from public.user_goals where user_id = auth.uid() and slug = p_slug) then
      return jsonb_build_object('ok', false, 'code', 'not_picked');
    end if;
    if exists (select 1 from public.badge_claims bc
                where bc.badge_slug = p_slug and bc.claimant = auth.uid() and bc.other = p_other and bc.status = 'confirmed'
                  and bc.answered_at >= (select since from public.user_goals where user_id = auth.uid() and slug = p_slug)) then
      return jsonb_build_object('ok', false, 'code', 'already');
    end if;
  end if;
  if exists (select 1 from public.badge_claims where badge_slug = p_slug and claimant = auth.uid() and other = p_other and status = 'pending') then
    return jsonb_build_object('ok', false, 'code', 'already');
  end if;
  if (select count(*) from public.badge_claims where claimant = auth.uid() and status = 'pending') >= 10 then
    return jsonb_build_object('ok', false, 'code', 'too_many');
  end if;

  v_a := least(auth.uid(), p_other); v_b := greatest(auth.uid(), p_other);
  insert into public.dm_threads (user_a, user_b) values (v_a, v_b)
  on conflict (user_a, user_b) do update set user_a = excluded.user_a returning id into v_thread;

  insert into public.badge_claims (badge_slug, claimant, other) values (p_slug, auth.uid(), p_other) returning id into v_id;
  v_body := 'Quest: ' || b.title || '. ' || b.how || ' Did that happen with you?';
  insert into public.dm_messages (thread_id, sender_id, body, claim_id) values (v_thread, auth.uid(), v_body, v_id);
  update public.dm_threads set last_message_at = now() where id = v_thread;
  return jsonb_build_object('ok', true, 'thread_id', v_thread);
end;
$$;

create or replace function public.cr_badge_claim_answer(p_id bigint, p_yes boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c public.badge_claims%rowtype; v_thread bigint; v_kind text;
begin
  select * into c from public.badge_claims where id = p_id for update;
  if not found or c.other <> auth.uid() or c.status <> 'pending' then
    return jsonb_build_object('ok', false, 'code', 'missing');
  end if;
  update public.badge_claims set status = case when p_yes then 'confirmed' else 'declined' end, answered_at = now() where id = p_id;
  if p_yes then
    select kind into v_kind from public.badges where slug = c.badge_slug;
    -- A plain quest is theirs on the first yes; an epic one counts the yeses and is checked below.
    if coalesce(v_kind, 'quest') <> 'goal' then
      insert into public.user_badges (user_id, badge_slug) values (c.claimant, c.badge_slug) on conflict do nothing;
    end if;
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

insert into public.badges (slug, title, how, blurb, art, sort, active, witch_approved, peer_approved, kind, threshold, tiers) values
  ('make-friends', 'Make 5 Friends', 'Make friends with five different people. Each one has to say yes.', 'Made friends with five people.', 'set/351.png', 330, true, false, true, 'goal', 5, 1),
  ('culture-five', 'Talk Culture with 5', 'Talk culture with five different people.', 'Talked culture with five people.', 'set/489.png', 331, true, false, true, 'goal', 5, 1),
  ('cast-five-spells', 'Cast 5 Spells', 'Cast a spell for five different people.', 'Cast spells for five people.', 'set/150.png', 332, true, false, true, 'goal', 5, 1),
  ('brew-five-potions', 'Brew 5 Potions', 'Brew potions for five different people.', 'Brewed potions for five people.', 'set/164.png', 333, true, false, true, 'goal', 5, 1),
  ('workshops-five', 'Attend 5 Workshops', 'Attend five workshops, each with someone to say you were there.', 'Attended five workshops.', 'set/500.png', 334, true, false, true, 'goal', 5, 1),
  ('support-groups-five', 'Attend 5 Support Groups', 'Attend five support groups, each with someone to say you were there.', 'Attended five support groups.', 'set/461.png', 335, true, false, true, 'goal', 5, 1)
on conflict (slug) do update set title = excluded.title, how = excluded.how, blurb = excluded.blurb, peer_approved = true, kind = 'goal', threshold = 5, tiers = 1, steps = null, metric = null;
