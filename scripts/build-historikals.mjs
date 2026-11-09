// Builds the Historikal catalogue from the recast roster, in both places it lives:
//   lib/historikals.ts                                        what the app shows
//   supabase/migrations/20261109000000_historikal_recast.sql   what the database rolls, battles and checks
// so the two can't drift. Run: node scripts/build-historikals.mjs
//
// Sources, in scripts/historikals/:
//   roster.json  the recast roster, exported from the Historikal Recast picker: name, rarity, both types,
//                whether the element is rolled in game (rnd) or changes every battle (shift), and the old
//                slug a creature takes over (its owners' copies become the new creature).
//   legacy.json  the catalogue before the recast. Old creatures not in the roster stop dropping; anyone
//                holding one keeps it.
// The pictures (public/creatures/<slug>.png, -2, -s, and <slug>--<element>.png for rolled ones) are
// rendered by the picker with each creature's colours; this script doesn't draw them.

import fs from "node:fs";
import path from "node:path";

const here = path.dirname(new URL(import.meta.url).pathname);
const root = path.resolve(here, "..");
const roster = JSON.parse(fs.readFileSync(path.join(here, "historikals/roster.json"), "utf8"));
const legacy = JSON.parse(fs.readFileSync(path.join(here, "historikals/legacy.json"), "utf8"));

// The picker's type keys, as the game names them.
const FROM_PICKER = { fire: "fire", water: "tide", nature: "nature", earth: "ward", normal: "feral", shadow: "dark", light: "spirit" };
// The old six, as the game now names them (for creatures that stopped dropping).
const FROM_OLD = { fire: "fire", water: "tide", grass: "nature", rock: "ward", dark: "dark", light: "spirit" };
// And back: the old single-element column stays filled, so anything still reading it keeps working.
const TO_OLD = { fire: "fire", tide: "water", nature: "grass", ward: "rock", feral: "rock", dark: "dark", spirit: "light" };
const TYPES = ["fire", "tide", "nature", "ward", "feral", "dark", "spirit"];
const HEARTS = { common: 2, uncommon: 3, rare: 3, epic: 4, legendary: 4 };
const MOVE_COUNT = { common: 2, uncommon: 2, rare: 3, epic: 3, legendary: 3 };

// Moves by type and kind. A creature's moves come from its types: its first type leads.
const POOL = {
  fire: { sword: ["Flame Slash", "Ember Claw", "Scorch", "Cinder Bite", "Blaze Fang", "Flare Kick", "Searing Jab"], spell: ["Fireball", "Inferno", "Blaze", "Ember Rain", "Heat Wave", "Pyre", "Kindle"], armor: ["Cinder Wall", "Smoke Veil", "Ash Shield", "Heat Haze", "Ember Guard", "Flame Cloak", "Soot Screen"] },
  tide: { sword: ["Tide Strike", "Riptide", "Lash", "Splash Jab", "Wave Cut", "Undertow", "Brine Bite"], spell: ["Tidal Wave", "Bubble Hex", "Frost", "Rain Call", "Whirlpool", "Ice Shard", "Mist Hex"], armor: ["Ice Wall", "Wave Guard", "Shell Up", "Foam Shield", "Frost Coat", "Tide Pool", "Mist Veil"] },
  nature: { sword: ["Thorn Lash", "Vine Whip", "Bramble Jab", "Root Snap", "Leaf Blade", "Sting", "Pounce"], spell: ["Spore Cloud", "Vine Hex", "Pollen Burst", "Bloom", "Overgrow", "Sap Drain", "Thorn Rain"], armor: ["Leaf Guard", "Bark Skin", "Burrow", "Moss Coat", "Briar Wall", "Husk", "Petal Shield"] },
  ward: { sword: ["Strike", "Shield Bash", "Boulder Fist", "Smash", "Quake Stomp", "Lunge", "Hammer Down"], spell: ["Rumble", "Rune Rock", "Sandstorm", "War Cry", "Rally", "Stone Hex", "Battle Hymn"], armor: ["Stone Wall", "Granite Hide", "Hunker", "Bulwark", "Iron Skin", "Parry", "Brace"] },
  feral: { sword: ["Bite", "Maul", "Gnaw", "Claw", "Rend", "Fang", "Tusk"], spell: ["Roar", "Howl", "Screech", "Snarl", "Stampede", "Frenzy", "Musk"], armor: ["Scurry", "Hide", "Thick Hide", "Curl Up", "Dodge", "Bristle", "Den"] },
  dark: { sword: ["Shadow Claw", "Night Slash", "Bone Rattle", "Grim Reap", "Soul Bite", "Gloom Jab", "Dusk Fang"], spell: ["Hex", "Curse", "Wail", "Dread", "Shade Bolt", "Doom", "Blight"], armor: ["Shroud", "Fade", "Grave Guard", "Veil", "Murk", "Cloak", "Gloom Wall"] },
  spirit: { sword: ["Smite", "Dive", "Halo Strike", "Glint", "Spirit Lance", "Ghost Touch", "Radiant Jab"], spell: ["Sun Flare", "Halo", "Radiance", "Haunt", "Blessing", "Aura Burst", "Gleam"], armor: ["Aegis", "Shield", "Sanctuary", "Phase", "Glow Veil", "Ether Guard", "Blink"] },
};
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; };
const pick = (list, seed) => list[seed % list.length];
function makeMoves(slug, types, rarity) {
  const [a, b = a] = types, s = hash(slug);
  if (MOVE_COUNT[rarity] === 2) {
    // Two moves: a sword in its first type, then a spell or armor in its second.
    const k2 = s % 2 ? "spell" : "armor";
    return [{ name: pick(POOL[a].sword, s >>> 3), kind: "sword" }, { name: pick(POOL[b][k2], s >>> 7), kind: k2 }];
  }
  return [{ name: pick(POOL[a].sword, s >>> 3), kind: "sword" }, { name: pick(POOL[b].spell, s >>> 7), kind: "spell" }, { name: pick(POOL[a].armor, s >>> 11), kind: "armor" }];
}

const slugify = (n) => n.toLowerCase().replace(/['’.]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const oldBySlug = new Map(legacy.map((h) => [h.slug, h]));
const taken = new Set(legacy.map((h) => h.slug));
const out = [];
for (const [i, r] of roster.entries()) {
  let slug = r.slug;
  if (!slug) { slug = slugify(r.name); if (!slug || taken.has(slug)) slug = `${slugify(r.name) || "historikal"}-${r.sprite}`; }
  if (out.some((h) => h.slug === slug)) throw new Error(`two creatures want ${slug}`);
  taken.add(slug);
  let types = [...new Set((r.one ? r.types.slice(0, 1) : r.types).map((t) => FROM_PICKER[t]))];
  if (types.some((t) => !t)) throw new Error(`${r.id}: unknown type in ${r.types}`);
  const old = oldBySlug.get(slug);
  // A creature that takes over an old one keeps its moves when it still has as many.
  const moves = old && old.moves.length === MOVE_COUNT[r.rarity] ? old.moves : makeMoves(slug, types, r.rarity);
  out.push({ slug, name: r.name, rarity: r.rarity, types, hearts: HEARTS[r.rarity], moves, rnd: !!r.rnd && !r.shift, shift: !!r.shift, sort: 1000 + i, pickerId: r.id });
}
const inRoster = new Set(out.map((h) => h.slug));
const retired = legacy.filter((h) => !inRoster.has(h.slug)).map((h, i) => ({ ...h, types: [FROM_OLD[h.element]], retired: true, sort: 3000 + i }));

// ---- lib/historikals.ts
const q = (s) => JSON.stringify(s);
const tsRow = (h) => `  { slug: ${q(h.slug)}, name: ${q(h.name)}, rarity: ${q(h.rarity)}, types: [${h.types.map(q).join(", ")}], hearts: ${h.hearts}, moves: [${h.moves.map((m) => `{ name: ${q(m.name)}, kind: ${q(m.kind)} }`).join(", ")}]${h.rnd ? ", rnd: true" : ""}${h.shift ? ", shift: true" : ""}${h.retired ? ", retired: true" : ""} },`;
const ts = `/** Historikals: the creatures you collect, trade and battle with.
 *  GENERATED by scripts/build-historikals.mjs from scripts/historikals/*.json, together with the database's
 *  copy (supabase/migrations/20261109000000_historikal_recast.sql). Edit the roster and run it again. */

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
/** The seven types. */
export type Element = "fire" | "tide" | "nature" | "ward" | "feral" | "dark" | "spirit";
export type MoveKind = "sword" | "spell" | "armor";
export type Move = { name: string; kind: MoveKind };
/** \`types\`: one or two, the first leads. \`rnd\`: each copy rolls its first type when it's found. \`shift\`: its
 *  first type changes after every battle. \`retired\`: from before the recast; kept by whoever holds one, never found. */
export type Historikal = { slug: string; name: string; rarity: Rarity; types: Element[]; hearts: number; moves: Move[]; rnd?: boolean; shift?: boolean; retired?: boolean };

export const RARITIES: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary"];
export const RARITY_COLOR: Record<Rarity, string> = { common: "#b8c0d6", uncommon: "#4c7df0", rare: "#e0398a", epic: "#a98ff0", legendary: "#f2b544" };
export const TYPES: Element[] = ${q(TYPES)};
/** Each type in a colour that says what it is. */
export const ELEMENT_COLOR: Record<Element, string> = { fire: "#ff6a3d", tide: "#3fa9f5", nature: "#6fa86a", ward: "#a7abb6", feral: "#b0865f", dark: "#8a6fd9", spirit: "#f2e2a2" };

/** Sword cuts Spell, Spell breaks Armor, Armor blocks Sword. */
export const BEATS: Record<MoveKind, MoveKind> = { sword: "spell", spell: "armor", armor: "sword" };

/** What each type hits hard (a winning hit takes two hearts). Every type beats two and loses to two. */
export const SUPER: Record<Element, Element[]> = { fire: ["nature", "dark"], tide: ["fire", "ward"], nature: ["tide", "feral"], ward: ["fire", "spirit"], feral: ["ward", "tide"], dark: ["spirit", "nature"], spirit: ["dark", "feral"] };
/** A hit is super effective when the attacker's first type beats either of the defender's. */
export const damage = (from: Element, to: Element[]) => (to.some((t) => SUPER[from].includes(t)) ? 2 : 1);

/** Where a tradable's picture lives: Historikals are creatures; the old item kinds keep their pictures. */
export const kindArtSrc = (art: string) => (art.startsWith("creatures/") ? \`/\${art}\` : \`/badges/tradable/\${art}\`);

/** A Historikal's picture: frame 1 or 2. One that rolls its type is drawn in the colour of the type it rolled. */
export const historikalSrc = (slug: string, frame: 1 | 2 = 1, el?: Element) =>
  \`/creatures/\${slug}\${el && HISTORIKAL.get(slug)?.rnd && el !== HISTORIKAL.get(slug)?.types[0] ? \`--\${el}\` : ""}\${frame === 2 ? "-2" : ""}.png\`;

export const HISTORIKALS: Historikal[] = [
${out.map(tsRow).join("\n")}
  // From before the recast: kept by whoever holds one, never found.
${retired.map(tsRow).join("\n")}
];

export const HISTORIKAL = new Map(HISTORIKALS.map((h) => [h.slug, h]));
`;
fs.writeFileSync(path.join(root, "lib/historikals.ts"), ts);

// ---- the migration
const line = (h) => [h.slug, h.name.toUpperCase(), h.rarity, h.types[0], h.types[1] ?? "", h.hearts, h.sort, h.rnd ? 1 : 0, h.shift ? 1 : 0, h.moves.map((m) => `${m.name}:${m.kind}`).join(";")].join("|");
for (const h of out) if (/[|;:]/.test(h.name + h.moves.map((m) => m.name).join(""))) throw new Error(`separator in ${h.slug}`);
const els = (a) => `array[${a.map((t) => `'${t}'`).join(", ")}]`;
const caseOld = (x) => `case ${x} ${Object.entries(TO_OLD).map(([n, o]) => `when '${n}' then '${o}'`).join(" ")} end`;
const sql = `-- The Historikal recast. GENERATED by scripts/build-historikals.mjs (with lib/historikals.ts): edit the roster
-- and run it again rather than editing this by hand.
--
-- * Seven types (fire, tide, nature, ward, feral, dark, spirit), one or two a creature, in badge_kinds.types.
--   The old single element column stays filled with its nearest old type, so anything still reading it works.
-- * A new rarity between rare and legendary: epic.
-- * ${out.length} creatures with new pictures. Those that take over an old creature keep its slug, so the copies
--   people hold become the new creature. Old creatures not in the roster stop dropping; holders keep them.
-- * Some creatures roll their first type when found (badge_items.rolled); the Rainbow ones change it after
--   every battle.
-- * Battles: a hit is super effective (two hearts) when the attacker's first type beats either of the
--   defender's types. Nothing is immune any more.
-- * Everything as it was is kept in badge_kinds_pre_recast.

create table if not exists public.badge_kinds_pre_recast as select * from public.badge_kinds;
alter table public.badge_kinds_pre_recast enable row level security;

alter table public.badge_kinds drop constraint if exists badge_kinds_rarity_check;
alter table public.badge_kinds add constraint badge_kinds_rarity_check check (rarity in ('common', 'uncommon', 'rare', 'epic', 'legendary'));
alter table public.badge_kinds
  add column if not exists types text[],
  add column if not exists rnd boolean not null default false,
  add column if not exists shift boolean not null default false;
alter table public.badge_kinds drop constraint if exists badge_kinds_types_check;
alter table public.badge_kinds add constraint badge_kinds_types_check
  check (types is null or (array_length(types, 1) between 1 and 2 and types <@ ${els(TYPES)}));
alter table public.badge_items add column if not exists rolled text;
alter table public.badge_items drop constraint if exists badge_items_rolled_check;
alter table public.badge_items add constraint badge_items_rolled_check check (rolled is null or rolled = any (${els(TYPES)}));

-- Every creature from before stops dropping and takes its type's new name; the roster below brings back its own.
update public.badge_kinds set droppable = false,
       types = array[case element ${Object.entries(FROM_OLD).map(([o, n]) => `when '${o}' then '${n}'`).join(" ")} end]
 where element is not null;

-- The roster, one creature a line: slug|NAME|rarity|type|second type|hearts|order|rolls its type|changes it|move:kind;...
insert into public.badge_kinds (slug, title, blurb, art, sort, rarity, element, types, rnd, shift, hearts, moves, droppable, active)
select f[1], f[2],
       'A ' || f[3] || ' ' || initcap(f[4]) || case when f[5] <> '' then '/' || initcap(f[5]) else '' end || ' Historikal.',
       'creatures/' || f[1] || '.png', f[7]::int, f[3], ${caseOld("f[4]")},
       case when f[5] <> '' then array[f[4], f[5]] else array[f[4]] end, f[8] = '1', f[9] = '1', f[6]::int,
       (select jsonb_agg(jsonb_build_object('name', split_part(m, ':', 1), 'kind', split_part(m, ':', 2)) order by o)
          from unnest(string_to_array(f[10], ';')) with ordinality as x(m, o)),
       true, true
  from (select string_to_array(l, '|') as f from unnest(string_to_array($cat$
${out.map(line).join("\n")}
$cat$, E'\\n')) as l where btrim(l) <> '') rows
on conflict (slug) do update set title = excluded.title, blurb = excluded.blurb, art = excluded.art, sort = excluded.sort,
  rarity = excluded.rarity, element = excluded.element, types = excluded.types, rnd = excluded.rnd, shift = excluded.shift,
  hearts = excluded.hearts, moves = excluded.moves, droppable = true, active = true;

-- Which type a creature is right now: its own, the one its copy rolled, or (the Rainbow ones) one that
-- changes after every battle its holder fights.
create or replace function public.cr_hk_types(i public.badge_items, k public.badge_kinds) returns text[]
language plpgsql stable security definer set search_path = public as $$
declare opts text[]; n bigint;
begin
  if k.types is null then return null; end if;
  if k.shift then
    opts := array_remove(${els(TYPES)}, k.types[2]);
    select count(*) into n from public.battle_results b where b.winner = i.owner_id or b.loser = i.owner_id;
    return array[opts[1 + ((hashtext(i.id::text || ':' || n::text)::bigint % array_length(opts, 1)) + array_length(opts, 1)) % array_length(opts, 1)]] || k.types[2:2];
  end if;
  if k.rnd and i.rolled is not null then
    return case when i.rolled = k.types[2] then array[i.rolled] else array[i.rolled] || k.types[2:2] end;
  end if;
  return k.types;
end;
$$;
revoke all on function public.cr_hk_types(public.badge_items, public.badge_kinds) from public, anon, authenticated;
create index if not exists battle_results_loser on public.battle_results (loser);

-- A Historikal as battles, trades and draws see it. 'types' is new; 'element' stays, in the old six.
create or replace function public.cr_hk(p_item bigint) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', i.id, 'slug', k.slug, 'name', k.title, 'rarity', k.rarity,
                            'element', coalesce(${caseOld("t.v[1]")}, k.element), 'types', to_jsonb(t.v), 'hearts', k.hearts,
                            'hp', least(k.hearts, coalesce(i.hp, k.hearts)), 'moves', k.moves)
    from public.badge_items i join public.badge_kinds k on k.slug = i.kind_slug
    cross join lateral (select public.cr_hk_types(i, k) as v) t
   where i.id = p_item;
$$;

-- The type chart: each type beats two.
create or replace function public.cr_beats(a text, b text) returns boolean language sql immutable as $$
  select (a, b) in (${Object.entries({ fire: ["nature", "dark"], tide: ["fire", "ward"], nature: ["tide", "feral"], ward: ["fire", "spirit"], feral: ["ward", "tide"], dark: ["spirit", "nature"], spirit: ["dark", "feral"] }).flatMap(([a, bs]) => bs.map((b) => `('${a}', '${b}')`)).join(", ")});
$$;
-- Two hearts when the attacker's first type beats either of the defender's types, else one.
create or replace function public.cr_dmg(f jsonb, t jsonb) returns integer language sql immutable as $$
  select case when exists (select 1 from jsonb_array_elements_text(coalesce(t, '[]'::jsonb)) x where public.cr_beats(f->>0, x)) then 2 else 1 end;
$$;

-- Battles use both types: rewrite the six damage calls in cr_enc_act, and nothing else.
do $do$
declare d text; n int;
begin
  d := pg_get_functiondef('public.cr_enc_act(bigint, jsonb)'::regprocedure);
  n := (length(d) - length(replace(d, $x$public.cr_dmg(fa->>'element', fb->>'element')$x$, ''))) / length($x$public.cr_dmg(fa->>'element', fb->>'element')$x$)
     + (length(d) - length(replace(d, $x$public.cr_dmg(fb->>'element', fa->>'element')$x$, ''))) / length($x$public.cr_dmg(fb->>'element', fa->>'element')$x$);
  if n <> 6 then raise exception 'cr_enc_act: expected 6 damage calls, found %', n; end if;
  d := replace(d, $x$public.cr_dmg(fa->>'element', fb->>'element')$x$, $x$public.cr_dmg(fa->'types', fb->'types')$x$);
  d := replace(d, $x$public.cr_dmg(fb->>'element', fa->>'element')$x$, $x$public.cr_dmg(fb->'types', fa->'types')$x$);
  execute d;

  -- Their fighter's types stay hidden until you know it, like its element.
  d := pg_get_functiondef('public.cr_enc_view(bigint)'::regprocedure);
  if position($x$else 'element' end)$x$ in d) = 0 then raise exception 'cr_enc_view: element hiding not found'; end if;
  d := replace(d, $x$else 'element' end)$x$,
    $x$else 'element' end) - (case when coalesce((s->'known'->th->>tp::text)::boolean, false) then 'nothing' else 'types' end)$x$);
  execute d;
end
$do$;

-- A creature that rolls its type rolls it when it's found (any of six; Feral doesn't roll), never its second.
create or replace function public.cr_roll_element() returns trigger
language plpgsql security definer set search_path = public as $$
declare k public.badge_kinds; opts text[];
begin
  if new.rolled is null and new.kind_slug is not null then
    select * into k from public.badge_kinds where slug = new.kind_slug;
    if found and k.rnd then
      opts := array_remove(array['fire', 'tide', 'nature', 'ward', 'dark', 'spirit'], k.types[2]);
      new.rolled := opts[1 + floor(random() * array_length(opts, 1))::int];
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists cr_zz_roll_element on public.badge_items;
-- Named to run after cr_one_legendary, which can swap the creature.
create trigger cr_zz_roll_element before insert or update of kind_slug on public.badge_items
  for each row execute function public.cr_roll_element();
-- Copies already held that now roll get their roll.
update public.badge_items i set rolled = (array_remove(array['fire', 'tide', 'nature', 'ward', 'dark', 'spirit'], k.types[2]))[1 + floor(random() * 5)::int]
  from public.badge_kinds k where k.slug = i.kind_slug and k.rnd and i.rolled is null;

-- Finding one: common 58%, uncommon 25%, rare 11%, epic 4%, legendary 2% (a legendary someone has is skipped).
create or replace function public.cr_roll_historikal() returns text
language plpgsql security definer set search_path = public as $$
declare r float := random(); v_rar text; v text;
begin
  v_rar := case when r < 0.02 then 'legendary' when r < 0.06 then 'epic' when r < 0.17 then 'rare' when r < 0.42 then 'uncommon' else 'common' end;
  if v_rar = 'legendary' then
    select slug into v from public.badge_kinds where active and droppable and rarity = 'legendary' and not public.cr_legendary_taken(slug) order by random() limit 1;
    if v is null then v_rar := 'epic'; end if;
  end if;
  if v is null then select slug into v from public.badge_kinds where active and droppable and rarity = v_rar order by random() limit 1; end if;
  if v is null then select slug into v from public.badge_kinds where active and droppable and rarity <> 'legendary' order by random() limit 1; end if;
  return v;
end;
$$;
revoke all on function public.cr_roll_historikal() from public, anon, authenticated;

-- Summoning one (main quests): legendary 4%, epic 10%, rare 56%, uncommon 30%.
create or replace function public.cr_roll_main_historikal() returns text
language plpgsql security definer set search_path = public as $$
declare v text; r float := random();
        v_rar text := case when r < 0.04 then 'legendary' when r < 0.14 then 'epic' when r < 0.70 then 'rare' else 'uncommon' end;
begin
  if v_rar = 'legendary' then
    select slug into v from public.badge_kinds where active and droppable and rarity = 'legendary' and not public.cr_legendary_taken(slug) order by random() limit 1;
    if v is null then v_rar := 'epic'; end if;
  end if;
  if v is null then select slug into v from public.badge_kinds where active and droppable and rarity = v_rar order by random() limit 1; end if;
  return coalesce(v, public.cr_roll_historikal());
end;
$$;
revoke all on function public.cr_roll_main_historikal() from public, anon, authenticated;

-- The wiki's facts about them.
update public.wiki_facts set body = 'Common, uncommon, rare, epic, and legendary' where body = 'Common, uncommon, rare, and legendary';
update public.wiki_facts set body = 'Hundreds of types' where body = 'Well over a hundred types';

-- Tidy: the chart functions keep a fixed search path; the roll trigger is a trigger only.
alter function public.cr_beats(text, text) set search_path = public;
alter function public.cr_dmg(jsonb, jsonb) set search_path = public;
revoke all on function public.cr_roll_element() from public, anon, authenticated;
`;
fs.writeFileSync(path.join(root, "supabase/migrations/20261109000000_historikal_recast.sql"), sql);

// Which picture each creature takes (for copying the picker's renders in).
fs.writeFileSync(path.join(here, "historikals/art-map.json"), JSON.stringify(Object.fromEntries(out.map((h) => [h.pickerId, h.slug])), null, 0));
console.log(`${out.length} creatures, ${retired.length} retired; ${out.filter((h) => h.rnd).length} roll their type, ${out.filter((h) => h.shift).length} change it`);
