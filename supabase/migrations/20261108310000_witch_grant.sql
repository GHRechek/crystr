-- A witch can say a quest is done for someone else, from that person's profile. Side quests and first
-- steps only (main quests count on their own). It is recorded as a confirmed claim with the witch as
-- the other party, so it shows in the person's history like any other confirmation.
create or replace function public.cr_witch_grant(p_user uuid, p_slug text)
returns jsonb language plpgsql security definer set search_path = public as $$
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
  if exists (select 1 from public.user_badges where user_id = p_user and badge_slug = p_slug) then
    return jsonb_build_object('ok', false, 'code', 'have_it');
  end if;
  insert into public.badge_claims (badge_slug, claimant, other, status, answered_at) values (p_slug, p_user, auth.uid(), 'confirmed', now());
  insert into public.user_badges (user_id, badge_slug) values (p_user, p_slug) on conflict do nothing;
  begin perform public.award_badges(p_user);
  exception when others then raise warning 'award_badges failed: %', sqlerrm; end;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.cr_witch_grant(uuid, text) from public, anon;
grant execute on function public.cr_witch_grant(uuid, text) to authenticated;
