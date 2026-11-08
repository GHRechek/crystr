-- The quest ask, face to face like a battle or a trade. You pick a quest done with someone and scan
-- their code: it opens on both phones. They hold the key: give it to you (drag it to your face) for
-- yes, or throw it away for no, within thirty seconds. On a yes the quest is theirs to have counted,
-- the badge is granted, and your key appears to unlock it from the chest. The old instant scan
-- (cr_badge_claim, cr_scan_help) is no longer callable from the app.

alter table public.encounters drop constraint if exists encounters_kind_check;
alter table public.encounters add constraint encounters_kind_check check (kind in ('trade', 'battle', 'quest'));

-- Can this person count for this quest with that one? null when yes, else why not.
create or replace function public.cr_quest_check(p_me uuid, p_slug text, p_other uuid) returns text
language plpgsql stable security definer set search_path = public as $$
declare b public.badges%rowtype; o public.profiles%rowtype;
begin
  select * into o from public.profiles where id = p_other;
  if not found or p_other = p_me then return 'bad_person'; end if;
  if p_slug = 'a-helping-hand' then
    if exists (select 1 from public.vouches where kind = 'helped' and claimant = p_me and other = p_other and status in ('pending', 'confirmed')) then
      return 'already';
    end if;
    return null;
  end if;
  select * into b from public.badges where slug = p_slug and active and peer_approved;
  if not found then return 'bad_badge'; end if;
  if b.peer_target is not null and not (
       (b.peer_target = 'spellcaster' and o.spellcaster) or (b.peer_target = 'witch' and o.is_witch)
       or (b.peer_target = 'leylines' and (o.is_witch or exists (select 1 from public.user_badges lb where lb.user_id = o.id and lb.badge_slug = 'learn-leylines')))
       or (b.peer_target not in ('spellcaster', 'witch', 'leylines') and (o.species = b.peer_target or (b.peer_target = 'forsaken' and public.cr_is_forsaken(o.species))))) then
    return 'wrong_kind';
  end if;
  if exists (select 1 from public.user_badges where user_id = p_me and badge_slug = p_slug and coalesce(tier, 1) >= b.tiers) then
    return 'have_it';
  end if;
  if b.kind = 'goal' then
    if not exists (select 1 from public.user_goals where user_id = p_me and slug = p_slug) then return 'not_picked'; end if;
    if exists (select 1 from public.badge_claims bc
                where bc.badge_slug = p_slug and bc.claimant = p_me and bc.other = p_other and bc.status = 'confirmed'
                  and bc.answered_at >= (select since from public.user_goals where user_id = p_me and slug = p_slug)) then
      return 'already';
    end if;
  end if;
  return null;
end;
$$;

-- Counting it, once they've said yes.
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
    insert into public.user_badges (user_id, badge_slug) values (p_me, p_slug) on conflict do nothing;
  end if;
  begin perform public.award_badges(p_me);
  exception when others then raise warning 'award_badges failed: %', sqlerrm; end;
end;
$$;
revoke all on function public.cr_quest_check(uuid, text, uuid), public.cr_quest_grant(uuid, text, uuid) from public, anon, authenticated;

-- Asking: from the scanner, with a quest and the person scanned.
create or replace function public.cr_quest_ask(p_slug text, p_other uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); why text; v_id bigint;
begin
  if me is null then return jsonb_build_object('ok', false, 'code', 'auth'); end if;
  why := public.cr_quest_check(me, p_slug, p_other);
  if why is not null then return jsonb_build_object('ok', false, 'code', why); end if;
  update public.encounters set stage = 'off', st = st || '{"off_by":"x"}'::jsonb, seq = seq + 1, updated_at = now()
   where (a in (me, p_other) or b in (me, p_other)) and stage not in ('done', 'off', 'end');
  insert into public.encounters (kind, a, b, stage, st) values ('quest', me, p_other, 'invite', jsonb_build_object('slug', p_slug))
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

-- What each side sees.
create or replace function public.cr_quest_view(p_id bigint) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare e public.encounters%rowtype; me uuid := auth.uid(); side text; them public.profiles%rowtype; asker public.profiles%rowtype;
        b public.badges%rowtype; v_slug text; left_s int;
begin
  select * into e from public.encounters where id = p_id and kind = 'quest';
  if not found or me not in (e.a, e.b) then return jsonb_build_object('ok', false); end if;
  side := case when me = e.a then 'a' else 'b' end;
  select * into them from public.profiles where id = case when side = 'a' then e.b else e.a end;
  select * into asker from public.profiles where id = e.a;
  v_slug := e.st->>'slug';
  select * into b from public.badges where slug = v_slug;
  left_s := greatest(0, 30 - extract(epoch from now() - e.created_at)::int);
  return jsonb_build_object(
    'ok', true, 'id', e.id, 'kind', 'quest', 'stage', e.stage, 'seq', e.seq, 'me', side,
    'them', jsonb_build_object('handle', them.handle, 'name', them.display_name),
    'slug', v_slug, 'title', b.title, 'how', b.how, 'art', b.art, 'tiers', coalesce(b.tiers, 1),
    'asker', jsonb_build_object('handle', asker.handle, 'id', asker.id, 'face', asker.avatar_config),
    'left', left_s);
end;
$$;

-- Their answer: give the key (yes) or throw it away (no), in time.
create or replace function public.cr_quest_answer(p_id bigint, p_yes boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare e public.encounters%rowtype; why text;
begin
  select * into e from public.encounters where id = p_id and kind = 'quest' for update;
  if not found or e.b <> auth.uid() or e.stage <> 'invite' then return jsonb_build_object('ok', false, 'code', 'gone'); end if;
  if e.created_at < now() - interval '32 seconds' then
    update public.encounters set stage = 'off', st = st || '{"off_by":"time"}'::jsonb, seq = seq + 1, updated_at = now() where id = p_id;
    return jsonb_build_object('ok', false, 'code', 'late');
  end if;
  if p_yes then
    why := public.cr_quest_check(e.a, e.st->>'slug', e.b);
    if why is not null then
      update public.encounters set stage = 'off', st = st || jsonb_build_object('off_by', 'x', 'why', why), seq = seq + 1, updated_at = now() where id = p_id;
      return jsonb_build_object('ok', false, 'code', why);
    end if;
    perform public.cr_quest_grant(e.a, e.st->>'slug', e.b);
  end if;
  update public.encounters set stage = case when p_yes then 'yes' else 'no' end, seq = seq + 1, updated_at = now() where id = p_id;
  return jsonb_build_object('ok', true, 'yes', p_yes);
end;
$$;

-- Done with it: the asker has opened the chest (or seen the no), or it ran out of time.
create or replace function public.cr_quest_end(p_id bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare e public.encounters%rowtype;
begin
  select * into e from public.encounters where id = p_id and kind = 'quest' for update;
  if not found or auth.uid() not in (e.a, e.b) then return jsonb_build_object('ok', false); end if;
  if e.stage = 'invite' then
    -- Walked away from, or out of time: if it's the one asked, that's a no.
    update public.encounters set stage = case when auth.uid() = e.b and e.created_at >= now() - interval '32 seconds' then 'no' else 'off' end,
           st = st || jsonb_build_object('off_by', case when auth.uid() = e.a then 'me' else 'them' end), seq = seq + 1, updated_at = now() where id = p_id;
  elsif auth.uid() = e.a and e.stage in ('yes', 'no') then
    update public.encounters set stage = case when e.stage = 'yes' then 'done' else 'off' end, seq = seq + 1, updated_at = now() where id = p_id;
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.cr_quest_ask(text, uuid), public.cr_quest_view(bigint), public.cr_quest_answer(bigint, boolean), public.cr_quest_end(bigint) from public, anon;
grant execute on function public.cr_quest_ask(text, uuid), public.cr_quest_view(bigint), public.cr_quest_answer(bigint, boolean), public.cr_quest_end(bigint) to authenticated;

-- Finding the one you're in: a quest ask past its thirty seconds is over, and once the one asked has
-- answered, it stays open only on the asker's phone.
create or replace function public.cr_enc_mine() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce((select jsonb_build_object('id', id, 'kind', kind, 'seq', seq) from public.encounters
                    where (a = auth.uid() or b = auth.uid()) and stage not in ('done', 'off', 'end')
                      and updated_at > now() - interval '20 minutes'
                      and not (kind = 'quest' and stage = 'invite' and created_at < now() - interval '35 seconds')
                      and not (kind = 'quest' and stage <> 'invite' and b = auth.uid())
                    order by id desc limit 1), 'null'::jsonb);
$$;

-- No more counting on a scan alone.
revoke execute on function public.cr_badge_claim(text, uuid), public.cr_scan_help(uuid) from authenticated;
