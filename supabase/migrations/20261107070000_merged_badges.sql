-- Fewer, bigger badges. Things that were separate rungs (make a post, ten posts, fifty posts) are one
-- badge with steps. badges.steps lists the count that earns each step of a metric badge.
alter table public.badges add column if not exists steps int[];

-- Three more things to count.
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
    else v := 0;
  end case;
  return coalesce(v, 0);
end;
$$;
revoke all on function public.cr_metric_x(uuid, text) from public, anon, authenticated;

create or replace function public.cr_metric_all(p_user uuid, p_metric text)
returns bigint language sql stable security definer set search_path = public as $$
  select case when p_metric in ('image_posts', 'profile_fields', 'token_stage')
              then public.cr_metric_x(p_user, p_metric) else public.cr_metric(p_user, p_metric) end;
$$;
revoke all on function public.cr_metric_all(uuid, text) from public, anon, authenticated;

-- Turn the kept badges into stepped ones.
update public.badges b set metric = v.metric, steps = v.steps, tiers = array_length(v.steps, 1),
       title = coalesce(v.title, b.title), how = coalesce(v.how, b.how), blurb = coalesce(v.blurb, b.blurb), threshold = null
  from (values
    ('first-words',      'posts',          array[1,10,50],        null, 'Make a post.', 'Made a post.'),
    ('show-and-tell',    'image_posts',    array[1,5,20],         null, 'Post a picture.', 'Posted a picture.'),
    ('three-days',       'post_streak',    array[3,7,30],         'On a Roll', 'Post on three days in a row.', 'Posted days running.'),
    ('visit-the-well',   'quests',         array[1,10,30],        null, null, null),
    ('first-like-given', 'likes_given',    array[1,10,50],        null, null, null),
    ('first-like-got',   'likes_got',      array[1,25,100],       null, null, null),
    ('publish-an-op-ed', 'opeds',          array[1,5,20],         null, null, null),
    ('a-helping-hand',   'helps_people',   array[1,5,20,50],      null, 'Help someone with a problem.', 'Helped someone with a problem.'),
    ('meet-in-person',   'meets_people',   array[1,3,10],         null, 'Meet up with someone from the City.', 'Met up with someone from the City.'),
    ('first-bio',        'profile_fields', array[1,3,6],          'About You', 'Fill in your About Me and the details on your profile.', 'Filled in their profile.'),
    ('token-made',       'token_stage',    array[1,2,3],          'Maker', 'Make your token, write how to earn it, and give it away.', 'Made a token.'),
    ('first-trade',      'trades',         array[1,5,20],         'Dealer', 'Make a trade.', 'Made a trade.'),
    ('first-spend',      'mana_spent',     array[1,100,500],      'Spender', 'Spend mana.', 'Spent mana.'),
    ('max-fifty',        'mana_cap',       array[50,100,200],     null, 'Reach a max mana of fifty.', 'Reached a high max mana.'),
    ('week-in',          'days_in',        array[7,30,90,365],    'In the City', 'Be in the City for a week.', 'Stayed in the City.')
  ) as v(slug, metric, steps, title, how, blurb) where b.slug = v.slug;

delete from public.badges where slug in (
  'first-picture-wall','ten-posts','fifty-posts','quest-taker','fifty-likes-given','ten-likes-got',
  'first-reply','twenty-replies','first-whisper','ten-whispers','first-motion-vote','twenty-motions',
  'first-op-ed','five-op-eds','five-helps','twenty-helps','first-meet','three-meets','ten-meets',
  'full-details','token-how','give-token','five-trades','spend-hundred','month-in','three-months','year-in');

create or replace function public.award_badges(p_user uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare b record; ok boolean; n int := 0; v_count bigint; v_tier int; v_have int;
        v_helped int; v_minted int; v_kind text; v_work jsonb;
begin
  select coalesce(working_on, '[]'::jsonb) into v_work from public.profiles where id = p_user;
  v_work := coalesce(v_work, '[]'::jsonb);
  for b in select slug, tiers, metric, threshold, steps from public.badges
            where active and v_work ? ('a:' || slug) loop
    select tier into v_have from public.user_badges where user_id = p_user and badge_slug = b.slug;

    if b.tiers > 1 then
      if b.steps is not null and b.metric is not null then
        v_count := public.cr_metric_all(p_user, b.metric);
        v_tier := least(b.tiers, (select count(*) from unnest(b.steps) s where v_count >= s));
      else
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
      end if;
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
    if b.metric is not null then
      ok := public.cr_metric_all(p_user, b.metric) >= coalesce(b.threshold, 1);
    else
      ok := case b.slug
        when 'registered-plaintiff' then
          exists (select 1 from public.plaintiffs where user_id = p_user)
        when 'vote-on-a-motion' then
          exists (select 1 from public.motion_votes where user_id = p_user)
        when 'ask-for-help' then
          exists (select 1 from public.profiles where id = p_user and nullif(btrim(mood), '') is not null)
        else false
      end;
    end if;
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

-- Witches can edit what any badge says and looks like (not how it is earned), and delete any badge.
create or replace function public.cr_badge_save(p_slug text, p_title text, p_how text, p_blurb text, p_art int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_slug text; v_base text; v_n int := 1; v_title text := btrim(coalesce(p_title, ''));
        v_how text := btrim(coalesce(p_how, '')); v_blurb text := btrim(coalesce(p_blurb, ''));
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_witch) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  if char_length(v_title) not between 1 and 40 or char_length(v_how) not between 1 and 200
     or char_length(v_blurb) not between 1 and 120 or p_art is null or p_art not between 1 and 299 then
    return jsonb_build_object('ok', false, 'code', 'bad_input');
  end if;
  if p_slug is not null then
    update public.badges set title = v_title, how = v_how, blurb = v_blurb, art = 'set/' || p_art || '.png'
     where slug = p_slug;
    if not found then return jsonb_build_object('ok', false, 'code', 'missing'); end if;
    return jsonb_build_object('ok', true, 'slug', p_slug);
  end if;
  v_base := trim(both '-' from regexp_replace(lower(v_title), '[^a-z0-9]+', '-', 'g'));
  if v_base = '' then v_base := 'badge'; end if;
  v_slug := left(v_base, 40);
  while exists (select 1 from public.badges where slug = v_slug) loop
    v_n := v_n + 1; v_slug := left(v_base, 36) || '-' || v_n;
  end loop;
  insert into public.badges (slug, title, how, blurb, art, sort, active, witch_approved)
  values (v_slug, v_title, v_how, v_blurb, 'set/' || p_art || '.png',
          (select coalesce(max(sort), 0) + 1 from public.badges), true, true);
  return jsonb_build_object('ok', true, 'slug', v_slug);
end;
$$;

create or replace function public.cr_badge_delete(p_slug text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_witch) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  delete from public.badges where slug = p_slug;
  if not found then return jsonb_build_object('ok', false, 'code', 'missing'); end if;
  return jsonb_build_object('ok', true);
end;
$$;

select public.award_badges(id) from public.profiles;
