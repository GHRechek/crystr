-- The Well pays fixed amounts again (full refills are only for finishing quests from the Quests page):
-- poem +5, hand-draw +10, and "Don't touch your phone for 15 minutes" +3. That timer runs on the server's
-- clock, so it keeps counting with the screen off; it can be claimed up to three hours after it began.
update public.quests set reward = 5 where slug = 'poem';
update public.quests set reward = 10 where slug = 'draw';
update public.quests set title = 'Don''t touch your phone for 15 minutes', sub = 'Pocket it. It keeps counting.',
  blurb = 'Press begin, then put your phone away for fifteen minutes. Screen off, in a pocket, in another room. It keeps counting. Come back and take what it gave you.',
  reward = 3, timer_seconds = 900, time_label = '15 MIN',
  proof_hint = 'Start the timer here, then put your phone away. It keeps counting with the screen off. Come back after fifteen minutes.' where slug = 'still';

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
    if v_timer is null or v_timer < now() - interval '3 hours' then
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
     set mana = least(mana_cap, mana + q.reward), updated_at = now()
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
