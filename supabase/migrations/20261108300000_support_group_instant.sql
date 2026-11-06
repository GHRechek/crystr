-- Support Group completes the moment you scan a witch's code.
alter table public.badges add column if not exists scan_instant boolean not null default false;
update public.badges set scan_instant = true where slug = 'support-group';

create or replace function public.cr_badge_claim(p_slug text, p_other uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare b public.badges%rowtype; v_a uuid; v_b uuid; v_thread bigint; v_id bigint; v_body text; o public.profiles%rowtype;
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
       or (b.peer_target not in ('spellcaster', 'witch', 'leylines') and o.species = b.peer_target)) then
    return jsonb_build_object('ok', false, 'code', 'wrong_kind');
  end if;
  if exists (select 1 from public.user_badges where user_id = auth.uid() and badge_slug = p_slug and coalesce(tier, 1) >= b.tiers) then
    return jsonb_build_object('ok', false, 'code', 'have_it');
  end if;
  -- An epic quest only counts while it is picked, and each person counts once.
  -- A quest a witch's scan completes on the spot: no whisper, no waiting.
  if b.scan_instant then
    insert into public.badge_claims (badge_slug, claimant, other, status, answered_at) values (p_slug, auth.uid(), p_other, 'confirmed', now());
    insert into public.user_badges (user_id, badge_slug) values (auth.uid(), p_slug) on conflict do nothing;
    begin perform public.award_badges(auth.uid());
    exception when others then raise warning 'award_badges failed: %', sqlerrm; end;
    return jsonb_build_object('ok', true, 'instant', true);
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
  if exists (select 1 from public.badge_claims where badge_slug = p_slug and claimant = auth.uid() and other = p_other and status = 'pending') then
    return jsonb_build_object('ok', false, 'code', 'already');
  end if;
  if (select count(*) from public.badge_claims where claimant = auth.uid() and status = 'pending') >= 10 then
    return jsonb_build_object('ok', false, 'code', 'too_many');
  end if;

  v_a := least(auth.uid(), p_other); v_b := greatest(auth.uid(), p_other);
  insert into public.dm_threads (user_a, user_b) values (v_a, v_b)
  on conflict (user_a, user_b) do update set user_a = excluded.user_a returning id into v_thread;

  insert into public.badge_claims (badge_slug, claimant, other) values (p_slug, auth.uid(), p_other) returning id into v_id;
  v_body := 'Quest: ' || b.title || '. ' || b.how || ' Did that happen with you?';
  insert into public.dm_messages (thread_id, sender_id, body, claim_id) values (v_thread, auth.uid(), v_body, v_id);
  update public.dm_threads set last_message_at = now() where id = v_thread;
  return jsonb_build_object('ok', true, 'thread_id', v_thread);
end;
$$;
