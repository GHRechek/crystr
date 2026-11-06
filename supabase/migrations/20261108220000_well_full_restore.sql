-- The Well: finishing a quest there fills your mana to the ceiling; sunrise gives back 10; the
-- compliment and photo quests are retired. (Listed amounts stay as the old, smaller numbers.)
update public.quests set active = false where slug in ('compliment', 'photo');
update public.quests set reward = case slug when 'poem' then 9 when 'still' then 6 when 'draw' then 10 else reward end;

create or replace function public.cr_submit_quest(p_slug text, p_note text default null, p_proof_url text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare q public.quests%rowtype;
        v_last timestamptz;
        v_old  int;
        v_cap  int;
        v_new  int;
        v_note text := nullif(btrim(coalesce(p_note, '')), '');
        v_proof text := nullif(btrim(coalesce(p_proof_url, '')), '');
        v_timer timestamptz;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'auth'); end if;

  select * into q from public.quests where slug = p_slug and active;
  if not found then return jsonb_build_object('ok', false, 'code', 'missing'); end if;

  select mana, mana_cap into v_old, v_cap from public.profiles where id = auth.uid() for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'auth'); end if;

  if q.timer_seconds is not null then
    select started_at into v_timer from public.quest_timers
     where user_id = auth.uid() and quest_slug = p_slug;
    if v_timer is null or v_timer < now() - interval '30 minutes' then
      return jsonb_build_object('ok', false, 'code', 'no_timer');
    end if;
    if v_timer > now() - make_interval(secs => q.timer_seconds) then
      return jsonb_build_object('ok', false, 'code', 'too_soon');
    end if;
  elsif q.proof_required then
    -- A picture is the whole point: it must be a real file this person uploaded.
    if v_proof is null or not exists (
         select 1 from storage.objects
          where bucket_id = 'proofs' and name = v_proof
            and (storage.foldername(name))[1] = auth.uid()::text) then
      return jsonb_build_object('ok', false, 'code', 'no_proof');
    end if;
  elsif v_proof is null and char_length(coalesce(v_note, '')) < 12 then
    return jsonb_build_object('ok', false, 'code', 'no_proof');
  end if;

  select max(created_at) into v_last
    from public.quest_submissions
   where user_id = auth.uid() and quest_slug = p_slug and status <> 'void';

  if v_last is not null and v_last > now() - make_interval(hours => q.cooldown_hours) then
    return jsonb_build_object('ok', false, 'code', 'cooldown',
      'ready_at', v_last + make_interval(hours => q.cooldown_hours));
  end if;

  if q.timer_seconds is null and not q.proof_required and v_note is not null and exists (
       select 1 from public.quest_submissions s
        where s.user_id = auth.uid() and s.status <> 'void' and lower(s.note) = lower(v_note)) then
    return jsonb_build_object('ok', false, 'code', 'repeat');
  end if;

  if v_old >= v_cap then return jsonb_build_object('ok', false, 'code', 'full'); end if;

  perform set_config('crystr.economy', 'on', true);
  update public.profiles
     set mana = mana_cap, updated_at = now()
   where id = auth.uid()
  returning mana into v_new;

  insert into public.mana_ledger (user_id, amount, reason, kind)
  values (auth.uid(), v_new - v_old, q.title || ' — accepted', 'quest');

  insert into public.quest_submissions (user_id, quest_slug, note, proof_url, reward)
  values (auth.uid(), p_slug, v_note, v_proof, v_new - v_old);

  if q.timer_seconds is not null then
    update public.quest_timers set started_at = null where user_id = auth.uid() and quest_slug = p_slug;
  end if;

  return jsonb_build_object('ok', true, 'reward', v_new - v_old, 'mana', v_new);
end;
$$;

-- Sunrise: everyone registered gets 10 mana back, up to their ceiling, before the snapshot.
create or replace function public.cr_dawn_snapshot()
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  perform set_config('crystr.economy', 'on', true);
  with up as (
    update public.profiles p set mana = least(p.mana_cap, p.mana + 10), updated_at = now()
      from (select id, mana from public.profiles where onboarded and mana < mana_cap for update) old
     where p.id = old.id
    returning p.id, p.mana - old.mana as gain
  )
  insert into public.mana_ledger (user_id, amount, reason, kind)
  select id, gain, 'Sunrise', 'trickle' from up where gain > 0;

  insert into public.mana_dawn (user_id, day, mana, cap)
  select id, (now() at time zone 'America/New_York')::date, mana, mana_cap from public.profiles
  on conflict do nothing;
  for r in select id from public.profiles loop
    begin perform public.award_badges(r.id);
    exception when others then raise warning 'award_badges failed for %: %', r.id, sqlerrm; end;
  end loop;
end;
$$;
revoke all on function public.cr_dawn_snapshot() from public, anon, authenticated;
