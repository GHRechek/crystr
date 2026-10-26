-- Sign-up: terms, then a welcome page (face, name, registry) before the rest of the app.
-- New people start at 5 mana and cannot hold more than 10 until they have registered.
-- Everyone already in is marked as onboarded, so nothing changes for them.

alter table public.profiles add column if not exists onboarded boolean not null default false;
update public.profiles set onboarded = true;
alter table public.profiles alter column mana set default 5;

-- The flag is ours to set, not the client's (same guard as mana and witch status).
create or replace function public.guard_profile_economy()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if coalesce(current_setting('crystr.economy', true), '') <> 'on' then
    new.mana        := old.mana;
    new.spent_total := old.spent_total;
    new.is_witch    := old.is_witch;
    new.onboarded   := old.onboarded;
  end if;
  return new;
end;
$function$;

-- Until they have registered, at most 10 mana.
create or replace function public.cap_unregistered_mana()
 returns trigger
 language plpgsql
 set search_path to 'public'
as $function$
begin
  if not new.onboarded and new.mana > 10 then
    new.mana := 10;
  end if;
  return new;
end;
$function$;

create trigger zz_cap_unregistered_mana
  before insert or update of mana, onboarded on public.profiles
  for each row execute function public.cap_unregistered_mana();

-- Registering to use the app: the district and species codes, nothing else. Voting no
-- longer asks for it separately, because nobody gets past the welcome page without it.
create or replace function public.cr_register(p_district text, p_district_code text, p_species text, p_species_code text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_ok boolean;
        v_name text;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  if exists (select 1 from public.profiles where id = auth.uid() and onboarded) then
    return jsonb_build_object('ok', true, 'already', true);
  end if;

  if p_district not in ('city', 'outland', 'gate')
     or p_species not in ('orc', 'elf', 'human', 'shifter', 'planar')
     or char_length(btrim(coalesce(p_district_code, ''))) = 0
     or char_length(btrim(coalesce(p_species_code, ''))) = 0
     or char_length(p_district_code) > 24 or char_length(p_species_code) > 24 then
    return jsonb_build_object('ok', false, 'code', 'incomplete');
  end if;

  select exists (select 1 from public.plaintiff_codes
                  where kind = 'adc' and key = p_district
                    and position(lower(code) in lower(p_district_code)) > 0) into v_ok;
  if not v_ok then return jsonb_build_object('ok', false, 'code', 'bad_adc'); end if;

  select exists (select 1 from public.plaintiff_codes
                  where kind = 'sdc' and key = p_species
                    and position(lower(code) in lower(p_species_code)) > 0) into v_ok;
  if not v_ok then return jsonb_build_object('ok', false, 'code', 'bad_sdc'); end if;

  select coalesce(nullif(btrim(display_name), ''), handle) into v_name from public.profiles where id = auth.uid();

  insert into public.plaintiffs (user_id) values (auth.uid()) on conflict do nothing;
  insert into public.plaintiff_forms (user_id, answers)
  values (auth.uid(), jsonb_build_object('name', v_name, 'district', p_district, 'species', p_species))
  on conflict (user_id) do nothing;

  perform set_config('crystr.economy', 'on', true);
  update public.profiles set onboarded = true, updated_at = now() where id = auth.uid();
  perform public.award_badges(auth.uid());
  return jsonb_build_object('ok', true);
end;
$function$;

-- Voting and creating motions no longer need a separate registration.
create or replace function public.cr_cast_vote(p_motion bigint, p_side text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_closes timestamptz;
begin
  if p_side not in ('for', 'against') then
    return jsonb_build_object('ok', false, 'code', 'bad_side');
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
$function$;

create or replace function public.cr_create_motion(m_kicker text, m_title text, m_blurb text, m_hours integer, b_kicker text, b_headline text, b_standfirst text, b_body text, b_banner boolean DEFAULT false)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_article bigint;
        v_motion  bigint;
begin
  if not public.is_witch() then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
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
$function$;
