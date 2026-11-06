-- Two kinds of badge.
--  goal   a long-term thing: whisper to five people, reply on five posts, get ten likes on one post.
--         Only counts while it is on the person's Working On list (three at a time), and nothing
--         else goes on that list.
--  quest  everything else: some the system gives out by itself the moment they are true (be in
--         someone's Top 5, fill your Top 5, ...), some a witch approves from a post. Never listed.
alter table public.badges add column if not exists kind text not null default 'quest' check (kind in ('goal', 'quest'));

update public.badges set kind = 'goal' where slug in (
  'joined-in', 'whisper-web', 'a-voice-in-council', 'got-replied', 'first-like-got', 'a-helping-hand',
  'first-like-given', 'first-words', 'show-and-tell', 'three-days', 'meet-in-person', 'full-well');

-- "Get a like on a post" becomes "get ten likes on one post".
update public.badges set metric = 'likes_on_one', steps = null, tiers = 1, threshold = 10,
       how = 'Get ten likes on one post.', blurb = 'Got ten likes on one post.' where slug = 'first-like-got';

-- Quests are checked all the time; goals only while they are listed. Anything already finished
-- at its top step is skipped.
create or replace function public.award_badges(p_user uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare b record; ok boolean; n int := 0; v_count bigint; v_tier int; v_have int;
        v_helped int; v_minted int; v_kind text; v_work jsonb;
begin
  select coalesce(working_on, '[]'::jsonb) into v_work from public.profiles where id = p_user;
  v_work := coalesce(v_work, '[]'::jsonb);
  for b in select bd.slug, bd.tiers, bd.metric, bd.threshold, bd.steps from public.badges bd
            where bd.active
              and (bd.kind <> 'goal' or v_work ? ('a:' || bd.slug))
              and not exists (select 1 from public.user_badges ub
                               where ub.user_id = p_user and ub.badge_slug = bd.slug and coalesce(ub.tier, 1) >= bd.tiers) loop
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

-- A witch's like on a request is the approval; the badge does not have to be listed.
create or replace function public.trg_badge_request_liked()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_author uuid; v_badge text;
begin
  select author_id, badge_slug into v_author, v_badge from public.posts where id = new.post_id;
  if v_badge is null or v_author is null or v_author = new.user_id then return new; end if;
  if not exists (select 1 from public.profiles where id = new.user_id and is_witch) then return new; end if;
  if not exists (select 1 from public.badges where slug = v_badge and active and witch_approved) then return new; end if;
  insert into public.user_badges (user_id, badge_slug) values (v_author, v_badge) on conflict do nothing;
  return new;
end;
$$;

-- Working On: up to three goals, and only goals.
create or replace function public.cr_clean_working_on(p_list jsonb)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare e text; out jsonb := '[]'::jsonb; n int := 0; seen text[] := '{}';
begin
  if p_list is null or jsonb_typeof(p_list) <> 'array' then return '[]'::jsonb; end if;
  for e in select jsonb_array_elements_text(p_list) loop
    exit when n >= 3;
    continue when e = any(seen);
    if e ~ '^a:[a-z0-9-]{1,40}$'
       and exists (select 1 from public.badges where slug = substr(e, 3) and active and kind = 'goal') then
      out := out || to_jsonb(e); seen := seen || e; n := n + 1;
    end if;
  end loop;
  return out;
end;
$$;
revoke all on function public.cr_clean_working_on(jsonb) from public, anon, authenticated;

alter table public.profiles alter column working_on set default '["a:a-helping-hand","a:joined-in","a:whisper-web"]'::jsonb;
update public.profiles set working_on = public.cr_clean_working_on(working_on);
update public.profiles set working_on = '["a:a-helping-hand","a:joined-in","a:whisper-web"]'::jsonb where working_on = '[]'::jsonb;

select public.award_badges(id) from public.profiles;
