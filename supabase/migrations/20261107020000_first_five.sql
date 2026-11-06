-- The first five things to work on. Everyone starts with these in Working On:
--   Visit the Mana Well, Vote on a Motion, Publish an Op-Ed, Ask for Help, Help Someone.
-- Four are new badges, counted from what we already record; the fifth is A Helping Hand.
-- Asking for help is the line under your picture (profiles.mood), now up to 160 characters.
insert into public.badges (slug, title, how, blurb, art, sort, active) values
  ('visit-the-well',   'Visit the Mana Well', 'Visit the Mana Well and answer a quest.',          'Visited the Mana Well.',          'set/169.png', 90, true),
  ('vote-on-a-motion', 'Vote on a Motion',    'Vote on a motion.',                               'Voted on a motion.',              'set/121.png', 91, true),
  ('publish-an-op-ed', 'Publish an Op-Ed',    'Publish an op-ed in the Ball.',                   'Published an op-ed.',             'set/149.png', 92, true),
  ('ask-for-help',     'Ask for Help',        'Say what you need help with, under your picture.', 'Asked the City for help.',        'set/113.png', 93, true)
on conflict (slug) do nothing;

create or replace function public.award_badges(p_user uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare b record; ok boolean; n int := 0; v_count bigint; v_tier int; v_have int;
        v_helped int; v_minted int; v_kind text;
begin
  for b in select slug, tiers from public.badges where active loop
    select tier into v_have from public.user_badges where user_id = p_user and badge_slug = b.slug;

    if b.tiers > 1 then
      v_count := case b.slug
        when 'joined-in' then
          (select count(distinct r.parent_id)
             from public.posts r
             join public.posts root on root.id = r.parent_id
            where r.author_id = p_user and r.parent_id is not null
              and root.author_id <> p_user)
        when 'whisper-web' then
          (select count(distinct case when t.user_a = p_user then t.user_b else t.user_a end)
             from public.dm_threads t
            where (t.user_a = p_user or t.user_b = p_user)
              and exists (select 1 from public.dm_messages m
                           where m.thread_id = t.id and m.sender_id = p_user))
        when 'a-voice-in-council' then
          (select count(*) from public.motion_votes where user_id = p_user)
        else 0
      end;
      v_tier := least(b.tiers, public.badge_tier_for(v_count));
      if v_tier = 0 then continue; end if;
      if v_have is null then
        insert into public.user_badges (user_id, badge_slug, tier) values (p_user, b.slug, v_tier)
          on conflict do nothing;
        n := n + 1;
      elsif v_tier > v_have then
        update public.user_badges set tier = v_tier, upgraded_at = now(), seen = false
         where user_id = p_user and badge_slug = b.slug;
        n := n + 1;
      end if;
      continue;
    end if;

    if v_have is not null then continue; end if;
    ok := case b.slug
      when 'first-words' then
        exists (select 1 from public.posts where author_id = p_user and parent_id is null)
      when 'show-and-tell' then
        exists (select 1 from public.posts where author_id = p_user and has_image
                  and (image_url is not null or proof_path is not null))
      when 'meet-in-person' then
        exists (select 1 from public.vouches
                 where kind = 'meetup' and status = 'confirmed'
                   and (claimant = p_user or other = p_user))
      when 'a-helping-hand' then
        exists (select 1 from public.vouches
                 where kind = 'helped' and status = 'confirmed' and claimant = p_user)
      when 'registered-plaintiff' then
        exists (select 1 from public.plaintiffs where user_id = p_user)
      when 'visit-the-well' then
        exists (select 1 from public.quest_submissions where user_id = p_user)
      when 'vote-on-a-motion' then
        exists (select 1 from public.motion_votes where user_id = p_user)
      when 'publish-an-op-ed' then
        exists (select 1 from public.articles where author_id = p_user and kind = 'oped' and status = 'published')
      when 'ask-for-help' then
        exists (select 1 from public.profiles where id = p_user and nullif(btrim(mood), '') is not null)
      else false
    end;
    if ok then
      insert into public.user_badges (user_id, badge_slug) values (p_user, b.slug)
        on conflict do nothing;
      n := n + 1;
    end if;
  end loop;

  select count(*) into v_helped from public.vouches
   where kind = 'helped' and status = 'confirmed' and claimant = p_user;
  select count(*) into v_minted from public.badge_items
   where kind = 'tradable' and earned_by = p_user and occasion = 'helped';
  while v_minted < v_helped / 5 loop
    select slug into v_kind from public.badge_kinds where active order by random() limit 1;
    exit when v_kind is null;
    insert into public.badge_items (kind, kind_slug, earned_by, owner_id, occasion)
    values ('tradable', v_kind, p_user, p_user, 'helped');
    v_minted := v_minted + 1;
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- Everyone's first five. New people get them; anyone with an empty list gets them now.
alter table public.profiles alter column working_on set default
  '["a:visit-the-well","a:vote-on-a-motion","a:publish-an-op-ed","a:ask-for-help","a:a-helping-hand"]'::jsonb;
update public.profiles set working_on =
  '["a:visit-the-well","a:vote-on-a-motion","a:publish-an-op-ed","a:ask-for-help","a:a-helping-hand"]'::jsonb
 where working_on = '[]'::jsonb;
