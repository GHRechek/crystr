-- Birthday badges. On their birthday, or the first time they open the app after it has
-- passed, everyone with a birthday on the registry gets one tradable badge drawn at random
-- from the same pool the helping-hand badges come from, worth the same two max mana. Once
-- a year, never twice.
--
--  * badge_items.occasion says why a tradable badge was minted: 'helped' or 'birthday'
--    (null on tokens). award_badges counts only the helped ones against the helps, so a
--    birthday badge never costs anyone a helping-hand badge.
--  * profiles.birthday_badge_year is the last year one was given, so the app can tell from
--    the profile it already holds whether to ask at all.
--  * cr_birthday_badge() does the giving. The app calls it when the profile says one is
--    due; it checks again itself, so calling it early or twice gives nothing.
--  * Anyone whose birthday this year already went by before today is marked as done for
--    the year: the badge is for birthdays from now on, not for the one that passed.

alter table public.badge_items add column if not exists occasion text
  check (occasion is null or occasion in ('helped', 'birthday'));
update public.badge_items set occasion = 'helped' where kind = 'tradable' and occasion is null;

alter table public.profiles add column if not exists birthday_badge_year int;

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
  -- minted for this person for helping (birthday badges are not counted), so giving one
  -- away does not bring it back.
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

-- The anniversary of a birthday in a given year (a 29th of February falls on the 28th).
create or replace function public.birthday_in(p_birthday date, p_year int)
returns date language sql immutable set search_path = public as $$
  select (p_birthday + make_interval(years => p_year - extract(year from p_birthday)::int))::date;
$$;
revoke all on function public.birthday_in(date, int) from public, anon, authenticated;

create or replace function public.cr_birthday_badge()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_bday date; v_last int; v_on boolean; v_year int := extract(year from current_date)::int;
        v_kind text; v_title text; v_id bigint;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  select birthday, birthday_badge_year, onboarded into v_bday, v_last, v_on
    from public.profiles where id = auth.uid();
  if not found or v_bday is null or not v_on then return jsonb_build_object('ok', true, 'given', false); end if;
  if v_last is not null and v_last >= v_year then return jsonb_build_object('ok', true, 'given', false); end if;
  if public.birthday_in(v_bday, v_year) > current_date then return jsonb_build_object('ok', true, 'given', false); end if;

  select slug, title into v_kind, v_title from public.badge_kinds where active order by random() limit 1;
  if v_kind is null then return jsonb_build_object('ok', false, 'code', 'no_kinds'); end if;

  perform set_config('crystr.economy', 'on', true);
  -- Told on the spot by the app, so it is marked seen and not announced again later.
  insert into public.badge_items (kind, kind_slug, earned_by, owner_id, occasion, seen)
  values ('tradable', v_kind, auth.uid(), auth.uid(), 'birthday', true)
  returning id into v_id;
  update public.profiles set birthday_badge_year = v_year, updated_at = now() where id = auth.uid();
  return jsonb_build_object('ok', true, 'given', true, 'id', v_id, 'slug', v_kind, 'title', v_title, 'year', v_year);
end;
$$;
revoke all on function public.cr_birthday_badge() from public, anon;
grant execute on function public.cr_birthday_badge() to authenticated;

-- Birthdays already gone by this year do not count.
update public.profiles
   set birthday_badge_year = extract(year from current_date)::int
 where birthday is not null
   and birthday_badge_year is null
   and public.birthday_in(birthday, extract(year from current_date)::int) < current_date;
