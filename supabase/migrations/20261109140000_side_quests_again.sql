-- Three changes to how Historikals come:
--  * Legendaries are rare for real: one in a thousand on a summon (the gold screen), one in five thousand on
--    a find. The rest of each table is as it was, with the legendary's share going to epic.
--  * A find draw for every side quest finished, not every third.
--  * A side quest can be done again a month after it was last done: no new badge (it is held already), but
--    the draw comes again. Side quests here are the one-step quests a witch likes or someone confirms;
--    first steps, main quests and the counting badges keep their own rules. Each repeat is a row in
--    quest_repeats, written wherever a side quest would have been awarded to someone who already holds it.

-- ---------------------------------------------------------------- the odds
create or replace function public.cr_roll_historikal() returns text
language plpgsql security definer set search_path = public as $$
declare r float := random(); v_rar text; v text;
begin
  v_rar := case when r < 0.0002 then 'legendary' when r < 0.05 then 'epic' when r < 0.16 then 'rare' when r < 0.41 then 'uncommon' else 'common' end;
  if v_rar = 'legendary' then
    select slug into v from public.badge_kinds where active and droppable and rarity = 'legendary' and not public.cr_legendary_taken(slug) order by random() limit 1;
    if v is null then v_rar := 'epic'; end if;
  end if;
  if v is null then select slug into v from public.badge_kinds where active and droppable and rarity = v_rar order by random() limit 1; end if;
  if v is null then select slug into v from public.badge_kinds where active and droppable and rarity <> 'legendary' order by random() limit 1; end if;
  return v;
end;
$$;
revoke all on function public.cr_roll_historikal() from public, anon, authenticated;

create or replace function public.cr_roll_main_historikal() returns text
language plpgsql security definer set search_path = public as $$
declare v text; r float := random();
        v_rar text := case when r < 0.001 then 'legendary' when r < 0.12 then 'epic' when r < 0.70 then 'rare' else 'uncommon' end;
begin
  if v_rar = 'legendary' then
    select slug into v from public.badge_kinds where active and droppable and rarity = 'legendary' and not public.cr_legendary_taken(slug) order by random() limit 1;
    if v is null then v_rar := 'epic'; end if;
  end if;
  if v is null then select slug into v from public.badge_kinds where active and droppable and rarity = v_rar order by random() limit 1; end if;
  return coalesce(v, public.cr_roll_historikal());
end;
$$;
revoke all on function public.cr_roll_main_historikal() from public, anon, authenticated;

-- ---------------------------------------------------------------- repeats
create table if not exists public.quest_repeats (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  badge_slug text not null references public.badges(slug) on delete cascade,
  done_at    timestamptz not null default now(),
  via        text not null check (via in ('witch', 'scan', 'grant'))
);
create index if not exists quest_repeats_user on public.quest_repeats (user_id, badge_slug, done_at);
alter table public.quest_repeats enable row level security;
revoke all on public.quest_repeats from anon, authenticated;
grant select on public.quest_repeats to authenticated;
create policy quest_repeats_read on public.quest_repeats for select to authenticated using (user_id = (select auth.uid()));

-- Whether this person can do this side quest again: held, one-step, a witch's or someone's say-so, and a
-- month since it was last done (first earned, or last repeated).
create or replace function public.cr_quest_again_ok(p_user uuid, p_slug text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.badges b join public.user_badges ub on ub.badge_slug = b.slug and ub.user_id = p_user
     where b.slug = p_slug and b.active and b.kind = 'quest' and not coalesce(b.first_step, false) and b.tiers = 1
       and (b.witch_approved or b.peer_approved)
       and greatest(ub.earned_at, coalesce((select max(r.done_at) from public.quest_repeats r where r.user_id = p_user and r.badge_slug = p_slug), ub.earned_at))
           <= now() - interval '30 days');
$$;
revoke all on function public.cr_quest_again_ok(uuid, text) from public, anon;
grant execute on function public.cr_quest_again_ok(uuid, text) to authenticated;

-- Record a repeat, if one is due. True when it was.
create or replace function public.cr_quest_repeat(p_user uuid, p_slug text, p_via text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not public.cr_quest_again_ok(p_user, p_slug) then return false; end if;
  insert into public.quest_repeats (user_id, badge_slug, via) values (p_user, p_slug, p_via);
  return true;
end;
$$;
revoke all on function public.cr_quest_repeat(uuid, text, text) from public, anon, authenticated;

-- A side quest awarded to someone: the badge if they lack it, else a repeat if one is due.
create or replace function public.cr_quest_done(p_user uuid, p_slug text, p_via text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.user_badges where user_id = p_user and badge_slug = p_slug) then
    perform public.cr_quest_repeat(p_user, p_slug, p_via);
  else
    insert into public.user_badges (user_id, badge_slug) values (p_user, p_slug) on conflict do nothing;
  end if;
end;
$$;
revoke all on function public.cr_quest_done(uuid, text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------- the draws
create or replace function public.cr_quest_draws(p_user uuid) returns int
language plpgsql security definer set search_path = public as $$
declare v_steps int; v_side int; v_have int; n int := 0;
begin
  select count(*) into v_steps from public.user_badges ub join public.badges b on b.slug = ub.badge_slug
   where ub.user_id = p_user and b.first_step and ub.earned_at >= '2026-11-07 17:41:35.652731+00';
  select count(*) into v_side from public.user_badges ub join public.badges b on b.slug = ub.badge_slug
   where ub.user_id = p_user and b.kind = 'quest' and not coalesce(b.first_step, false) and ub.earned_at >= '2026-11-07 17:41:35.652731+00';
  v_side := v_side + (select count(*) from public.quest_repeats where user_id = p_user);
  select count(*) into v_have from public.historikal_draws where user_id = p_user and source = 'first_step';
  while v_have < v_steps loop
    insert into public.historikal_draws (user_id, kind, source) values (p_user, 'normal', 'first_step'); v_have := v_have + 1; n := n + 1;
  end loop;
  select count(*) into v_have from public.historikal_draws where user_id = p_user and source = 'side';
  while v_have < v_side loop
    insert into public.historikal_draws (user_id, kind, source) values (p_user, 'normal', 'side'); v_have := v_have + 1; n := n + 1;
  end loop;
  return n;
end;
$$;
revoke all on function public.cr_quest_draws(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------- where side quests are awarded
-- A witch likes a badge request: the badge, or a repeat; and the draws are worked out at once.
create or replace function public.trg_badge_request_liked() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_author uuid; v_badge text;
begin
  select author_id, badge_slug into v_author, v_badge from public.posts where id = new.post_id;
  if v_badge is null or v_author is null or v_author = new.user_id then return new; end if;
  if not exists (select 1 from public.profiles where id = new.user_id and is_witch) then return new; end if;
  if not exists (select 1 from public.badges where slug = v_badge and active and witch_approved) then return new; end if;
  perform public.cr_quest_done(v_author, v_badge, 'witch');
  begin perform public.award_badges(v_author);
  exception when others then raise warning 'award_badges failed: %', sqlerrm; end;
  return new;
end;
$$;

-- A badge request post may ask for a badge held already, when it can be done again.
create or replace function public.cr_create_post(p_body text, p_has_image boolean default false, p_badge text default null, p_audio text default null, p_audio_seconds int default null, p_image text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_has_image boolean := p_has_image or p_image is not null;
        v_cost int;
        v_id bigint;
        v_badge text := null;
begin
  v_cost := 5 + (case when v_has_image then 3 else 0 end) + (case when p_audio is not null then 10 else 0 end);
  if char_length(btrim(coalesce(p_body, ''))) = 0 and p_audio is null and p_image is null then
    return jsonb_build_object('ok', false, 'code', 'empty');
  end if;
  if p_image is not null and (p_image not like (auth.uid()::text || '/%')
       or not exists (select 1 from storage.objects where bucket_id = 'proofs' and name = p_image)) then
    return jsonb_build_object('ok', false, 'code', 'bad_image');
  end if;
  if p_audio is not null and (p_audio not like ('p/' || auth.uid()::text || '/%') or coalesce(p_audio_seconds, 0) not between 1 and 120
       or not exists (select 1 from storage.objects where bucket_id = 'voice' and name = p_audio)) then
    return jsonb_build_object('ok', false, 'code', 'bad_audio');
  end if;
  if p_badge is not null then
    if not exists (select 1 from public.badges where slug = p_badge and active and witch_approved) then
      return jsonb_build_object('ok', false, 'code', 'bad_badge');
    end if;
    if exists (select 1 from public.user_badges where user_id = auth.uid() and badge_slug = p_badge)
       and not public.cr_quest_again_ok(auth.uid(), p_badge) then
      return jsonb_build_object('ok', false, 'code', 'have_it');
    end if;
    v_badge := p_badge;
  end if;
  if public.cr_balance() < v_cost then return public.cr_short(v_cost); end if;
  perform public.cr_take(v_cost, 'Post' || (case when p_audio is not null then ' with voice' when v_has_image then ' with image' else '' end), 'post');
  insert into public.posts (author_id, body, has_image, cost, badge_slug, audio_path, audio_seconds, proof_path)
  values (auth.uid(), btrim(coalesce(p_body, '')), v_has_image, v_cost, v_badge, p_audio, case when p_audio is null then null else p_audio_seconds end, p_image)
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id, 'cost', v_cost, 'mana', public.cr_balance());
end;
$$;
revoke all on function public.cr_create_post(text, boolean, text, text, int, text) from public, anon;
grant execute on function public.cr_create_post(text, boolean, text, text, int, text) to authenticated;

-- Scanning someone offers the quests they can confirm: those not held, and those that can be done again.
create or replace function public.cr_scan_quests(p_other uuid) returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(b.slug order by (b.kind = 'goal') desc, b.sort), '{}')
    from public.badges b, public.profiles o
   where o.id = p_other and p_other <> auth.uid() and auth.uid() is not null
     and b.active and b.peer_approved
     and (b.peer_target is null
          or (b.peer_target = 'spellcaster' and o.spellcaster)
          or (b.peer_target = 'witch' and o.is_witch)
          or (b.peer_target = 'leylines' and (o.is_witch or exists (select 1 from public.user_badges lb where lb.user_id = o.id and lb.badge_slug = 'learn-leylines')))
          or (b.peer_target not in ('spellcaster', 'witch', 'leylines') and (o.species = b.peer_target or (b.peer_target = 'forsaken' and public.cr_is_forsaken(o.species)))))
     and (not exists (select 1 from public.user_badges ub where ub.user_id = auth.uid() and ub.badge_slug = b.slug and coalesce(ub.tier, 1) >= b.tiers)
          or public.cr_quest_again_ok(auth.uid(), b.slug))
     and not exists (select 1 from public.badge_claims c where c.badge_slug = b.slug and c.claimant = auth.uid() and c.other = p_other and c.status = 'pending')
     and (b.kind <> 'goal' or (
          exists (select 1 from public.user_goals g where g.user_id = auth.uid() and g.slug = b.slug)
          and not exists (select 1 from public.badge_claims c, public.user_goals g
                           where g.user_id = auth.uid() and g.slug = b.slug and c.badge_slug = b.slug
                             and c.claimant = auth.uid() and c.other = p_other and c.status = 'confirmed' and c.answered_at >= g.since)));
$$;

create or replace function public.cr_badge_claim(p_slug text, p_other uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare b public.badges%rowtype; v_a uuid; v_b uuid; v_thread bigint; o public.profiles%rowtype;
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
       or (b.peer_target not in ('spellcaster', 'witch', 'leylines') and (o.species = b.peer_target or (b.peer_target = 'forsaken' and public.cr_is_forsaken(o.species))))) then
    return jsonb_build_object('ok', false, 'code', 'wrong_kind');
  end if;
  if exists (select 1 from public.user_badges where user_id = auth.uid() and badge_slug = p_slug and coalesce(tier, 1) >= b.tiers)
     and not public.cr_quest_again_ok(auth.uid(), p_slug) then
    return jsonb_build_object('ok', false, 'code', 'have_it');
  end if;
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

  update public.badge_claims set status = 'confirmed', answered_at = now()
   where badge_slug = p_slug and claimant = auth.uid() and other = p_other and status = 'pending';
  if not found then
    insert into public.badge_claims (badge_slug, claimant, other, status, answered_at) values (p_slug, auth.uid(), p_other, 'confirmed', now());
  end if;
  if b.kind <> 'goal' then
    perform public.cr_quest_done(auth.uid(), p_slug, 'scan');
  end if;
  begin perform public.award_badges(auth.uid());
  exception when others then raise warning 'award_badges failed: %', sqlerrm; end;

  v_a := least(auth.uid(), p_other); v_b := greatest(auth.uid(), p_other);
  insert into public.dm_threads (user_a, user_b) values (v_a, v_b)
  on conflict (user_a, user_b) do update set user_a = excluded.user_a returning id into v_thread;
  insert into public.dm_messages (thread_id, sender_id, body)
  values (v_thread, auth.uid(), 'Quest: ' || b.title || '. Done with you: you showed me your code, so it counted.');
  update public.dm_threads set last_message_at = now() where id = v_thread;
  return jsonb_build_object('ok', true, 'instant', true);
end;
$$;

create or replace function public.cr_badge_claim_answer(p_id bigint, p_yes boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c public.badge_claims%rowtype; v_thread bigint; v_kind text;
begin
  select * into c from public.badge_claims where id = p_id for update;
  if not found or c.other <> auth.uid() or c.status <> 'pending' then
    return jsonb_build_object('ok', false, 'code', 'missing');
  end if;
  update public.badge_claims set status = case when p_yes then 'confirmed' else 'declined' end, answered_at = now() where id = p_id;
  if p_yes then
    select kind into v_kind from public.badges where slug = c.badge_slug;
    if coalesce(v_kind, 'quest') <> 'goal' then
      perform public.cr_quest_done(c.claimant, c.badge_slug, 'scan');
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

create or replace function public.cr_quest_grant(p_me uuid, p_slug text, p_other uuid) returns void
language plpgsql security definer set search_path = public as $$
declare b public.badges%rowtype;
begin
  if p_slug = 'a-helping-hand' then
    insert into public.vouches (kind, claimant, other, status, answered_at) values ('helped', p_me, p_other, 'confirmed', now());
    perform public.award_badges(p_me);
    perform public.award_badges(p_other);
    return;
  end if;
  select * into b from public.badges where slug = p_slug;
  update public.badge_claims set status = 'confirmed', answered_at = now()
   where badge_slug = p_slug and claimant = p_me and other = p_other and status = 'pending';
  if not found then
    insert into public.badge_claims (badge_slug, claimant, other, status, answered_at) values (p_slug, p_me, p_other, 'confirmed', now());
  end if;
  if b.kind <> 'goal' then
    perform public.cr_quest_done(p_me, p_slug, 'scan');
  end if;
  begin perform public.award_badges(p_me);
  exception when others then raise warning 'award_badges failed: %', sqlerrm; end;
end;
$$;

create or replace function public.cr_witch_grant(p_user uuid, p_slug text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare b public.badges%rowtype;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'auth'); end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and is_witch) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  if p_user is null or p_user = auth.uid() or not exists (select 1 from public.profiles where id = p_user) then
    return jsonb_build_object('ok', false, 'code', 'bad_person');
  end if;
  select * into b from public.badges where slug = p_slug and active and kind <> 'goal';
  if not found then return jsonb_build_object('ok', false, 'code', 'bad_badge'); end if;
  if exists (select 1 from public.user_badges where user_id = p_user and badge_slug = p_slug)
     and not public.cr_quest_again_ok(p_user, p_slug) then
    return jsonb_build_object('ok', false, 'code', 'have_it');
  end if;
  insert into public.badge_claims (badge_slug, claimant, other, status, answered_at) values (p_slug, p_user, auth.uid(), 'confirmed', now());
  perform public.cr_quest_done(p_user, p_slug, 'grant');
  begin perform public.award_badges(p_user);
  exception when others then raise warning 'award_badges failed: %', sqlerrm; end;
  return jsonb_build_object('ok', true);
end;
$$;
