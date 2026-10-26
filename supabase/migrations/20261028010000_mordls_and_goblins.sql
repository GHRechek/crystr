-- Sub pages on the wiki, goblins on the registry, and the species pages with their codes.
--
--  * wiki_pages.parent_id: a page can sit under another ("MORDLs" holds Orcs, Humans and
--    Goblins). cr_wiki_create_page takes p_parent so a witch can start a page under one.
--  * Goblins are a species the City registers: 'goblin' joins cr_register's list, with its
--    own SDC in plaintiff_codes.
--  * Pages seeded (kept facts, written as the first witch): MORDLs, Mundane Organics with
--    Restricted Diverse Lifespans, "Not innately magical", "Restricted Lifespans"; under
--    it Orcs, Humans and Goblins, each with its SDC; and Planar, with its SDC. Elves and
--    Shifters get their SDCs on the pages they already have. Under The Big Cities: City
--    Districts, Gate Districts and Outlands Districts, each with its ADC. The wiki breaks
--    numbers for everyone but witches (lib/wiki-mask.ts), so a code read there has a digit
--    or two missing, as the wiki means it to.

alter table public.wiki_pages add column if not exists parent_id bigint references public.wiki_pages (id) on delete set null;
alter table public.wiki_pages drop constraint if exists wiki_pages_parent_not_self;
alter table public.wiki_pages add constraint wiki_pages_parent_not_self check (parent_id is null or parent_id <> id);
create index if not exists wiki_pages_parent_idx on public.wiki_pages (parent_id);

drop function if exists public.cr_wiki_create_page(text, text, integer);
create or replace function public.cr_wiki_create_page(p_slug text, p_title text, p_slots integer default 6, p_parent bigint default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id bigint; v_slug text := lower(btrim(p_slug));
begin
  if not public.is_witch() then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  if char_length(btrim(coalesce(p_title, ''))) = 0 then
    return jsonb_build_object('ok', false, 'code', 'no_title');
  end if;
  if v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(v_slug) > 60 then
    return jsonb_build_object('ok', false, 'code', 'bad_slug');
  end if;
  -- "new" and "to-read" are screens, not pages.
  if v_slug in ('new', 'to-read') or exists (select 1 from public.wiki_pages where slug = v_slug) then
    return jsonb_build_object('ok', false, 'code', 'taken');
  end if;
  if p_parent is not null and not exists (select 1 from public.wiki_pages where id = p_parent) then
    return jsonb_build_object('ok', false, 'code', 'bad_parent');
  end if;

  insert into public.wiki_pages (slug, title, slots, created_by, updated_by, parent_id)
  values (v_slug, btrim(p_title), greatest(2, least(coalesce(p_slots, 6), 300)), auth.uid(), auth.uid(), p_parent)
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id, 'slug', v_slug);
end;
$$;
revoke all on function public.cr_wiki_create_page(text, text, integer, bigint) from public, anon;
grant execute on function public.cr_wiki_create_page(text, text, integer, bigint) to authenticated;

-- Goblins register too.
insert into public.plaintiff_codes (kind, key, code) values ('sdc', 'goblin', '47290') on conflict (kind, key) do nothing;

create or replace function public.cr_register(
  p_district text, p_district_code text, p_species text, p_species_code text,
  p_spellcaster boolean default false, p_arcn text default '',
  p_birthday date default null, p_name text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_ok boolean;
        v_name text;
        v_character text;
        v_arcn text := btrim(coalesce(p_arcn, ''));
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  if exists (select 1 from public.profiles where id = auth.uid() and onboarded) then
    return jsonb_build_object('ok', true, 'already', true);
  end if;

  if p_district not in ('city', 'outland', 'gate', 'enclave')
     or p_species not in ('orc', 'elf', 'human', 'goblin', 'shifter', 'planar')
     or char_length(btrim(coalesce(p_district_code, ''))) = 0
     or char_length(btrim(coalesce(p_species_code, ''))) = 0
     or char_length(p_district_code) > 24 or char_length(p_species_code) > 24 then
    return jsonb_build_object('ok', false, 'code', 'incomplete');
  end if;
  if p_birthday is not null and (p_birthday < date '1026-01-01' or p_birthday > date '2026-12-31') then
    return jsonb_build_object('ok', false, 'code', 'bad_birthday');
  end if;
  if char_length(coalesce(p_name, '')) > 120 then
    return jsonb_build_object('ok', false, 'code', 'incomplete');
  end if;

  -- Only elves live in the Enclaves.
  if p_district = 'enclave' and p_species <> 'elf' then
    return jsonb_build_object('ok', false, 'code', 'enclave_elves');
  end if;

  select exists (select 1 from public.plaintiff_codes
                  where kind = 'adc' and key = p_district
                    and position(lower(code) in lower(p_district_code)) > 0) into v_ok;
  if not v_ok then return jsonb_build_object('ok', false, 'code', 'bad_adc'); end if;

  select exists (select 1 from public.plaintiff_codes
                  where kind = 'sdc' and key = p_species
                    and position(lower(code) in lower(p_species_code)) > 0) into v_ok;
  if not v_ok then return jsonb_build_object('ok', false, 'code', 'bad_sdc'); end if;

  -- A registered spellcaster gives an ARCN (eight digits); a planar cannot be one.
  if p_spellcaster then
    if p_species = 'planar' then return jsonb_build_object('ok', false, 'code', 'planar_caster'); end if;
    if v_arcn !~ '^[0-9]{8}$' then return jsonb_build_object('ok', false, 'code', 'bad_arcn'); end if;
  end if;

  -- The character's name is public (display_name); the person's own name goes only here,
  -- where witches can read it.
  select coalesce(nullif(btrim(display_name), ''), handle) into v_character from public.profiles where id = auth.uid();
  v_name := coalesce(nullif(btrim(p_name), ''), v_character);

  insert into public.plaintiffs (user_id) values (auth.uid()) on conflict do nothing;
  insert into public.plaintiff_forms (user_id, answers)
  values (auth.uid(), jsonb_build_object(
    'name', v_name, 'character', v_character, 'district', p_district, 'species', p_species, 'birthday', p_birthday,
    'spellcaster', coalesce(p_spellcaster, false),
    'arcn', case when p_spellcaster then v_arcn else null end))
  on conflict (user_id) do nothing;

  perform set_config('crystr.economy', 'on', true);
  update public.profiles
     set onboarded = true, birthday = coalesce(p_birthday, birthday), updated_at = now()
   where id = auth.uid();
  perform public.cr_recount_cap(auth.uid());
  perform public.award_badges(auth.uid());
  return jsonb_build_object('ok', true);
end;
$$;

-- The pages and their facts, in the first witch's name (or anyone's, on a database with no
-- witch yet). A page that already exists is kept and only gains the facts it lacks.
do $$
declare v_author uuid;
begin
  select id into v_author from public.profiles where is_witch order by created_at limit 1;
  if v_author is null then select id into v_author from public.profiles order by created_at limit 1; end if;
  if v_author is null then raise notice 'no profiles yet: nothing seeded'; return; end if;

  -- Each page: slug, title, parent slug (or null), then its facts.
  create temp table seed_pages (ord int, slug text, title text, parent text) on commit drop;
  insert into seed_pages values
    (1, 'mordls',   'MORDLs',   null),
    (2, 'orcs',     'Orcs',     'mordls'),
    (3, 'humans',   'Humans',   'mordls'),
    (4, 'goblins',  'Goblins',  'mordls'),
    (5, 'planar',   'Planar',   null),
    (6, 'elves',    'Elves',    null),
    (7, 'shifters', 'Shifters', null),
    (8, 'the-big-cities',     'The Big Cities',     null),
    (9, 'city-districts',     'City Districts',     'the-big-cities'),
    (10, 'gate-districts',    'Gate Districts',     'the-big-cities'),
    (11, 'outlands-districts', 'Outlands Districts', 'the-big-cities');
  create temp table seed_facts (slug text, ord int, body text) on commit drop;
  insert into seed_facts values
    ('mordls', 1, 'Mundane Organics with Restricted Diverse Lifespans'),
    ('mordls', 2, 'Not innately magical'),
    ('mordls', 3, 'Restricted Lifespans'),
    ('orcs', 1, 'Orc SDC: 33110'),
    ('humans', 1, 'Human SDC: 10452'),
    ('goblins', 1, 'Goblin SDC: 47290'),
    ('planar', 1, 'Planar SDC: 66144'),
    ('elves', 1, 'Elf SDC: 21876'),
    ('shifters', 1, 'Shifter SDC: 88931'),
    ('city-districts', 1, 'City ADC: 856'),
    ('gate-districts', 1, 'Gate ADC: 972'),
    ('outlands-districts', 1, 'Outland ADC: 717');

  -- Pages first, parents before children (the ord sees to that).
  declare r record; v_parent bigint; v_page bigint; f record; v_slot int;
  begin
    for r in select * from seed_pages order by ord loop
      v_parent := null;
      if r.parent is not null then select id into v_parent from public.wiki_pages where slug = r.parent; end if;
      select id into v_page from public.wiki_pages where slug = r.slug;
      if v_page is null then
        insert into public.wiki_pages (slug, title, slots, created_by, updated_by, parent_id)
        values (r.slug, r.title, 6, v_author, v_author, v_parent)
        returning id into v_page;
      elsif v_parent is not null then
        update public.wiki_pages set parent_id = v_parent where id = v_page and parent_id is null;
      end if;

      for f in select * from seed_facts where slug = r.slug order by ord loop
        if exists (select 1 from public.wiki_facts where page_id = v_page and status = 'kept' and lower(body) = lower(f.body)) then
          continue;
        end if;
        select coalesce(max(slot), 0) + 1 into v_slot from public.wiki_facts where page_id = v_page and status = 'kept';
        -- Skip a slot somebody has a fact waiting in; the page keeps two open after the last.
        while exists (select 1 from public.wiki_facts where page_id = v_page and slot = v_slot) loop
          v_slot := v_slot + 1;
        end loop;
        insert into public.wiki_facts (page_id, slot, body, author, status, reviewed_by, reviewed_at)
        values (v_page, v_slot, f.body, v_author, 'kept', v_author, now());
        update public.wiki_pages
           set slots = least(300, greatest(slots, v_slot + 2)), updated_by = v_author, updated_at = now()
         where id = v_page;
      end loop;
    end loop;
  end;
end $$;
