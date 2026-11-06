-- First steps and Main Quests.
-- * badges.first_step marks the five quests everyone does first. Until all five are earned, nobody can
--   pick Main Quests (cr_set_working_on refuses with 'first_steps').
-- * New: Make a Friend (auto: any Friend quest or Make 5 Friends), Support Group and Bring a First
--   Timer (a witch confirms), Learn About Leylines (anyone holding it confirms; every witch holds it),
--   Bring a Friend (a witch confirms, not a first step).
-- * peer_target 'leylines' means "someone who holds Learn About Leylines" (witches always do).
-- * A Helping Hand stops being a pickable goal: it is a pinned Main Quest on the Quests page. Every 10
--   confirmed helps brings a tradable badge, again and again.
alter table public.badges add column if not exists first_step boolean not null default false;

create or replace function public.cr_first_steps_done(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.badges b
                      where b.active and b.first_step
                        and not exists (select 1 from public.user_badges ub where ub.user_id = p_user and ub.badge_slug = b.slug));
$$;
revoke all on function public.cr_first_steps_done(uuid) from public, anon;
grant execute on function public.cr_first_steps_done(uuid) to authenticated;

update public.badges set kind = 'quest' where slug = 'a-helping-hand';
update public.badges set first_step = true where slug = 'vote-on-a-motion';

insert into public.badges (slug, title, how, blurb, art, sort, active, witch_approved, peer_approved, peer_target, first_step, kind, tiers) values
  ('first-friend', 'Make a Friend', 'Make friends with someone. Any of the Friend quests counts.', 'Made a friend.', 'set/600.png', 340, true, false, false, null, true, 'quest', 1),
  ('support-group', 'Support Group', 'Attend a support group. A witch says you were there.', 'Went to a support group.', 'set/601.png', 341, true, false, true, 'witch', true, 'quest', 1),
  ('first-timer', 'Bring a First Timer', 'Bring someone new to the café. A witch says they came.', 'Brought a first timer to the café.', 'set/602.png', 342, true, false, true, 'witch', true, 'quest', 1),
  ('learn-leylines', 'Learn About Leylines', 'Learn about leylines from someone who already knows them.', 'Learned about leylines.', 'set/603.png', 343, true, false, true, 'leylines', true, 'quest', 1),
  ('bring-a-friend', 'Bring a Friend', 'Bring a friend to the café. A witch says they came.', 'Brought a friend to the café.', 'set/604.png', 344, true, false, true, 'witch', false, 'quest', 1)
on conflict (slug) do update set title = excluded.title, how = excluded.how, blurb = excluded.blurb, peer_approved = excluded.peer_approved,
  peer_target = excluded.peer_target, first_step = excluded.first_step, kind = 'quest';

-- Every witch holds Learn About Leylines, now and from the moment they become one.
create or replace function public.trg_witch_leylines()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_badges (user_id, badge_slug) values (new.id, 'learn-leylines') on conflict do nothing;
  return null;
end;
$$;
drop trigger if exists witch_leylines on public.profiles;
create trigger witch_leylines after insert or update of is_witch on public.profiles
  for each row when (new.is_witch) execute function public.trg_witch_leylines();
insert into public.user_badges (user_id, badge_slug) select id, 'learn-leylines' from public.profiles where is_witch on conflict do nothing;

-- Make a Friend: earned as soon as any Friend quest is.
create or replace function public.trg_first_friend()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.badge_slug in ('human-friend', 'orc-friend', 'shifter-friend', 'elf-friend', 'goblin-friend', 'forsaken-friend', 'spellcaster-friend', 'witch-friend', 'make-friends') then
    insert into public.user_badges (user_id, badge_slug) values (new.user_id, 'first-friend') on conflict do nothing;
  end if;
  return null;
end;
$$;
drop trigger if exists first_friend on public.user_badges;
create trigger first_friend after insert on public.user_badges for each row execute function public.trg_first_friend();
insert into public.user_badges (user_id, badge_slug)
  select distinct user_id, 'first-friend' from public.user_badges
   where badge_slug in ('human-friend', 'orc-friend', 'shifter-friend', 'elf-friend', 'goblin-friend', 'forsaken-friend', 'spellcaster-friend', 'witch-friend', 'make-friends')
  on conflict do nothing;

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
       or (b.peer_target = 'leylines' and (o.is_witch or exists (select 1 from public.user_badges lb where lb.user_id = o.id and lb.badge_slug = 'learn-leylines')))
       or (b.peer_target not in ('spellcaster', 'witch', 'leylines') and o.species = b.peer_target)) then
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

create or replace function public.cr_scan_quests(p_other uuid)
returns text[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(b.slug order by (b.kind = 'goal') desc, b.sort), '{}')
    from public.badges b, public.profiles o
   where o.id = p_other and p_other <> auth.uid() and auth.uid() is not null
     and b.active and b.peer_approved
     and (b.peer_target is null
          or (b.peer_target = 'spellcaster' and o.spellcaster)
          or (b.peer_target = 'witch' and o.is_witch)
          or (b.peer_target = 'leylines' and (o.is_witch or exists (select 1 from public.user_badges lb where lb.user_id = o.id and lb.badge_slug = 'learn-leylines')))
          or (b.peer_target not in ('spellcaster', 'witch', 'leylines') and o.species = b.peer_target))
     and not exists (select 1 from public.user_badges ub where ub.user_id = auth.uid() and ub.badge_slug = b.slug and coalesce(ub.tier, 1) >= b.tiers)
     and not exists (select 1 from public.badge_claims c where c.badge_slug = b.slug and c.claimant = auth.uid() and c.other = p_other and c.status = 'pending')
     and (b.kind <> 'goal' or (
          exists (select 1 from public.user_goals g where g.user_id = auth.uid() and g.slug = b.slug)
          and not exists (select 1 from public.badge_claims c, public.user_goals g
                           where g.user_id = auth.uid() and g.slug = b.slug and c.badge_slug = b.slug
                             and c.claimant = auth.uid() and c.other = p_other and c.status = 'confirmed' and c.answered_at >= g.since)));
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
  if v_target is not null and v_target not in ('spellcaster', 'witch', 'leylines', 'elf', 'forsaken', 'shifter', 'human', 'orc', 'goblin', 'planar') then
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

create or replace function public.award_badges(p_user uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare b record; ok boolean; n int := 0; v_count bigint; v_tier int; v_have int;
        v_helped int; v_minted int; v_kind text; v_work jsonb; v_since timestamptz; v_steps int[];
begin
  select coalesce(working_on, '[]'::jsonb) into v_work from public.profiles where id = p_user;
  v_work := coalesce(v_work, '[]'::jsonb);
  for b in select bd.slug, bd.kind, bd.tiers, bd.metric, bd.threshold, bd.steps from public.badges bd
            where bd.active
              and (bd.kind <> 'goal' or v_work ? ('a:' || bd.slug))
              and not exists (select 1 from public.user_badges ub
                               where ub.user_id = p_user and ub.badge_slug = bd.slug and coalesce(ub.tier, 1) >= bd.tiers) loop
    select tier into v_have from public.user_badges where user_id = p_user and badge_slug = b.slug;

    if b.kind = 'goal' then
      select since into v_since from public.user_goals where user_id = p_user and slug = b.slug;
      if v_since is null then continue; end if;
      v_count := public.cr_goal_count(p_user, b.slug, v_since);
      v_steps := coalesce(b.steps, case when b.tiers > 1 then (array[5,10,25,50])[1:b.tiers] else array[coalesce(b.threshold, 1)] end);
      v_tier := least(b.tiers, (select count(*) from unnest(v_steps) s where v_count >= s));
      if v_tier = 0 then continue; end if;
      if v_have is null then
        insert into public.user_badges (user_id, badge_slug, tier) values (p_user, b.slug, v_tier) on conflict do nothing;
        -- Finishing an epic quest brings a tradable badge, drawn at random.
        if found then
          select slug into v_kind from public.badge_kinds where active order by random() limit 1;
          if v_kind is not null then
            insert into public.badge_items (kind, kind_slug, earned_by, owner_id, occasion)
            values ('tradable', v_kind, p_user, p_user, 'epic');
            n := n + 1;
          end if;
        end if;
        n := n + 1;
      elsif v_tier > v_have then
        update public.user_badges set tier = v_tier, upgraded_at = now(), seen = false
         where user_id = p_user and badge_slug = b.slug;
        n := n + 1;
      end if;
      continue;
    end if;

    if b.tiers > 1 then
      v_count := public.cr_metric_all(p_user, b.metric);
      v_tier := least(b.tiers, (select count(*) from unnest(coalesce(b.steps, array[coalesce(b.threshold, 1)])) s where v_count >= s));
      if v_tier = 0 then continue; end if;
      if v_have is null then
        insert into public.user_badges (user_id, badge_slug, tier) values (p_user, b.slug, v_tier) on conflict do nothing;
        n := n + 1;
      elsif v_tier > v_have then
        update public.user_badges set tier = v_tier, upgraded_at = now(), seen = false
         where user_id = p_user and badge_slug = b.slug;
        n := n + 1;
      end if;
      continue;
    end if;

    if v_have is not null then continue; end if;
    if b.metric is not null then
      ok := public.cr_metric_all(p_user, b.metric) >= coalesce(b.threshold, 1);
    else
      ok := case b.slug
        when 'registered-plaintiff' then exists (select 1 from public.plaintiffs where user_id = p_user)
        when 'vote-on-a-motion' then exists (select 1 from public.motion_votes where user_id = p_user)
        when 'ask-for-help' then exists (select 1 from public.profiles where id = p_user and nullif(btrim(mood), '') is not null)
        else false
      end;
    end if;
    if ok then
      insert into public.user_badges (user_id, badge_slug) values (p_user, b.slug) on conflict do nothing;
      n := n + 1;
    end if;
  end loop;

  select count(*) into v_helped from public.vouches where kind = 'helped' and status = 'confirmed' and claimant = p_user;
  select count(*) into v_minted from public.badge_items where kind = 'tradable' and earned_by = p_user and occasion = 'helped';
  while v_minted < v_helped / 10 loop
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

create or replace function public.cr_set_working_on(p_list jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'auth'); end if;
  if not public.cr_first_steps_done(auth.uid()) then return jsonb_build_object('ok', false, 'code', 'first_steps'); end if;
  v := public.cr_clean_working_on(p_list);
  update public.profiles set working_on = v where id = auth.uid();
  perform public.award_badges(auth.uid());
  return jsonb_build_object('ok', true, 'working_on', v);
end;
$$;

revoke all on function public.cr_scan_quests(uuid) from public, anon;
grant execute on function public.cr_scan_quests(uuid) to authenticated;
