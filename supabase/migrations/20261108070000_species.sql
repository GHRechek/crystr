-- Who someone is, in the game: a species and whether they cast. Both are public and chosen on Edit
-- Profile (started from the registry form where it was filled in). A quest someone else confirms can
-- name the kind of person it has to be (badges.peer_target: a species, or 'spellcaster'), and only
-- those people can be asked.
alter table public.profiles add column if not exists species text
  check (species is null or species in ('elf', 'forsaken', 'shifter', 'human', 'orc', 'goblin', 'dwarf', 'troll', 'gnome', 'tauren', 'planar'));
alter table public.profiles add column if not exists spellcaster boolean not null default false;
grant update (species, spellcaster) on public.profiles to authenticated;

update public.profiles p set species = f.answers ->> 'species'
  from public.plaintiff_forms f
 where f.user_id = p.id and p.species is null and f.answers ->> 'species' in ('orc', 'elf', 'human', 'shifter', 'planar');
update public.profiles p set spellcaster = true
  from public.plaintiff_forms f
 where f.user_id = p.id and (f.answers ->> 'spellcaster') = 'true';

alter table public.badges add column if not exists peer_target text;

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
       (b.peer_target = 'spellcaster' and o.spellcaster) or (b.peer_target <> 'spellcaster' and o.species = b.peer_target)) then
    return jsonb_build_object('ok', false, 'code', 'wrong_kind');
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

drop function if exists public.cr_badge_save(text, text, text, text, int, text, boolean);
create or replace function public.cr_badge_save(p_slug text, p_title text, p_how text, p_blurb text, p_art int, p_art_custom text default null, p_peer boolean default null, p_target text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_slug text; v_base text; v_n int := 1; v_title text := btrim(coalesce(p_title, ''));
        v_how text := btrim(coalesce(p_how, '')); v_blurb text := btrim(coalesce(p_blurb, ''));
        v_art text; v_target text := nullif(btrim(coalesce(p_target, '')), '');
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_witch) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  if v_target is not null and v_target not in ('spellcaster', 'elf', 'forsaken', 'shifter', 'human', 'orc', 'goblin', 'dwarf', 'troll', 'gnome', 'tauren', 'planar') then
    v_target := null;
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
      update public.badges set peer_approved = p_peer, witch_approved = not p_peer,
             peer_target = case when p_peer then v_target else null end
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
  insert into public.badges (slug, title, how, blurb, art, sort, active, witch_approved, peer_approved, peer_target)
  values (v_slug, v_title, v_how, v_blurb, v_art, (select coalesce(max(sort), 0) + 1 from public.badges), true,
          not coalesce(p_peer, false), coalesce(p_peer, false), case when coalesce(p_peer, false) then v_target else null end);
  return jsonb_build_object('ok', true, 'slug', v_slug);
end;
$$;
revoke all on function public.cr_badge_save(text, text, text, text, int, text, boolean, text) from public, anon;
grant execute on function public.cr_badge_save(text, text, text, text, int, text, boolean, text) to authenticated;

update public.badges set peer_target = 'goblin' where slug = 'goblin-friend';
update public.badges set peer_target = 'elf' where slug = 'elf-friend';
update public.badges set peer_target = 'forsaken' where slug = 'forsaken-friend';
update public.badges set peer_target = 'orc' where slug = 'orcish-philosophy';
update public.badges set peer_target = 'dwarf' where slug = 'dwarven-hospitality';
update public.badges set peer_target = 'troll' where slug = 'troll-tales';
update public.badges set peer_target = 'gnome' where slug = 'gnome-workshop';
update public.badges set peer_target = 'tauren' where slug = 'tauren-walk';

insert into public.badges (slug, title, how, blurb, art, sort, active, witch_approved, peer_approved, peer_target) values
  ('human-friend', 'Human Friend', 'Make friends with a human.', 'Made friends with a human.', 'set/103.png', 508, true, false, true, 'human'),
  ('orc-friend', 'Orc Friend', 'Make friends with an orc.', 'Made friends with an orc.', 'set/103.png', 509, true, false, true, 'orc'),
  ('shifter-friend', 'Shifter Friend', 'Make friends with a shifter.', 'Made friends with a shifter.', 'set/103.png', 510, true, false, true, 'shifter'),
  ('spellcaster-friend', 'Spellcaster Friend', 'Make friends with a spellcaster.', 'Made friends with a spellcaster.', 'set/103.png', 511, true, false, true, 'spellcaster')
on conflict (slug) do nothing;
