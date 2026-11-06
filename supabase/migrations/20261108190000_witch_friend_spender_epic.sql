-- Meet a Witch becomes Witch Friend: a "with someone" quest only a witch can confirm.
-- Spender (spend 200 mana) becomes an epic quest, counted from when it is picked.
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
  if exists (select 1 from public.user_badges where user_id = auth.uid() and badge_slug = p_slug) then
    return jsonb_build_object('ok', false, 'code', 'have_it');
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

create or replace function public.cr_badge_save(p_slug text, p_title text, p_how text, p_blurb text, p_art int, p_art_custom text default null, p_peer boolean default null, p_target text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_slug text; v_base text; v_n int := 1; v_title text := btrim(coalesce(p_title, ''));
        v_how text := btrim(coalesce(p_how, '')); v_blurb text := btrim(coalesce(p_blurb, ''));
        v_art text; v_target text := nullif(btrim(coalesce(p_target, '')), '');
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_witch) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  if v_target is not null and v_target not in ('spellcaster', 'witch', 'elf', 'forsaken', 'shifter', 'human', 'orc', 'goblin', 'troll', 'gnome', 'tauren', 'planar') then
    v_target := null;
  end if;
  if p_art_custom is not null and p_art_custom ~ '^[0-9a-z.]{1,120}$' then
    v_art := 'token:' || p_art_custom;
  elsif p_art is not null and p_art between 1 and 1015 then
    v_art := 'set/' || p_art || '.png';
  end if;
  if p_slug is not null and exists (select 1 from public.badges where slug = p_slug and kind = 'goal') then
    if char_length(v_title) not between 1 and 40 or v_art is null then
      return jsonb_build_object('ok', false, 'code', 'bad_input');
    end if;
    update public.badges set title = v_title, art = v_art where slug = p_slug;
    return jsonb_build_object('ok', true, 'slug', p_slug);
  end if;
  if char_length(v_title) not between 1 and 40 or char_length(v_how) not between 1 and 200
     or char_length(v_blurb) not between 1 and 120 or v_art is null then
    return jsonb_build_object('ok', false, 'code', 'bad_input');
  end if;
  if p_slug is not null then
    update public.badges set title = v_title, how = v_how, blurb = v_blurb, art = v_art where slug = p_slug;
    if not found then return jsonb_build_object('ok', false, 'code', 'missing'); end if;
    if p_peer is not null then
      update public.badges set peer_approved = p_peer, witch_approved = not p_peer,
             peer_target = case when p_peer then v_target else null end
       where slug = p_slug and (witch_approved or peer_approved);
    end if;
    return jsonb_build_object('ok', true, 'slug', p_slug);
  end if;
  v_base := trim(both '-' from regexp_replace(lower(v_title), '[^a-z0-9]+', '-', 'g'));
  if v_base = '' then v_base := 'badge'; end if;
  v_slug := left(v_base, 40);
  while exists (select 1 from public.badges where slug = v_slug) loop
    v_n := v_n + 1; v_slug := left(v_base, 36) || '-' || v_n;
  end loop;
  insert into public.badges (slug, title, how, blurb, art, sort, active, witch_approved, peer_approved, peer_target)
  values (v_slug, v_title, v_how, v_blurb, v_art, (select coalesce(max(sort), 0) + 1 from public.badges), true,
          not coalesce(p_peer, false), coalesce(p_peer, false), case when coalesce(p_peer, false) then v_target else null end);
  return jsonb_build_object('ok', true, 'slug', v_slug);
end;
$$;
revoke all on function public.cr_badge_save(text, text, text, text, int, text, boolean, text) from public, anon;
grant execute on function public.cr_badge_save(text, text, text, text, int, text, boolean, text) to authenticated;


update public.badges set title = 'Witch Friend', how = 'Make friends with a witch.', blurb = 'Made friends with a witch.',
       metric = null, threshold = null, peer_approved = true, witch_approved = false, peer_target = 'witch'
 where slug = 'meet-witch';

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
    when 'first-spend' then
      select coalesce(-sum(amount), 0) into v from public.mana_ledger where user_id = p_user and amount < 0 and created_at >= p_since;
    else v := 0;
  end case;
  return coalesce(v, 0);
end;
$$;
revoke all on function public.cr_goal_count(uuid, text, timestamptz) from public, anon, authenticated;

update public.badges set kind = 'goal' where slug = 'first-spend';
