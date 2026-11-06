-- Goals only count from the moment they are picked, and only while they stay picked.
--  user_goals(user_id, slug, since)  when a goal went on someone's Working On list
--  cr_goal_count(user, slug, since)  the count for a goal, from events at or after `since`
-- award_badges and cr_goal_progress use them for goals. Quests are unchanged. Also: more things now
-- check a person's badges when they happen (a like, a vouch, a trade, a token, a profile edit).
create table if not exists public.user_goals (
  user_id uuid not null references public.profiles (id) on delete cascade,
  slug    text not null references public.badges (slug) on delete cascade,
  since   timestamptz not null default now(),
  primary key (user_id, slug)
);
alter table public.user_goals enable row level security;
revoke all on public.user_goals from anon, authenticated;

create or replace function public.trg_sync_user_goals()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.user_goals ug
   where ug.user_id = new.id
     and not (coalesce(new.working_on, '[]'::jsonb) ? ('a:' || ug.slug));
  insert into public.user_goals (user_id, slug)
  select new.id, substr(e, 3) from jsonb_array_elements_text(coalesce(new.working_on, '[]'::jsonb)) e
   where e like 'a:%' and exists (select 1 from public.badges where slug = substr(e, 3))
  on conflict do nothing;
  return null;
end;
$$;
drop trigger if exists sync_user_goals on public.profiles;
create trigger sync_user_goals after insert or update of working_on on public.profiles
  for each row execute function public.trg_sync_user_goals();

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
    else v := 0;
  end case;
  return coalesce(v, 0);
end;
$$;
revoke all on function public.cr_goal_count(uuid, text, timestamptz) from public, anon, authenticated;

create or replace function public.cr_goal_progress()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare out jsonb := '{}'::jsonb; g record; u uuid := auth.uid();
begin
  if u is null then return out; end if;
  for g in select ug.slug, ug.since from public.user_goals ug join public.badges b on b.slug = ug.slug and b.kind = 'goal' and b.active
            where ug.user_id = u loop
    out := out || jsonb_build_object(g.slug, public.cr_goal_count(u, g.slug, g.since));
  end loop;
  return out;
end;
$$;
revoke all on function public.cr_goal_progress() from public, anon;
grant execute on function public.cr_goal_progress() to authenticated;

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

-- More moments that check badges.
create or replace function public.trg_award_like()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_author uuid;
begin
  select author_id into v_author from public.posts where id = new.post_id;
  begin
    perform public.award_badges(new.user_id);
    if v_author is not null and v_author <> new.user_id then perform public.award_badges(v_author); end if;
  exception when others then raise warning 'award_badges failed: %', sqlerrm; end;
  return null;
end;
$$;
drop trigger if exists award_badges_likes on public.post_likes;
create trigger award_badges_likes after insert on public.post_likes for each row execute function public.trg_award_like();

create or replace function public.trg_award_vouch()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  begin perform public.award_badges(new.claimant); perform public.award_badges(new."other");
  exception when others then raise warning 'award_badges failed: %', sqlerrm; end;
  return null;
end;
$$;
drop trigger if exists award_badges_vouches on public.vouches;
create trigger award_badges_vouches after insert or update of status on public.vouches for each row execute function public.trg_award_vouch();

create or replace function public.trg_award_trade()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'accepted' then
    begin perform public.award_badges(new.from_user); perform public.award_badges(new.to_user);
    exception when others then raise warning 'award_badges failed: %', sqlerrm; end;
  end if;
  return null;
end;
$$;
drop trigger if exists award_badges_trades on public.badge_trades;
create trigger award_badges_trades after update of status on public.badge_trades for each row execute function public.trg_award_trade();

create or replace function public.trg_award_token()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  begin perform public.award_badges(new.user_id);
  exception when others then raise warning 'award_badges failed: %', sqlerrm; end;
  return null;
end;
$$;
drop trigger if exists award_badges_tokens on public.tokens;
create trigger award_badges_tokens after insert or update on public.tokens for each row execute function public.trg_award_token();

create or replace function public.trg_award_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  begin perform public.award_badges(new.id);
  exception when others then raise warning 'award_badges failed: %', sqlerrm; end;
  return null;
end;
$$;
drop trigger if exists award_badges_profile_fields on public.profiles;
create trigger award_badges_profile_fields after update of bio, likes, dislikes, food, obsession, birthday, shown_badges on public.profiles
  for each row execute function public.trg_award_profile_fields();

-- Goals' words stay as they are: a witch may rename a goal and change its picture, nothing else.
create or replace function public.cr_badge_save(p_slug text, p_title text, p_how text, p_blurb text, p_art int, p_art_custom text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_slug text; v_base text; v_n int := 1; v_title text := btrim(coalesce(p_title, ''));
        v_how text := btrim(coalesce(p_how, '')); v_blurb text := btrim(coalesce(p_blurb, ''));
        v_art text;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_witch) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  if p_art_custom is not null and p_art_custom ~ '^[0-9a-z.]{1,120}$' then
    v_art := 'token:' || p_art_custom;
  elsif p_art is not null and p_art between 1 and 299 then
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
    return jsonb_build_object('ok', true, 'slug', p_slug);
  end if;
  v_base := trim(both '-' from regexp_replace(lower(v_title), '[^a-z0-9]+', '-', 'g'));
  if v_base = '' then v_base := 'badge'; end if;
  v_slug := left(v_base, 40);
  while exists (select 1 from public.badges where slug = v_slug) loop
    v_n := v_n + 1; v_slug := left(v_base, 36) || '-' || v_n;
  end loop;
  insert into public.badges (slug, title, how, blurb, art, sort, active, witch_approved)
  values (v_slug, v_title, v_how, v_blurb, v_art, (select coalesce(max(sort), 0) + 1 from public.badges), true, true);
  return jsonb_build_object('ok', true, 'slug', v_slug);
end;
$$;

-- Start everyone's current goals counting from now.
update public.profiles set working_on = working_on;
select public.award_badges(id) from public.profiles;
