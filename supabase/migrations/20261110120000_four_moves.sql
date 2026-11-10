-- Moves by rarity: commons two, uncommons and rares three, epics and mythics four. The fourth is a combination,
-- sword & armor or spell & armor: it beats what the other side put out as long as one half wins over it and the
-- other does not lose (a win and a loss cancel out, as two of the same kind do). Every creature that was short
-- gets its moves here, named from its first type's pool; the editor allows the new counts and kinds; and the
-- fight scores kinds against each other instead of comparing one to one.

-- How two moves' kinds fare: wins minus losses across every pair of halves. Positive: the first lands.
create or replace function public.cr_kind_score(a text, b text) returns int language sql immutable as $$
  select coalesce(sum(case when (x, y) in (('sword', 'spell'), ('spell', 'armor'), ('armor', 'sword')) then 1
                           when (y, x) in (('sword', 'spell'), ('spell', 'armor'), ('armor', 'sword')) then -1 else 0 end), 0)::int
    from unnest(string_to_array(a, '+')) x, unnest(string_to_array(b, '+')) y;
$$;
alter function public.cr_kind_score(text, text) set search_path = public;

-- What to say when `w` gets through `l`.
create or replace function public.cr_kind_line(w text, l text) returns text language sql immutable as $$
  select case when w not like '%+%' and l not like '%+%' then
                (case w when 'sword' then 'SWORD CUTS SPELL!' when 'spell' then 'SPELL BREAKS ARMOR!' else 'ARMOR BLOCKS SWORD!' end)
              else upper(replace(w, '+', ' & ')) || ' BEATS ' || upper(replace(l, '+', ' & ')) || '!' end;
$$;
alter function public.cr_kind_line(text, text) set search_path = public;

-- The moves that were missing.
create or replace function public.cr_move_pool(t text, kind text) returns text[] language sql immutable as $$
  select case kind
    when 'armor' then case t
      when 'fire' then array['Cinder Wall', 'Smoke Veil', 'Ash Shield', 'Heat Haze', 'Ember Guard', 'Flame Cloak', 'Soot Screen']
      when 'tide' then array['Ice Wall', 'Wave Guard', 'Shell Up', 'Foam Shield', 'Frost Coat', 'Tide Pool', 'Mist Veil']
      when 'nature' then array['Leaf Guard', 'Bark Skin', 'Burrow', 'Moss Coat', 'Briar Wall', 'Husk', 'Petal Shield']
      when 'ward' then array['Stone Wall', 'Granite Hide', 'Hunker', 'Bulwark', 'Iron Skin', 'Parry', 'Brace']
      when 'feral' then array['Scurry', 'Hide', 'Thick Hide', 'Curl Up', 'Dodge', 'Bristle', 'Den']
      when 'dark' then array['Shroud', 'Fade', 'Grave Guard', 'Veil', 'Murk', 'Cloak', 'Gloom Wall']
      else array['Aegis', 'Shield', 'Sanctuary', 'Phase', 'Glow Veil', 'Ether Guard', 'Blink'] end
    when 'sword+armor' then case t
      when 'fire' then array['Cinder Rampart', 'Blazing Bastion', 'Flame Vanguard']
      when 'tide' then array['Tidal Bastion', 'Wave Rampart', 'Brine Vanguard']
      when 'nature' then array['Bramble Bastion', 'Root Rampart', 'Thorn Vanguard']
      when 'ward' then array['Stone Bastion', 'Iron Rampart', 'Granite Vanguard']
      when 'feral' then array['Fang Bastion', 'Hide Rampart', 'Tusk Vanguard']
      when 'dark' then array['Shadow Bastion', 'Grave Rampart', 'Night Vanguard']
      else array['Halo Bastion', 'Aegis Rampart', 'Radiant Vanguard'] end
    else case t
      when 'fire' then array['Pyre Ward', 'Ember Bulwark', 'Heat Ward Hex']
      when 'tide' then array['Frost Ward', 'Mist Bulwark', 'Tide Ward Hex']
      when 'nature' then array['Bloom Ward', 'Moss Bulwark', 'Spore Ward Hex']
      when 'ward' then array['Rune Ward', 'Rock Bulwark', 'Stone Ward Hex']
      when 'feral' then array['Howl Ward', 'Den Bulwark', 'Roar Ward Hex']
      when 'dark' then array['Hex Ward', 'Gloom Bulwark', 'Curse Ward Hex']
      else array['Glow Ward', 'Sanctuary Bulwark', 'Bless Ward Hex'] end
  end;
$$;
alter function public.cr_move_pool(text, text) set search_path = public;

-- Uncommons: a third move, armor in the first type.
update public.badge_kinds k
   set moves = k.moves || jsonb_build_array(jsonb_build_object('name', (public.cr_move_pool(k.types[1], 'armor'))[1 + abs(hashtext(k.slug)) % 7], 'kind', 'armor'))
 where k.types is not null and k.rarity = 'uncommon' and jsonb_array_length(k.moves) = 2;
-- Epics and mythics: a fourth, a combination.
update public.badge_kinds k
   set moves = k.moves || jsonb_build_array(jsonb_build_object(
         'name', (public.cr_move_pool(k.types[1], case when abs(hashtext(k.slug)) % 2 = 0 then 'sword+armor' else 'spell+armor' end))[1 + abs(hashtext(k.slug || 'x')) % 3],
         'kind', case when abs(hashtext(k.slug)) % 2 = 0 then 'sword+armor' else 'spell+armor' end))
 where k.types is not null and k.rarity in ('epic', 'legendary') and jsonb_array_length(k.moves) = 3;

do $do$
declare d text;
begin
  -- The editor: the new counts and the two combination kinds.
  select pg_get_functiondef('public.cr_edit_creature(text, jsonb)'::regprocedure) into d;
  d := replace(d, 'n := case when v_rar in (''common'', ''uncommon'') then 2 else 3 end;', 'n := case v_rar when ''common'' then 2 when ''uncommon'' then 3 when ''rare'' then 3 else 4 end;');
  d := replace(d, 'not in (''sword'', ''spell'', ''armor'')', 'not in (''sword'', ''spell'', ''armor'', ''sword+armor'', ''spell+armor'')');
  execute d;

  -- The fight: kinds are scored, so a combination counts when one half wins and the other does not lose.
  select pg_get_functiondef('public.cr_enc_act(bigint, jsonb)'::regprocedure) into d;
  d := replace(d, E'      elsif ka = kb then\n        line := ''CLANG!'';',
                  E'      elsif public.cr_kind_score(ka, kb) = 0 then\n        line := case when ka like ''%+%'' or kb like ''%+%'' then ''THEY CANCEL OUT!'' else ''CLANG!'' end;');
  d := replace(d, E'      elsif (ka = ''sword'' and kb = ''spell'') or (ka = ''spell'' and kb = ''armor'') or (ka = ''armor'' and kb = ''sword'') then\n        line := case ka when ''sword'' then ''SWORD CUTS SPELL!'' when ''spell'' then ''SPELL BREAKS ARMOR!'' else ''ARMOR BLOCKS SWORD!'' end;',
                  E'      elsif public.cr_kind_score(ka, kb) > 0 then\n        line := public.cr_kind_line(ka, kb);');
  d := replace(d, E'        line := case kb when ''sword'' then ''SWORD CUTS SPELL!'' when ''spell'' then ''SPELL BREAKS ARMOR!'' else ''ARMOR BLOCKS SWORD!'' end;',
                  E'        line := public.cr_kind_line(kb, ka);');
  execute d;
end $do$;
