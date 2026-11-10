-- An uncommon's third move is the kind it did not have: a sword and armor creature gets a spell, not a
-- second armor. (The pools now cover every kind.)
create or replace function public.cr_move_pool(t text, kind text) returns text[] language sql immutable as $$
  select case kind
    when 'sword' then case t
      when 'fire' then array['Flame Slash', 'Ember Claw', 'Scorch', 'Cinder Bite', 'Blaze Fang', 'Flare Kick', 'Searing Jab']
      when 'tide' then array['Tide Strike', 'Riptide', 'Lash', 'Splash Jab', 'Wave Cut', 'Undertow', 'Brine Bite']
      when 'nature' then array['Thorn Lash', 'Vine Whip', 'Bramble Jab', 'Root Snap', 'Leaf Blade', 'Sting', 'Pounce']
      when 'ward' then array['Strike', 'Shield Bash', 'Boulder Fist', 'Smash', 'Quake Stomp', 'Lunge', 'Hammer Down']
      when 'feral' then array['Bite', 'Maul', 'Gnaw', 'Claw', 'Rend', 'Fang', 'Tusk']
      when 'dark' then array['Shadow Claw', 'Night Slash', 'Bone Rattle', 'Grim Reap', 'Soul Bite', 'Gloom Jab', 'Dusk Fang']
      else array['Smite', 'Dive', 'Halo Strike', 'Glint', 'Spirit Lance', 'Ghost Touch', 'Radiant Jab'] end
    when 'spell' then case t
      when 'fire' then array['Fireball', 'Inferno', 'Blaze', 'Ember Rain', 'Heat Wave', 'Pyre', 'Kindle']
      when 'tide' then array['Tidal Wave', 'Bubble Hex', 'Frost', 'Rain Call', 'Whirlpool', 'Ice Shard', 'Mist Hex']
      when 'nature' then array['Spore Cloud', 'Vine Hex', 'Pollen Burst', 'Bloom', 'Overgrow', 'Sap Drain', 'Thorn Rain']
      when 'ward' then array['Rumble', 'Rune Rock', 'Sandstorm', 'War Cry', 'Rally', 'Stone Hex', 'Battle Hymn']
      when 'feral' then array['Roar', 'Howl', 'Screech', 'Snarl', 'Stampede', 'Frenzy', 'Musk']
      when 'dark' then array['Hex', 'Curse', 'Wail', 'Dread', 'Shade Bolt', 'Doom', 'Blight']
      else array['Sun Flare', 'Halo', 'Radiance', 'Haunt', 'Blessing', 'Aura Burst', 'Gleam'] end
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

-- The third move, where it doubled a kind the creature already had, becomes the kind it lacked.
update public.badge_kinds k
   set moves = jsonb_set(k.moves, '{2}', jsonb_build_object(
         'name', (public.cr_move_pool(k.types[1], m.missing))[1 + abs(hashtext(k.slug || 'k')) % 7], 'kind', m.missing))
  from (select slug, (select x from unnest(array['sword', 'spell', 'armor']) x
                       where x <> (moves->0->>'kind') and x <> (moves->1->>'kind') limit 1) as missing
          from public.badge_kinds where rarity = 'uncommon' and types is not null and jsonb_array_length(moves) = 3) m
 where m.slug = k.slug and m.missing is not null
   and (k.moves->2->>'kind') in ((k.moves->0->>'kind'), (k.moves->1->>'kind'));
