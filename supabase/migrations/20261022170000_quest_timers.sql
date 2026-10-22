-- A real timer for the quests that are about time ("Sit still for two minutes").
--
-- The browser starts the timer by calling cr_start_quest_timer, which stamps the start on
-- the server. Handing the quest in checks the SERVER's clock: the full time must have passed
-- since that stamp, or it is refused ('too_soon'). A timer older than half an hour is
-- stale ('no_timer'). A quest with timer_seconds needs no photo or note.

alter table public.quests add column if not exists timer_seconds integer
  check (timer_seconds is null or timer_seconds between 10 and 3600);
update public.quests set timer_seconds = 120 where slug = 'still';

create table if not exists public.quest_timers (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  quest_slug text not null,
  started_at timestamptz,
  primary key (user_id, quest_slug)
);
alter table public.quest_timers enable row level security;
revoke all on public.quest_timers from anon, authenticated;

create or replace function public.cr_start_quest_timer(p_slug text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare q public.quests%rowtype; v_last timestamptz; v_mana int;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'auth'); end if;
  select * into q from public.quests where slug = p_slug and active and timer_seconds is not null;
  if not found then return jsonb_build_object('ok', false, 'code', 'missing'); end if;

  select mana into v_mana from public.profiles where id = auth.uid();
  if v_mana >= 60 then return jsonb_build_object('ok', false, 'code', 'full'); end if;

  select max(created_at) into v_last from public.quest_submissions
   where user_id = auth.uid() and quest_slug = p_slug and status <> 'void';
  if v_last is not null and v_last > now() - make_interval(hours => q.cooldown_hours) then
    return jsonb_build_object('ok', false, 'code', 'cooldown',
      'ready_at', v_last + make_interval(hours => q.cooldown_hours));
  end if;

  insert into public.quest_timers (user_id, quest_slug, started_at)
  values (auth.uid(), p_slug, now())
  on conflict (user_id, quest_slug) do update set started_at = excluded.started_at;
  return jsonb_build_object('ok', true, 'seconds', q.timer_seconds);
end;
$$;
revoke all on function public.cr_start_quest_timer(text) from public, anon;
grant execute on function public.cr_start_quest_timer(text) to authenticated;

-- Handing in: timer quests check the server clock (see the header).
create or replace function public.cr_submit_quest(p_slug text, p_note text default null, p_proof_url text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare q public.quests%rowtype;
        v_last timestamptz;
        v_old  int;
        v_new  int;
        v_note text := nullif(btrim(coalesce(p_note, '')), '');
        v_timer timestamptz;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'auth'); end if;

  select * into q from public.quests where slug = p_slug and active;
  if not found then return jsonb_build_object('ok', false, 'code', 'missing'); end if;

  -- One submission at a time per person.
  select mana into v_old from public.profiles where id = auth.uid() for update;
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
  elsif coalesce(btrim(p_proof_url), '') = '' and char_length(coalesce(v_note, '')) < 12 then
    return jsonb_build_object('ok', false, 'code', 'no_proof');
  end if;

  select max(created_at) into v_last
    from public.quest_submissions
   where user_id = auth.uid() and quest_slug = p_slug and status <> 'void';

  if v_last is not null and v_last > now() - make_interval(hours => q.cooldown_hours) then
    return jsonb_build_object('ok', false, 'code', 'cooldown',
      'ready_at', v_last + make_interval(hours => q.cooldown_hours));
  end if;

  if q.timer_seconds is null and v_note is not null and exists (
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

  if q.timer_seconds is not null then
    update public.quest_timers set started_at = null where user_id = auth.uid() and quest_slug = p_slug;
  end if;

  return jsonb_build_object('ok', true, 'reward', v_new - v_old, 'mana', v_new);
end;
$$;
