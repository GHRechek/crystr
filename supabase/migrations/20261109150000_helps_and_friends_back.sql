-- Two more changes to how quests pay out.
--  * Every confirmed help brings a find draw (it was a summon for every third). The summons already given
--    for helping stand; from here each help adds a normal draw.
--  * Friendship goes both ways. When someone finishes a "make friends with a ..." quest with you and you say
--    yes (or a witch scans it through), you get the friend quest for THEIR kind too, if you don't hold it:
--    an orc befriends a spellcaster, the spellcaster says yes, and the spellcaster has Orc Friend as well.
--    Only badges you lack; a repeat is not started this way.

do $do$
declare d text; n int;
begin
  select pg_get_functiondef('public.award_badges(uuid)'::regprocedure) into d;
  n := length(d);
  d := regexp_replace(d, $r$while v_minted < v_helped / 3 loop\s*insert into public\.historikal_draws \(user_id, kind, source\) values \(p_user, 'main', 'helped'\);$r$,
                         $r$while v_minted < v_helped loop insert into public.historikal_draws (user_id, kind, source) values (p_user, 'normal', 'helped');$r$);
  if length(d) = n then raise exception 'award_badges: helps patch did not apply'; end if;
  execute d;
end
$do$;

-- The friend quest that matches someone's kind, for the person they befriended.
create or replace function public.cr_friend_back(p_claimant uuid, p_other uuid, p_slug text) returns void
language plpgsql security definer set search_path = public as $$
declare c public.profiles%rowtype; v_slug text; v_given boolean := false;
begin
  if p_slug is null or not (p_slug like '%-friend' or p_slug = 'meet-witch') then return; end if;
  if not exists (select 1 from public.badges where slug = p_slug and active and peer_approved and kind <> 'goal') then return; end if;
  select * into c from public.profiles where id = p_claimant;
  if not found or p_other is null or p_other = p_claimant then return; end if;
  for v_slug in
    select s from unnest(array[
      case when c.species is not null then c.species || '-friend' end,
      case when public.cr_is_forsaken(c.species) then 'forsaken-friend' end,
      case when c.spellcaster then 'spellcaster-friend' end,
      case when c.is_witch then 'meet-witch' end]) as s
     where s is not null
       and exists (select 1 from public.badges b where b.slug = s and b.active and b.peer_approved and b.kind <> 'goal')
       and not exists (select 1 from public.user_badges ub where ub.user_id = p_other and ub.badge_slug = s)
  loop
    insert into public.badge_claims (badge_slug, claimant, other, status, answered_at) values (v_slug, p_other, p_claimant, 'confirmed', now());
    insert into public.user_badges (user_id, badge_slug) values (p_other, v_slug) on conflict do nothing;
    v_given := true;
  end loop;
  if v_given then
    begin perform public.award_badges(p_other);
    exception when others then raise warning 'award_badges failed: %', sqlerrm; end;
  end if;
end;
$$;
revoke all on function public.cr_friend_back(uuid, uuid, text) from public, anon, authenticated;

do $do$
declare d text; n int;
begin
  select pg_get_functiondef('public.cr_badge_claim(text, uuid)'::regprocedure) into d; n := length(d);
  d := replace(d, $r$perform public.cr_quest_done(auth.uid(), p_slug, 'scan');$r$, $r$perform public.cr_quest_done(auth.uid(), p_slug, 'scan'); perform public.cr_friend_back(auth.uid(), p_other, p_slug);$r$);
  if length(d) = n then raise exception 'cr_badge_claim: friend patch did not apply'; end if;
  execute d;

  select pg_get_functiondef('public.cr_badge_claim_answer(bigint, boolean)'::regprocedure) into d; n := length(d);
  d := replace(d, $r$perform public.cr_quest_done(c.claimant, c.badge_slug, 'scan');$r$, $r$perform public.cr_quest_done(c.claimant, c.badge_slug, 'scan'); perform public.cr_friend_back(c.claimant, c.other, c.badge_slug);$r$);
  if length(d) = n then raise exception 'cr_badge_claim_answer: friend patch did not apply'; end if;
  execute d;

  select pg_get_functiondef('public.cr_quest_grant(uuid, text, uuid)'::regprocedure) into d; n := length(d);
  d := replace(d, $r$perform public.cr_quest_done(p_me, p_slug, 'scan');$r$, $r$perform public.cr_quest_done(p_me, p_slug, 'scan'); perform public.cr_friend_back(p_me, p_other, p_slug);$r$);
  if length(d) = n then raise exception 'cr_quest_grant: friend patch did not apply'; end if;
  execute d;
end
$do$;
