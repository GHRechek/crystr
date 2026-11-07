-- Historikals: the creatures you collect, trade and battle with, replacing the old tradable items as what
-- drops. The 48 old item kinds stay readable (anyone holding one keeps it) but no longer drop.
-- Each creature has a rarity (common, uncommon, rare, legendary), an element (fire, water, grass, rock, dark,
-- light), hearts, and its moves (two for commons and uncommons, all three kinds for rares and legendaries).

alter table public.badge_kinds
  add column if not exists rarity text check (rarity in ('common', 'uncommon', 'rare', 'legendary')),
  add column if not exists element text check (element in ('fire', 'water', 'grass', 'rock', 'dark', 'light')),
  add column if not exists hearts int,
  add column if not exists moves jsonb,
  add column if not exists droppable boolean not null default false;

-- The catalogue, one creature a line: slug|name|rarity|element|hearts|pack order|move:kind;move:kind(;move:kind)
insert into public.badge_kinds (slug, title, blurb, art, sort, rarity, element, hearts, moves, droppable)
select f[1], f[2], 'A ' || f[3] || ' ' || initcap(f[4]) || ' Historikal.', 'creatures/' || f[1] || '.png', 1000 + f[6]::int,
       f[3], f[4], f[5]::int,
       (select jsonb_agg(jsonb_build_object('name', split_part(m, ':', 1), 'kind', split_part(m, ':', 2)) order by o)
          from unnest(string_to_array(f[7], ';')) with ordinality as x(m, o)),
       true
  from (select string_to_array(l, '|') as f from unnest(string_to_array($cat$
warrior|WARRIOR|common|light|2|1|Strike:sword;Aegis:armor
hunter|HUNTER|common|light|2|2|Dive:sword;Sun Flare:spell
rogue|ROGUE|common|light|2|3|Dive:sword;Sun Flare:spell
mage|MAGE|uncommon|light|3|4|Dive:sword;Halo:spell
priest|PRIEST|uncommon|light|3|5|Strike:sword;Shield:armor
snake-01|GREEN SNAKE|common|grass|2|6|Pounce:sword;Leaf Guard:armor
snake-02|VIPER|common|grass|2|7|Thorn Lash:sword;Vine Hex:spell
snake-blue|BLUE SNAKE|common|water|2|8|Tide Strike:sword;Ice Wall:armor
snake-brown|BROWN SNAKE|common|grass|2|9|Thorn Lash:sword;Spore Cloud:spell
spider|SPIDER|common|grass|2|10|Pounce:sword;Leaf Guard:armor
ghost|GHOST|uncommon|dark|3|11|Wail:spell;Fade:armor
wasp|WASP|common|grass|2|12|Pounce:sword;Bark Skin:armor
bat|BAT|common|dark|2|13|Bite:sword;Screech:spell
ant|ANT|common|grass|2|14|Thorn Lash:sword;Spore Cloud:spell
pink-jelly|PINK JELLY|common|water|2|15|Splash:spell;Wobble:armor
scorpion|SCORPION|common|rock|2|16|Quake Stomp:sword;Sandstorm:spell
scarab|SCARAB|common|grass|2|17|Thorn Lash:sword;Spore Cloud:spell
skeleton|SKELETON|common|dark|2|18|Bone Rattle:sword;Grave Guard:armor
orc|ORC|common|grass|2|19|Thorn Lash:sword;Pollen Burst:spell
bird|BIRD|common|grass|2|20|Pounce:sword;Bark Skin:armor
goblin|GOBLIN|common|grass|2|21|Stab:sword;Hide:armor
demon|DEMON|rare|fire|3|22|Flame Slash:sword;Fireball:spell;Cinder Wall:armor
water-elemental|WATER ELEMENTAL|rare|water|3|23|Tide Strike:sword;Tidal Wave:spell;Ice Wall:armor
air-elemental|AIR ELEMENTAL|rare|light|3|24|Smite:sword;Sun Flare:spell;Shield:armor
earth-elemental|EARTH ELEMENTAL|rare|rock|3|25|Quake Stomp:sword;Rune Rock:spell;Granite Hide:armor
fire-elemental|FIRE ELEMENTAL|rare|fire|3|26|Flare:sword;Blaze:spell;Smoke:armor
troll|TROLL|uncommon|rock|3|27|Rumble:spell;Stone Wall:armor
rat|RAT|common|grass|2|28|Gnaw:sword;Scurry:armor
zombie|ZOMBIE|common|dark|2|29|Fang:sword;Hex:spell
vampire|VAMPIRE|rare|dark|3|30|Fang:sword;Wail:spell;Fade:armor
beholder|BEHOLDER|legendary|dark|4|31|Bite:sword;Eye Beam:spell;Glare:armor
flying-skull|FLYING SKULL|common|dark|2|32|Bone Rattle:sword;Fade:armor
floating-eye|FLOATING EYE|uncommon|dark|3|33|Stare:spell;Blink:armor
salamander|SALAMANDER|uncommon|fire|3|34|Ember Claw:sword;Fireball:spell
mummy|MUMMY|uncommon|dark|3|35|Bone Rattle:sword;Grave Guard:armor
evil-mage|EVIL MAGE|uncommon|dark|3|36|Fang:sword;Wail:spell
cultist|CULTIST|common|dark|2|37|Bone Rattle:sword;Grave Guard:armor
wolf|WOLF|uncommon|grass|3|38|Thorn Lash:sword;Vine Hex:spell
lizardman|LIZARDMAN|uncommon|water|3|39|Tide Strike:sword;Wave Guard:armor
birdman|BIRDMAN|uncommon|light|3|40|Dive:sword;Radiance:spell
animated-armor|ANIMATED ARMOR|uncommon|rock|3|41|Rumble:spell;Stone Wall:armor
stone-golem|STONE GOLEM|rare|rock|3|42|Smash:sword;Rumble:spell;Wall:armor
dark-elf-hunter|DARK ELF HUNTER|uncommon|dark|3|43|Bone Rattle:sword;Shroud:armor
dark-elf-mage|DARK ELF MAGE|uncommon|dark|3|44|Hex:spell;Fade:armor
wyvern|WYVERN|rare|fire|3|45|Flame Slash:sword;Fireball:spell;Smoke Veil:armor
aquaticman|FISHMAN|common|water|2|46|Lash:sword;Tidal Wave:spell
dwarf|DWARF|uncommon|rock|3|47|Quake Stomp:sword;Sandstorm:spell
worm|WORM|common|grass|2|48|Pounce:sword;Burrow:armor
bear|BEAR|uncommon|grass|3|49|Spore Cloud:spell;Bark Skin:armor
witch|WITCH|uncommon|dark|3|50|Fang:sword;Hex:spell
gargoyle|GARGOYLE|uncommon|rock|3|51|Quake Stomp:sword;Sandstorm:spell
gremlin|GREMLIN|common|dark|2|52|Hex:spell;Shroud:armor
centaur|CENTAUR|uncommon|grass|3|53|Thorn Lash:sword;Pollen Burst:spell
guard-spear|GUARD SPEAR|common|light|2|54|Dive:sword;Sun Flare:spell
guard-sword|GUARD SWORD|uncommon|light|3|55|Dive:sword;Sun Flare:spell
sprite|SPRITE|uncommon|light|3|56|Dive:sword;Radiance:spell
fox|FOX|uncommon|grass|3|57|Pounce:sword;Trick:spell
white-rabbit|WHITE RABBIT|common|grass|2|58|Pounce:sword;Leaf Guard:armor
brown-owl|BROWN OWL|uncommon|grass|3|59|Pounce:sword;Leaf Guard:armor
snail|SNAIL|common|water|2|60|Bubble Hex:spell;Shell Up:armor
lynx|LYNX|common|grass|2|61|Thorn Lash:sword;Vine Hex:spell
moose|MOOSE|common|grass|2|62|Pounce:sword;Burrow:armor
eagle|EAGLE|uncommon|light|3|63|Dive:sword;Radiance:spell
spider-02|GIANT SPIDER|common|grass|2|64|Thorn Lash:sword;Pollen Burst:spell
banshee|BANSHEE|uncommon|dark|3|65|Hex:spell;Grave Guard:armor
couatl|COUATL|legendary|light|4|66|Strike:sword;Sun Flare:spell;Aegis:armor
cyclops|CYCLOPS|rare|rock|3|67|Boulder Fist:sword;Rumble:spell;Hunker:armor
death-knight|DEATH KNIGHT|legendary|dark|4|68|Fang:sword;Wail:spell;Grave Guard:armor
shadow-demon|SHADOW DEMON|rare|dark|3|69|Shadow Claw:sword;Wail:spell;Shroud:armor
marilith|MARILITH|rare|fire|3|70|Ember Claw:sword;Inferno:spell;Ash Shield:armor
gnoll|GNOLL|uncommon|grass|3|71|Spore Cloud:spell;Bark Skin:armor
drow-elf|DROW ELF|uncommon|dark|3|72|Bone Rattle:sword;Fade:armor
succubus|SUCCUBUS|rare|fire|3|73|Scorch:sword;Fireball:spell;Smoke Veil:armor
orb|ORB|uncommon|light|3|74|Halo:spell;Ward:armor
elder-horror|ELDER HORROR|legendary|dark|4|75|Shadow Claw:sword;Hex:spell;Grave Guard:armor
poltergeist|POLTERGEIST|uncommon|dark|3|76|Bone Rattle:sword;Shroud:armor
nightmare|NIGHTMARE|rare|dark|3|77|Fang:sword;Curse:spell;Shroud:armor
drow-spider|DROW SPIDER|uncommon|dark|3|78|Hex:spell;Grave Guard:armor
snakeman|SNAKEMAN|uncommon|grass|3|79|Spore Cloud:spell;Leaf Guard:armor
brain-sucker|BRAIN SUCKER|uncommon|dark|3|80|Fang:sword;Hex:spell
displacer-beast|DISPLACER BEAST|rare|dark|3|81|Shadow Claw:sword;Hex:spell;Shroud:armor
umber-hulk|UMBER HULK|rare|rock|3|82|Smash:sword;Sandstorm:spell;Stone Wall:armor
orc-shaman-master|ORC SHAMAN MASTER|uncommon|grass|3|83|Pounce:sword;Leaf Guard:armor
angel|ANGEL|legendary|light|4|84|Smite:sword;Halo:spell;Shield:armor
white-worm|WHITE WORM|uncommon|water|3|85|Bubble Hex:spell;Ice Wall:armor
crabman|CRABMAN|uncommon|water|3|86|Bubble Hex:spell;Ice Wall:armor
crawling-claw|CRAWLING CLAW|common|dark|2|87|Fang:sword;Curse:spell
aquatic-elf|AQUATIC ELF|uncommon|water|3|88|Tide Strike:sword;Ice Wall:armor
eyehorror|EYE HORROR|uncommon|dark|3|89|Hex:spell;Fade:armor
chaos-screamer|CHAOS SCREAMER|uncommon|fire|3|90|Ember Claw:sword;Inferno:spell
frog|FROG|common|water|2|91|Tide Strike:sword;Shell Up:armor
toad|TOAD|common|water|2|92|Tide Strike:sword;Shell Up:armor
harpy|HARPY|uncommon|light|3|93|Halo:spell;Ward:armor
fungoid|FUNGOID|uncommon|grass|3|94|Spore Cloud:spell;Leaf Guard:armor
genie|GENIE|legendary|light|4|95|Strike:sword;Halo:spell;Aegis:armor
ettin|ETTIN|uncommon|rock|3|96|Rumble:spell;Granite Hide:armor
warewolf|WEREWOLF|uncommon|grass|3|97|Thorn Lash:sword;Vine Hex:spell
moth|MOTH|common|grass|2|98|Pounce:sword;Burrow:armor
phasespawn|PHASE SPAWN|uncommon|dark|3|99|Bone Rattle:sword;Grave Guard:armor
grimlock|GRIMLOCK|common|rock|2|100|Quake Stomp:sword;Rune Rock:spell
imp|IMP|uncommon|fire|3|101|Ember Claw:sword;Blaze:spell
red-dragon|RED DRAGON|legendary|fire|4|102|Flame Slash:sword;Inferno:spell;Smoke Veil:armor
locathah|LOCATHAH|uncommon|water|3|103|Bubble Hex:spell;Wave Guard:armor
medusa|MEDUSA|rare|dark|3|104|Fang:sword;Gaze:spell;Coil:armor
mist|MIST|uncommon|water|3|105|Tide Strike:sword;Wave Guard:armor
yeti|YETI|rare|water|3|106|Maul:sword;Frost:spell;Hunker:armor
minotaur|MINOTAUR|rare|rock|3|107|Boulder Fist:sword;Sandstorm:spell;Stone Wall:armor
lamia|LAMIA|rare|grass|3|108|Pounce:sword;Spore Cloud:spell;Leaf Guard:armor
manticore|MANTICORE|legendary|fire|4|109|Sting:sword;Roar:spell;Wings:armor
electric-elemental|ELECTRIC ELEMENTAL|rare|light|3|110|Smite:sword;Halo:spell;Aegis:armor
magma-elemental|MAGMA ELEMENTAL|rare|fire|3|111|Flame Slash:sword;Fireball:spell;Cinder Wall:armor
mimic|MIMIC|rare|rock|3|112|Quake Stomp:sword;Rune Rock:spell;Hunker:armor
kenku|KENKU|uncommon|light|3|113|Strike:sword;Aegis:armor
satyr|SATYR|uncommon|grass|3|114|Thorn Lash:sword;Spore Cloud:spell
hippogriff|HIPPOGRIFF|rare|light|3|115|Strike:sword;Radiance:spell;Shield:armor
meateater-plant|MEAT-EATER PLANT|uncommon|grass|3|116|Pounce:sword;Burrow:armor
weretiger|WERETIGER|uncommon|fire|3|117|Scorch:sword;Cinder Wall:armor
mudman|MUDMAN|common|rock|2|118|Quake Stomp:sword;Sandstorm:spell
octopus|OCTOPUS|uncommon|water|3|119|Tide Strike:sword;Wave Guard:armor
womanscorpion|SCORPION WOMAN|uncommon|rock|3|120|Quake Stomp:sword;Sandstorm:spell
centipede|CENTIPEDE|common|grass|2|121|Pounce:sword;Burrow:armor
mosquito|MOSQUITO|common|grass|2|122|Pounce:sword;Leaf Guard:armor
skeleton-archer|SKELETON ARCHER|uncommon|dark|3|123|Bone Rattle:sword;Grave Guard:armor
burning-skeleton|BURNING SKELETON|uncommon|fire|3|124|Fireball:spell;Smoke Veil:armor
crab|CRAB|uncommon|water|3|125|Pinch:sword;Shell Up:armor
ghost-spider|GHOST SPIDER|uncommon|dark|3|126|Hex:spell;Shroud:armor
bee|BEE|common|grass|2|127|Thorn Lash:sword;Spore Cloud:spell
sorrowsworn|SORROWSWORN|rare|dark|3|128|Shadow Claw:sword;Wail:spell;Shroud:armor
$cat$, E'\n')) as l where btrim(l) <> '') rows
on conflict (slug) do update set title = excluded.title, blurb = excluded.blurb, art = excluded.art, sort = excluded.sort,
  rarity = excluded.rarity, element = excluded.element, hearts = excluded.hearts, moves = excluded.moves, droppable = true, active = true;

-- Which Historikal drops: roll the rarity first (60 / 25 / 12 / 3), then any creature of that rarity.
create or replace function public.cr_roll_historikal() returns text
language plpgsql volatile security definer set search_path = public as $$
declare r float := random(); v_rar text; v text;
begin
  v_rar := case when r < 0.03 then 'legendary' when r < 0.15 then 'rare' when r < 0.40 then 'uncommon' else 'common' end;
  select slug into v from public.badge_kinds where active and droppable and rarity = v_rar order by random() limit 1;
  if v is null then select slug into v from public.badge_kinds where active and droppable order by random() limit 1; end if;
  if v is null then select slug into v from public.badge_kinds where active order by random() limit 1; end if;
  return v;
end;
$$;
revoke all on function public.cr_roll_historikal() from public, anon, authenticated;

-- Everywhere a tradable was picked at random, roll a Historikal instead. Each function is rewritten from its own
-- current definition, changing only that one line.
do $do$
declare d text;
begin
  for d in select pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname in ('award_badges', 'cr_birthday_badge') loop
    d := replace(d, 'select slug into v_kind from public.badge_kinds where active order by random() limit 1;',
                    'v_kind := public.cr_roll_historikal();');
    d := replace(d, 'select slug, title into v_kind, v_title from public.badge_kinds where active order by random() limit 1;',
                    'select slug, title into v_kind, v_title from public.badge_kinds where slug = public.cr_roll_historikal();');
    execute d;
  end loop;
end
$do$;
