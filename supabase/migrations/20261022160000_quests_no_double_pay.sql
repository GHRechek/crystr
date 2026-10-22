-- Quests: stop the double payout, and be honest about what was restored.
--
--  * Two requests at once could both pass the cooldown check and both pay. The profile row
--    is now locked first, so a person's quest submissions run one after another.
--  * The same note cannot be handed in twice (a copied-and-pasted line is not
--    something you did).
--  * If your mana is already full there is nothing to restore, so the quest is left
--    ready instead of using up its cooldown ('full').
--  * The ledger records what was actually restored, not the nominal reward when the
--    cap cut it short.

create or replace function public.cr_submit_quest(p_slug text, p_note text default null, p_proof_url text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare q public.quests%rowtype;
        v_last timestamptz;
        v_old  int;
        v_new  int;
        v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'auth'); end if;

  select * into q from public.quests where slug = p_slug and active;
  if not found then return jsonb_build_object('ok', false, 'code', 'missing'); end if;

  -- One submission at a time per person.
  select mana into v_old from public.profiles where id = auth.uid() for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'auth'); end if;

  if coalesce(btrim(p_proof_url), '') = '' and char_length(coalesce(v_note, '')) < 12 then
    return jsonb_build_object('ok', false, 'code', 'no_proof');
  end if;

  select max(created_at) into v_last
    from public.quest_submissions
   where user_id = auth.uid() and quest_slug = p_slug and status <> 'void';

  if v_last is not null and v_last > now() - make_interval(hours => q.cooldown_hours) then
    return jsonb_build_object('ok', false, 'code', 'cooldown',
      'ready_at', v_last + make_interval(hours => q.cooldown_hours));
  end if;

  if v_note is not null and exists (
       select 1 from public.quest_submissions s
        where s.user_id = auth.uid() and s.status <> 'void' and lower(s.note) = lower(v_note)) then
    return jsonb_build_object('ok', false, 'code', 'repeat');
  end if;

  if v_old >= 60 then return jsonb_build_object('ok', false, 'code', 'full'); end if;

  perform set_config('crystr.economy', 'on', true);
  update public.profiles
     set mana = least(60, mana + q.reward), updated_at = now()
   where id = auth.uid()
  returning mana into v_new;

  insert into public.mana_ledger (user_id, amount, reason, kind)
  values (auth.uid(), v_new - v_old, q.title || ' — accepted', 'quest');

  insert into public.quest_submissions (user_id, quest_slug, note, proof_url, reward)
  values (auth.uid(), p_slug, v_note, nullif(btrim(p_proof_url), ''), v_new - v_old);

  return jsonb_build_object('ok', true, 'reward', v_new - v_old, 'mana', v_new);
end;
$$;
