-- Quests another person confirms: "make friends with a goblin", "talk philosophy with an orc".
-- From the quest you pick who it was; they get a whisper asking whether it happened, with YES and
-- NO. Yes, and the badge is yours.
--   badges.peer_approved       earned by someone else saying yes
--   badge_claims                who asked whom about which quest, and the answer
--   dm_messages.claim_id        the whisper that carries the question
alter table public.badges add column if not exists peer_approved boolean not null default false;

create table if not exists public.badge_claims (
  id          bigint generated always as identity primary key,
  badge_slug  text not null references public.badges (slug) on delete cascade,
  claimant    uuid not null references public.profiles (id) on delete cascade,
  other       uuid not null references public.profiles (id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending', 'confirmed', 'declined')),
  created_at  timestamptz not null default now(),
  answered_at timestamptz,
  check (claimant <> other)
);
create unique index if not exists badge_claims_pending_idx on public.badge_claims (badge_slug, claimant, other) where status = 'pending';
alter table public.badge_claims enable row level security;
revoke all on public.badge_claims from anon, authenticated;
grant select on public.badge_claims to authenticated;
drop policy if exists badge_claims_mine on public.badge_claims;
create policy badge_claims_mine on public.badge_claims for select to authenticated
  using (claimant = auth.uid() or other = auth.uid());

alter table public.dm_messages add column if not exists claim_id bigint references public.badge_claims (id) on delete set null;

create or replace function public.cr_badge_claim(p_slug text, p_other uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare b public.badges%rowtype; v_a uuid; v_b uuid; v_thread bigint; v_id bigint; v_body text;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'auth'); end if;
  select * into b from public.badges where slug = p_slug and active and peer_approved;
  if not found then return jsonb_build_object('ok', false, 'code', 'bad_badge'); end if;
  if p_other is null or p_other = auth.uid() or not exists (select 1 from public.profiles where id = p_other) then
    return jsonb_build_object('ok', false, 'code', 'bad_person');
  end if;
  if exists (select 1 from public.user_badges where user_id = auth.uid() and badge_slug = p_slug) then
    return jsonb_build_object('ok', false, 'code', 'have_it');
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
revoke all on function public.cr_badge_claim(text, uuid) from public, anon;
grant execute on function public.cr_badge_claim(text, uuid) to authenticated;

create or replace function public.cr_badge_claim_answer(p_id bigint, p_yes boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c public.badge_claims%rowtype; v_thread bigint;
begin
  select * into c from public.badge_claims where id = p_id for update;
  if not found or c.other <> auth.uid() or c.status <> 'pending' then
    return jsonb_build_object('ok', false, 'code', 'missing');
  end if;
  update public.badge_claims set status = case when p_yes then 'confirmed' else 'declined' end, answered_at = now() where id = p_id;
  if p_yes then
    insert into public.user_badges (user_id, badge_slug) values (c.claimant, c.badge_slug) on conflict do nothing;
  end if;
  select id into v_thread from public.dm_threads where user_a = least(c.claimant, c.other) and user_b = greatest(c.claimant, c.other);
  if v_thread is not null then
    insert into public.dm_messages (thread_id, sender_id, body)
    values (v_thread, auth.uid(), case when p_yes then 'Yes, that happened.' else 'No, not quite.' end);
    update public.dm_threads set last_message_at = now() where id = v_thread;
  end if;
  return jsonb_build_object('ok', true, 'yes', p_yes);
end;
$$;
revoke all on function public.cr_badge_claim_answer(bigint, boolean) from public, anon;
grant execute on function public.cr_badge_claim_answer(bigint, boolean) to authenticated;

-- Six badges on show.
create or replace function public.cr_clean_shown_badges(p_user uuid, p_list jsonb)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare e text; out jsonb := '[]'::jsonb; n int := 0; seen text[] := '{}'; ok boolean;
begin
  if p_list is null or jsonb_typeof(p_list) <> 'array' then return '[]'::jsonb; end if;
  for e in select jsonb_array_elements_text(p_list) loop
    exit when n >= 6;
    continue when e = any(seen);
    ok := false;
    if e ~ '^a:[a-z0-9-]{1,40}$' then
      ok := exists (select 1 from public.user_badges where user_id = p_user and badge_slug = substr(e, 3));
    elsif e ~ '^i:[0-9]{1,18}$' then
      ok := exists (select 1 from public.badge_items where id = substr(e, 3)::bigint and owner_id = p_user and kind = 'tradable');
    end if;
    if ok then
      out := out || to_jsonb(e); seen := seen || e; n := n + 1;
    end if;
  end loop;
  return out;
end;
$$;
revoke all on function public.cr_clean_shown_badges(uuid, jsonb) from public, anon, authenticated;

-- Witches choose how a badge they make is approved: a witch's like on a post, or someone else's yes.
drop function if exists public.cr_badge_save(text, text, text, text, int, text);
create or replace function public.cr_badge_save(p_slug text, p_title text, p_how text, p_blurb text, p_art int, p_art_custom text default null, p_peer boolean default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_slug text; v_base text; v_n int := 1; v_title text := btrim(coalesce(p_title, ''));
        v_how text := btrim(coalesce(p_how, '')); v_blurb text := btrim(coalesce(p_blurb, ''));
        v_art text;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_witch) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  if p_art_custom is not null and p_art_custom ~ '^[0-9a-z.]{1,120}$' then
    v_art := 'token:' || p_art_custom;
  elsif p_art is not null and p_art between 1 and 509 then
    v_art := 'set/' || p_art || '.png';
  end if;
  if p_slug is not null and exists (select 1 from public.badges where slug = p_slug and kind = 'goal') then
    if char_length(v_title) not between 1 and 40 or v_art is null then
      return jsonb_build_object('ok', false, 'code', 'bad_input');
    end if;
    update public.badges set title = v_title, art = v_art where slug = p_slug;
    return jsonb_build_object('ok', true, 'slug', p_slug);
  end if;
  if char_length(v_title) not between 1 and 40 or char_length(v_how) not between 1 and 200
     or char_length(v_blurb) not between 1 and 120 or v_art is null then
    return jsonb_build_object('ok', false, 'code', 'bad_input');
  end if;
  if p_slug is not null then
    update public.badges set title = v_title, how = v_how, blurb = v_blurb, art = v_art where slug = p_slug;
    if not found then return jsonb_build_object('ok', false, 'code', 'missing'); end if;
    if p_peer is not null then
      update public.badges set peer_approved = p_peer, witch_approved = not p_peer
       where slug = p_slug and (witch_approved or peer_approved);
    end if;
    return jsonb_build_object('ok', true, 'slug', p_slug);
  end if;
  v_base := trim(both '-' from regexp_replace(lower(v_title), '[^a-z0-9]+', '-', 'g'));
  if v_base = '' then v_base := 'badge'; end if;
  v_slug := left(v_base, 40);
  while exists (select 1 from public.badges where slug = v_slug) loop
    v_n := v_n + 1; v_slug := left(v_base, 36) || '-' || v_n;
  end loop;
  insert into public.badges (slug, title, how, blurb, art, sort, active, witch_approved, peer_approved)
  values (v_slug, v_title, v_how, v_blurb, v_art, (select coalesce(max(sort), 0) + 1 from public.badges), true,
          not coalesce(p_peer, false), coalesce(p_peer, false));
  return jsonb_build_object('ok', true, 'slug', v_slug);
end;
$$;
revoke all on function public.cr_badge_save(text, text, text, text, int, text, boolean) from public, anon;
grant execute on function public.cr_badge_save(text, text, text, text, int, text, boolean) to authenticated;

-- The first few.
insert into public.badges (slug, title, how, blurb, art, sort, active, witch_approved, peer_approved) values
  ('goblin-friend', 'Goblin Friend', 'Make friends with a goblin.', 'Made friends with a goblin.', 'set/130.png', 500, true, false, true),
  ('elf-friend', 'Elf Friend', 'Make friends with an elf.', 'Made friends with an elf.', 'set/103.png', 501, true, false, true),
  ('forsaken-friend', 'Forsaken Friend', 'Make friends with a Forsaken.', 'Made friends with a Forsaken.', 'set/201.png', 502, true, false, true),
  ('orcish-philosophy', 'Orcish Philosophy', 'Talk philosophy with an orc.', 'Talked philosophy with an orc.', 'set/109.png', 503, true, false, true),
  ('dwarven-hospitality', 'Dwarven Hospitality', 'Share a drink with a dwarf.', 'Shared a drink with a dwarf.', 'set/114.png', 504, true, false, true),
  ('troll-tales', 'Troll Tales', 'Trade stories with a troll.', 'Traded stories with a troll.', 'set/99.png', 505, true, false, true),
  ('gnome-workshop', 'Gnome Workshop', 'Make or fix something with a gnome.', 'Made something with a gnome.', 'set/118.png', 506, true, false, true),
  ('tauren-walk', 'Tauren Walk', 'Take a quiet walk with a tauren.', 'Took a quiet walk with a tauren.', 'set/113.png', 507, true, false, true)
on conflict (slug) do nothing;
