-- The creature editor: for the people in creature_editors (to start, sammiwithaneye), from the ··· menu. They can
-- change a creature's name, rarity, types and moves, whether it can still be found, its hover / rolls-its-type /
-- changes-every-battle flags, see who holds it, and swap a held copy to another creature. Every change is
-- written to creature_edits, with what it was before.

create table if not exists public.creature_editors (user_id uuid primary key references public.profiles (id) on delete cascade);
alter table public.creature_editors enable row level security;
drop policy if exists creature_editors_self on public.creature_editors;
create policy creature_editors_self on public.creature_editors for select using (user_id = auth.uid());
insert into public.creature_editors (user_id) select id from public.profiles where handle = 'sammiwithaneye' on conflict do nothing;

create table if not exists public.creature_edits (
  id bigserial primary key, at timestamptz not null default now(), by uuid, slug text, item bigint, before jsonb, after jsonb);
alter table public.creature_edits enable row level security;

-- Hovering (flyers and floaters bob) moves into the database too, so the editor can change it.
alter table public.badge_kinds add column if not exists hover boolean not null default false;
update public.badge_kinds set hover = true where slug in ('ghost-fire', 'ghost-pirate', 'ghost-squire', 'ghost-slime', 'mr-ghost', 'bone-ghost', 'ghost-knight', 'ghost', 'lit-ghostnya', 'funny-ghost', 'mr-ghost-sr', 'ghostnya', 'friendly-ghost', 'ghost-chef', 'ghost-key', 'book-ghost', 'winged-devil', 'peryton', 'banshee', 'bat', 'bee', 'lord-of-all-eagles', 'eyehorror', 'mosquito', 'flying-skull', 'gazer', 'beholder', 'harpy', 'sprite', 'moth', 'thunderhead', 'wasp', 'thunderbird', 'silver-simurgh', 'batwing-slime', 'feyre', 'frost-wasp', 'snow-globe', 'storm-wraith', 'pixies', 'storm-eagle', 'gust-ghost', 'lil-star', 'pastel-phantom', 'cherub-wisp', 'spark-sprite', 'feathered-wyrmling', 'feathered-wyrm');

create or replace function public.cr_is_editor() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.creature_editors where user_id = auth.uid());
$$;

-- A creature as the editor sees it.
create or replace function public.cr_creature_row(k public.badge_kinds) returns jsonb language sql stable as $$
  select jsonb_build_object('slug', k.slug, 'name', k.title, 'rarity', k.rarity, 'types', to_jsonb(k.types), 'hearts', k.hearts,
    'moves', k.moves, 'droppable', k.droppable, 'hover', k.hover, 'rnd', k.rnd, 'shift', k.shift);
$$;

create or replace function public.cr_edit_creature(p_slug text, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k public.badge_kinds; v_name text; v_rar text; v_types text[]; v_moves jsonb; m jsonb; n int; before jsonb;
begin
  if not public.cr_is_editor() then return jsonb_build_object('ok', false, 'code', 'not_editor'); end if;
  select * into k from public.badge_kinds where slug = p_slug and types is not null for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'missing'); end if;
  before := public.cr_creature_row(k);
  v_name := upper(btrim(coalesce(p->>'name', k.title)));
  if length(v_name) not between 1 and 40 or v_name ~ '[|;:]' then return jsonb_build_object('ok', false, 'code', 'bad_name'); end if;
  v_rar := coalesce(p->>'rarity', k.rarity);
  if v_rar not in ('common', 'uncommon', 'rare', 'epic', 'legendary') then return jsonb_build_object('ok', false, 'code', 'bad_rarity'); end if;
  if p ? 'types' then select array_agg(t order by o) into v_types from jsonb_array_elements_text(p->'types') with ordinality x(t, o) where t <> ''; else v_types := k.types; end if;
  if coalesce(array_length(v_types, 1), 0) not between 1 and 2 or not v_types <@ array['fire', 'tide', 'nature', 'ward', 'feral', 'dark', 'spirit']
     or (array_length(v_types, 1) = 2 and v_types[1] = v_types[2]) then return jsonb_build_object('ok', false, 'code', 'bad_types'); end if;
  v_moves := coalesce(p->'moves', k.moves);
  n := case when v_rar in ('common', 'uncommon') then 2 else 3 end;
  if jsonb_typeof(v_moves) <> 'array' or jsonb_array_length(v_moves) <> n then return jsonb_build_object('ok', false, 'code', 'bad_moves', 'need', n); end if;
  for m in select * from jsonb_array_elements(v_moves) loop
    if coalesce(m->>'kind', '') not in ('sword', 'spell', 'armor') or length(btrim(coalesce(m->>'name', ''))) not between 1 and 24 or m->>'name' ~ '[|;:]' then
      return jsonb_build_object('ok', false, 'code', 'bad_moves', 'need', n); end if;
  end loop;
  v_moves := (select jsonb_agg(jsonb_build_object('name', btrim(x->>'name'), 'kind', x->>'kind') order by o) from jsonb_array_elements(v_moves) with ordinality e(x, o));
  update public.badge_kinds set title = v_name, rarity = v_rar, types = v_types, moves = v_moves,
         hearts = case v_rar when 'common' then 2 when 'uncommon' then 3 when 'rare' then 3 else 4 end,
         element = case v_types[1] when 'fire' then 'fire' when 'tide' then 'water' when 'nature' then 'grass' when 'ward' then 'rock' when 'feral' then 'rock' when 'dark' then 'dark' when 'spirit' then 'light' end,
         blurb = 'A ' || v_rar || ' ' || initcap(v_types[1]) || coalesce('/' || initcap(v_types[2]), '') || ' Historikal.',
         droppable = coalesce((p->>'droppable')::boolean, k.droppable), hover = coalesce((p->>'hover')::boolean, k.hover),
         rnd = coalesce((p->>'rnd')::boolean, k.rnd), shift = coalesce((p->>'shift')::boolean, k.shift)
   where slug = p_slug returning * into k;
  insert into public.creature_edits (by, slug, before, after) values (auth.uid(), p_slug, before, public.cr_creature_row(k));
  return jsonb_build_object('ok', true, 'creature', public.cr_creature_row(k));
end;
$$;

-- Who holds a creature, newest first.
create or replace function public.cr_creature_holders(p_slug text) returns jsonb
language sql stable security definer set search_path = public as $$
  select case when not public.cr_is_editor() then null else coalesce((
    select jsonb_agg(jsonb_build_object('item', i.id, 'handle', p.handle, 'name', p.display_name, 'hp', least(k.hearts, coalesce(i.hp, k.hearts)),
                     'hearts', k.hearts, 'types', to_jsonb(public.cr_hk_types(i, k)), 'since', i.acquired_at) order by i.acquired_at desc)
      from public.badge_items i join public.badge_kinds k on k.slug = i.kind_slug join public.profiles p on p.id = i.owner_id
     where i.kind = 'tradable' and i.kind_slug = p_slug), '[]'::jsonb) end;
$$;

-- Turn one held copy into another creature. It keeps its id, hearts (up to the new creature's), lineup place and
-- history; one that rolls its type rolls again. A legendary nobody else may have is refused when it's taken.
create or replace function public.cr_swap_copy(p_item bigint, p_to text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare i public.badge_items; k public.badge_kinds; was text;
begin
  if not public.cr_is_editor() then return jsonb_build_object('ok', false, 'code', 'not_editor'); end if;
  select * into i from public.badge_items where id = p_item and kind = 'tradable' for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'missing'); end if;
  select * into k from public.badge_kinds where slug = p_to and types is not null;
  if not found then return jsonb_build_object('ok', false, 'code', 'bad_target'); end if;
  if i.kind_slug = p_to then return jsonb_build_object('ok', false, 'code', 'same'); end if;
  if k.rarity = 'legendary' then
    perform pg_advisory_xact_lock(hashtext('legendary:' || p_to));
    if public.cr_legendary_taken(p_to) then return jsonb_build_object('ok', false, 'code', 'taken'); end if;
  end if;
  was := i.kind_slug;
  perform set_config('crystr.economy', 'on', true);
  update public.badge_items set kind_slug = p_to, rolled = null where id = p_item;
  insert into public.creature_edits (by, slug, item, before, after) values (auth.uid(), p_to, p_item, jsonb_build_object('kind', was), jsonb_build_object('kind', p_to));
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.cr_creature_row(public.badge_kinds) from public, anon, authenticated;
revoke all on function public.cr_edit_creature(text, jsonb) from public, anon;
revoke all on function public.cr_creature_holders(text) from public, anon;
revoke all on function public.cr_swap_copy(bigint, text) from public, anon;
grant execute on function public.cr_edit_creature(text, jsonb), public.cr_creature_holders(text), public.cr_swap_copy(bigint, text), public.cr_is_editor() to authenticated;
