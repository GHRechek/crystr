-- Voting on a motion, and creating one, now need a Registered Plaintiff: someone who
-- has filed Form 12-A (a row in public.plaintiffs). It applies to witches too.
--
-- Applied to the live database on 2026-10-22. Both functions are otherwise exactly
-- as they were; the only change is the registration check, which returns code
-- 'not_registered' (and, for voting, charges nothing and records nothing).
--
-- The motion-creating function used to be called cr_table_motion. "Tabling" a
-- motion shelves it, so it is now cr_create_motion; the old name was dropped from
-- the live database once the app had moved over.

create or replace function public.cr_cast_vote(p_motion bigint, p_side text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_closes timestamptz;
begin
  if p_side not in ('for', 'against') then
    return jsonb_build_object('ok', false, 'code', 'bad_side');
  end if;
  -- Only Registered Plaintiffs (those who have filed Form 12-A) may vote.
  if not exists (select 1 from public.plaintiffs where user_id = auth.uid()) then
    return jsonb_build_object('ok', false, 'code', 'not_registered');
  end if;
  select closes_at into v_closes from public.motions where id = p_motion;
  if not found then return jsonb_build_object('ok', false, 'code', 'missing'); end if;
  if v_closes <= now() then return jsonb_build_object('ok', false, 'code', 'closed'); end if;
  if exists (select 1 from public.motion_votes
              where motion_id = p_motion and user_id = auth.uid()) then
    return jsonb_build_object('ok', false, 'code', 'already');
  end if;
  if public.cr_balance() < 3 then return public.cr_short(3); end if;
  perform public.cr_take(3, 'Vote — ' || p_side, 'vote');
  insert into public.motion_votes (motion_id, user_id, side) values (p_motion, auth.uid(), p_side);
  return jsonb_build_object('ok', true, 'mana', public.cr_balance());
end;
$$;

create or replace function public.cr_create_motion(m_kicker text, m_title text, m_blurb text, m_hours integer, b_kicker text, b_headline text, b_standfirst text, b_body text, b_banner boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_article bigint;
        v_motion  bigint;
begin
  if not public.is_witch() then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  -- Creating a motion also needs a Registered Plaintiff (Form 12-A filed).
  if not exists (select 1 from public.plaintiffs where user_id = auth.uid()) then
    return jsonb_build_object('ok', false, 'code', 'not_registered');
  end if;
  if char_length(btrim(m_title)) = 0 then
    return jsonb_build_object('ok', false, 'code', 'no_motion');
  end if;
  if char_length(btrim(b_headline)) = 0 then
    return jsonb_build_object('ok', false, 'code', 'no_headline');
  end if;
  if char_length(btrim(b_body)) < 40 then
    return jsonb_build_object('ok', false, 'code', 'thin_briefing');
  end if;
  if m_hours not in (4, 24, 72) then
    return jsonb_build_object('ok', false, 'code', 'bad_window');
  end if;

  insert into public.articles (kind, status, kicker, headline, standfirst, body,
                               banner, banner_label, author_id, published_at)
  values ('briefing', 'published',
          upper(coalesce(nullif(btrim(b_kicker), ''), 'MOTION BRIEFING')),
          btrim(b_headline), btrim(b_standfirst), btrim(b_body), b_banner,
          case when b_banner then 'IMAGE — PENDING TILE' else '' end, auth.uid(), now())
  returning id into v_article;

  insert into public.motions (kicker, title, blurb, closes_at, briefing_id, created_by)
  values (upper(coalesce(nullif(btrim(m_kicker), ''), 'COUNCIL · MOTION')),
          btrim(m_title), btrim(m_blurb),
          now() + make_interval(hours => m_hours), v_article, auth.uid())
  returning id into v_motion;

  return jsonb_build_object('ok', true, 'motion_id', v_motion, 'briefing_id', v_article);
end;
$$;
