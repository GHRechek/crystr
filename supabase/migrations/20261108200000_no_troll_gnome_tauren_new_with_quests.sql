-- Troll, gnome and tauren are not in the game: their quests are gone, and so are the species. Four new
-- "with someone" quests: Brew a Potion, Cast a Spell for Someone, Attend a Workshop, Attend a Support Group.
delete from public.badges where slug in ('troll-tales', 'gnome-workshop', 'tauren-walk', 'culture-troll', 'culture-gnome', 'culture-tauren');
update public.profiles set species = null where species in ('troll', 'gnome', 'tauren');
alter table public.profiles drop constraint if exists profiles_species_check;
alter table public.profiles add constraint profiles_species_check
  check (species is null or species in ('elf', 'forsaken', 'shifter', 'human', 'orc', 'goblin', 'planar'));

create or replace function public.cr_badge_save(p_slug text, p_title text, p_how text, p_blurb text, p_art int, p_art_custom text default null, p_peer boolean default null, p_target text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_slug text; v_base text; v_n int := 1; v_title text := btrim(coalesce(p_title, ''));
        v_how text := btrim(coalesce(p_how, '')); v_blurb text := btrim(coalesce(p_blurb, ''));
        v_art text; v_target text := nullif(btrim(coalesce(p_target, '')), '');
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_witch) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  if v_target is not null and v_target not in ('spellcaster', 'witch', 'elf', 'forsaken', 'shifter', 'human', 'orc', 'goblin', 'planar') then
    v_target := null;
  end if;
  if p_art_custom is not null and p_art_custom ~ '^[0-9a-z.]{1,120}$' then
    v_art := 'token:' || p_art_custom;
  elsif p_art is not null and p_art between 1 and 1015 then
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

insert into public.badges (slug, title, how, blurb, art, sort, active, witch_approved, peer_approved) values
  ('brew-a-potion', 'Brew a Potion', 'Brew a potion.', 'Brewed a potion.', 'set/170.png', 620, true, false, true),
  ('cast-a-spell', 'Cast a Spell', 'Cast a spell for someone.', 'Cast a spell for someone.', 'set/163.png', 621, true, false, true),
  ('attend-a-workshop', 'Attend a Workshop', 'Attend a workshop.', 'Attended a workshop.', 'set/292.png', 622, true, false, true),
  ('attend-a-support-group', 'Attend a Support Group', 'Attend a support group.', 'Attended a support group.', 'set/167.png', 623, true, false, true)
on conflict (slug) do nothing;
