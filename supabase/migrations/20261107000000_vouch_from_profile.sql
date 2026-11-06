-- Saying it from someone's profile: they show a badge they are working on, and anyone can tap it
-- and say "they helped me" or "we met up". No whisper thread needed.
--  * helped: the person helped is the one saying it, which is the confirmation, so it counts at once.
--  * meetup: waits for the other person to say yes, as before.
-- vouches.badge_slug remembers which badge it was said about.
alter table public.vouches add column if not exists badge_slug text references public.badges (slug) on delete set null;

create or replace function public.cr_vouch_from_profile(p_kind text, p_person uuid, p_badge text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_badge text := null;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'auth'); end if;
  if p_kind not in ('meetup', 'helped') then return jsonb_build_object('ok', false, 'code', 'bad_kind'); end if;
  if p_person is null or p_person = auth.uid() or not exists (select 1 from public.profiles where id = p_person) then
    return jsonb_build_object('ok', false, 'code', 'bad_person');
  end if;
  if p_badge is not null and exists (select 1 from public.badges where slug = p_badge) then v_badge := p_badge; end if;

  if p_kind = 'helped' then
    -- They helped me: claimant is the helper (them), other is the one helped (me).
    if exists (select 1 from public.vouches where kind = 'helped' and claimant = p_person and other = auth.uid()
                and status in ('pending', 'confirmed')) then
      return jsonb_build_object('ok', false, 'code', 'already');
    end if;
    insert into public.vouches (kind, claimant, other, status, answered_at, badge_slug)
      values ('helped', p_person, auth.uid(), 'confirmed', now(), v_badge);
    perform public.award_badges(p_person);
    perform public.award_badges(auth.uid());
  else
    if exists (select 1 from public.vouches
                where kind = 'meetup' and status in ('pending', 'confirmed')
                  and ((claimant = auth.uid() and other = p_person) or (claimant = p_person and other = auth.uid()))) then
      return jsonb_build_object('ok', false, 'code', 'already');
    end if;
    insert into public.vouches (kind, claimant, other, badge_slug) values ('meetup', auth.uid(), p_person, v_badge);
  end if;
  return jsonb_build_object('ok', true, 'kind', p_kind);
end;
$$;
revoke all on function public.cr_vouch_from_profile(text, uuid, text) from public, anon;
grant execute on function public.cr_vouch_from_profile(text, uuid, text) to authenticated;
