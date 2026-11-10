-- A witch can cross off one of their own quests: a small back-room button on the quest, in the quest list.
-- Done through cr_quest_done, so a quest held already counts as a repeat when one is due.
create or replace function public.cr_witch_self_done(p_slug text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare b public.badges%rowtype;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'auth'); end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and is_witch) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  select * into b from public.badges where slug = p_slug and active and kind <> 'goal';
  if not found then return jsonb_build_object('ok', false, 'code', 'bad_badge'); end if;
  if exists (select 1 from public.user_badges where user_id = auth.uid() and badge_slug = p_slug)
     and not public.cr_quest_again_ok(auth.uid(), p_slug) then
    return jsonb_build_object('ok', false, 'code', 'have_it');
  end if;
  perform public.cr_quest_done(auth.uid(), p_slug, 'grant');
  begin perform public.award_badges(auth.uid());
  exception when others then raise warning 'award_badges failed: %', sqlerrm; end;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.cr_witch_self_done(text) from public, anon;
grant execute on function public.cr_witch_self_done(text) to authenticated;
