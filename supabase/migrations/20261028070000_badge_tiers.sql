-- The three badges for doing a thing again and again come in tiers now. JOINED IN (replies
-- on different posts), WHISPER WEB (people whispered to) and A VOICE IN COUNCIL (votes) are
-- earned at five, and step up at ten, twenty-five and fifty: tier I to IV. A step up is
-- announced once like a new badge, but changes nothing else: a badge is worth one max mana
-- whatever its tier, the same as before.
--
--  * user_badges.tier (1-4) and upgraded_at; badges.tiers says how many a badge has.
--  * award_badges works the tier out from the count and raises it when it has grown.
--  * cr_badge_counts() tells the caller their own counts, for "7 of 10 towards the next".

alter table public.user_badges add column if not exists tier int not null default 1 check (tier between 1 and 4);
alter table public.user_badges add column if not exists upgraded_at timestamptz;
alter table public.badges add column if not exists tiers int not null default 1 check (tiers between 1 and 4);

update public.badges set tiers = 4, how = 'Reply on five different posts. Then ten, twenty-five, fifty.'
 where slug = 'joined-in';
update public.badges set tiers = 4, how = 'Whisper to five different people. Then ten, twenty-five, fifty.'
 where slug = 'whisper-web';
update public.badges set tiers = 4, how = 'Vote on five motions. Then ten, twenty-five, fifty.'
 where slug = 'a-voice-in-council';

-- What tier a count earns: five, ten, twenty-five, fifty.
create or replace function public.badge_tier_for(n bigint)
returns int language sql immutable as $$
  select case when n >= 50 then 4 when n >= 25 then 3 when n >= 10 then 2 when n >= 5 then 1 else 0 end;
$$;
revoke all on function public.badge_tier_for(bigint) from public, anon, authenticated;

create or replace function public.award_badges(p_user uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare b record; ok boolean; n int := 0; v_count bigint; v_tier int; v_have int;
        v_helped int; v_minted int; v_kind text;
begin
  for b in select slug, tiers from public.badges where active loop
    select tier into v_have from public.user_badges where user_id = p_user and badge_slug = b.slug;

    if b.tiers > 1 then
      -- A counting badge: the count decides the tier, and the tier only ever goes up.
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
      else false
    end;
    if ok then
      insert into public.user_badges (user_id, badge_slug) values (p_user, b.slug)
        on conflict do nothing;
      n := n + 1;
    end if;
  end loop;

  -- Every five helps, a tradable badge, drawn at random. Counted against what was ever
  -- minted for this person, so giving one away does not bring it back.
  select count(*) into v_helped from public.vouches
   where kind = 'helped' and status = 'confirmed' and claimant = p_user;
  select count(*) into v_minted from public.badge_items
   where kind = 'tradable' and earned_by = p_user;
  while v_minted < v_helped / 5 loop
    select slug into v_kind from public.badge_kinds where active order by random() limit 1;
    exit when v_kind is null;
    insert into public.badge_items (kind, kind_slug, earned_by, owner_id)
    values ('tradable', v_kind, p_user, p_user);
    v_minted := v_minted + 1;
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- Tell the person what is new since they last heard: a badge, a step up, a tradable badge
-- or a token. The tier rides along so the app can say "JOINED IN II".
create or replace function public.cr_claim_new_badges()
returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  with t as (
    update public.user_badges set seen = true
     where user_id = auth.uid() and not seen
    returning badge_slug, tier
  ), i as (
    update public.badge_items set seen = true
     where owner_id = auth.uid() and not seen
    returning id, kind, kind_slug, title
  ), named as (
    select b.slug, b.title, b.blurb, b.sort, 0 as grp, t.tier from t join public.badges b on b.slug = t.badge_slug
    union all
    select coalesce(k.slug, 'token-' || i.id::text),
           case when i.kind = 'tradable' then k.title else i.title end,
           case when i.kind = 'tradable' then k.blurb else 'Their own token, given to you.' end,
           coalesce(k.sort, 0),
           case when i.kind = 'tradable' then 1 else 2 end,
           1
      from i left join public.badge_kinds k on k.slug = i.kind_slug
  )
  select coalesce(jsonb_agg(jsonb_build_object('slug', slug, 'title', title, 'blurb', blurb, 'tier', tier) order by grp, sort), '[]'::jsonb)
    into r from named;
  return r;
end;
$$;

-- The caller's own counts behind the three tiered badges.
create or replace function public.cr_badge_counts()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'replies', (select count(distinct r.parent_id) from public.posts r join public.posts root on root.id = r.parent_id
                 where r.author_id = auth.uid() and r.parent_id is not null and root.author_id <> auth.uid()),
    'whispers', (select count(distinct case when t.user_a = auth.uid() then t.user_b else t.user_a end)
                   from public.dm_threads t
                  where (t.user_a = auth.uid() or t.user_b = auth.uid())
                    and exists (select 1 from public.dm_messages m where m.thread_id = t.id and m.sender_id = auth.uid())),
    'votes', (select count(*) from public.motion_votes where user_id = auth.uid()));
$$;
revoke all on function public.cr_badge_counts() from public, anon;
grant execute on function public.cr_badge_counts() to authenticated;

-- Everyone's tiers now, without an announcement; the votes badge is earned at five now.
do $$ declare u record; begin
  for u in select id from public.profiles loop perform public.award_badges(u.id); end loop;
  update public.user_badges set seen = true where not seen;
end $$;
