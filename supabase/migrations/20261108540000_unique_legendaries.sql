-- Legendaries are one of a kind: once someone has one, no one else can draw or pick it. Each legendary
-- also gets an alternate: a recoloured twin of another type, with its own name and moves. Elder Horror
-- becomes Moon Elder, and its light twin is Cosmic Elder.

update public.badge_kinds set title = 'MOON ELDER' where slug = 'elder-horror';

insert into public.badge_kinds (slug, title, blurb, art, sort, active, rarity, element, hearts, moves, droppable) values
 ('cosmic-elder',    'COSMIC ELDER',    'A legendary Light Historikal.', 'creatures/cosmic-elder.png',    1200, true, 'legendary', 'light', 4, '[{"kind":"sword","name":"Starfall Claw"},{"kind":"spell","name":"Nova"},{"kind":"armor","name":"Star Ward"}]', true),
 ('dawn-beholder',   'DAWN BEHOLDER',   'A legendary Light Historikal.', 'creatures/dawn-beholder.png',   1201, true, 'legendary', 'light', 4, '[{"kind":"sword","name":"Glint Bite"},{"kind":"spell","name":"Sunbeam Eye"},{"kind":"armor","name":"Dazzle"}]', true),
 ('ember-knight',    'EMBER KNIGHT',    'A legendary Fire Historikal.',  'creatures/ember-knight.png',    1202, true, 'legendary', 'fire',  4, '[{"kind":"sword","name":"Brand Blade"},{"kind":"spell","name":"Pyre Oath"},{"kind":"armor","name":"Cinder Plate"}]', true),
 ('fallen-angel',    'FALLEN ANGEL',    'A legendary Dark Historikal.',  'creatures/fallen-angel.png',    1203, true, 'legendary', 'dark',  4, '[{"kind":"sword","name":"Night Smite"},{"kind":"spell","name":"Black Halo"},{"kind":"armor","name":"Ashen Wings"}]', true),
 ('stone-djinn',     'STONE DJINN',     'A legendary Rock Historikal.',  'creatures/stone-djinn.png',     1204, true, 'legendary', 'rock',  4, '[{"kind":"sword","name":"Sand Saber"},{"kind":"spell","name":"Dune Wish"},{"kind":"armor","name":"Basalt Veil"}]', true),
 ('tide-couatl',     'TIDE COUATL',     'A legendary Water Historikal.', 'creatures/tide-couatl.png',     1205, true, 'legendary', 'water', 4, '[{"kind":"sword","name":"Riptide Fang"},{"kind":"spell","name":"Rain Dance"},{"kind":"armor","name":"Coral Coil"}]', true),
 ('jade-dragon',     'JADE DRAGON',     'A legendary Grass Historikal.', 'creatures/jade-dragon.png',     1206, true, 'legendary', 'grass', 4, '[{"kind":"sword","name":"Jade Talon"},{"kind":"spell","name":"Verdant Breath"},{"kind":"armor","name":"Moss Scale"}]', true),
 ('frost-manticore', 'FROST MANTICORE', 'A legendary Water Historikal.', 'creatures/frost-manticore.png', 1207, true, 'legendary', 'water', 4, '[{"kind":"sword","name":"Icicle Sting"},{"kind":"spell","name":"Blizzard Roar"},{"kind":"armor","name":"Frost Wings"}]', true)
on conflict (slug) do nothing;

-- Which legendaries someone already has.
create or replace function public.cr_legendary_taken(p_slug text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.badge_items i join public.badge_kinds k on k.slug = i.kind_slug
                  where i.kind_slug = p_slug and k.rarity = 'legendary');
$$;
create or replace function public.cr_legendaries_taken() returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct i.kind_slug), '{}') from public.badge_items i join public.badge_kinds k on k.slug = i.kind_slug
   where k.rarity = 'legendary';
$$;
revoke all on function public.cr_legendary_taken(text), public.cr_legendaries_taken() from public, anon;
grant execute on function public.cr_legendaries_taken() to authenticated;

-- Rolls only ever land on a legendary no one has; with none left, a rare instead.
create or replace function public.cr_roll_historikal() returns text
language plpgsql security definer set search_path = public as $$
declare r float := random(); v_rar text; v text;
begin
  v_rar := case when r < 0.03 then 'legendary' when r < 0.15 then 'rare' when r < 0.40 then 'uncommon' else 'common' end;
  if v_rar = 'legendary' then
    select slug into v from public.badge_kinds where active and droppable and rarity = 'legendary' and not public.cr_legendary_taken(slug) order by random() limit 1;
    if v is null then v_rar := 'rare'; end if;
  end if;
  if v is null then select slug into v from public.badge_kinds where active and droppable and rarity = v_rar order by random() limit 1; end if;
  if v is null then select slug into v from public.badge_kinds where active and droppable and rarity <> 'legendary' order by random() limit 1; end if;
  return v;
end;
$$;

create or replace function public.cr_roll_main_historikal() returns text
language plpgsql security definer set search_path = public as $$
declare v text; r float := random();
        v_rar text := case when r < 0.05 then 'legendary' when r < 0.70 then 'rare' else 'uncommon' end;
begin
  if v_rar = 'legendary' then
    select slug into v from public.badge_kinds where active and droppable and rarity = 'legendary' and not public.cr_legendary_taken(slug) order by random() limit 1;
    if v is null then v_rar := 'rare'; end if;
  end if;
  if v is null then select slug into v from public.badge_kinds where active and droppable and rarity = v_rar order by random() limit 1; end if;
  return coalesce(v, public.cr_roll_historikal());
end;
$$;

-- A gifted pick can't take one someone already has.
do $do$
declare d text; n int;
begin
  select pg_get_functiondef('public.cr_pick_historikal(text)'::regprocedure) into d;
  n := length(d);
  d := replace(d, $r$  if not found then return jsonb_build_object('ok', false, 'code', 'bad'); end if;
  select id into v_pick$r$, $r$  if not found then return jsonb_build_object('ok', false, 'code', 'bad'); end if;
  perform pg_advisory_xact_lock(hashtext('legendary:' || p_slug));
  if public.cr_legendary_taken(p_slug) then return jsonb_build_object('ok', false, 'code', 'taken'); end if;
  select id into v_pick$r$);
  if length(d) = n then raise exception 'cr_pick_historikal: taken patch did not apply'; end if;
  execute d;
end
$do$;

-- And the last word, whatever made it: a second copy of a legendary becomes a rare as it's made.
create or replace function public.cr_one_legendary() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.badge_kinds where slug = new.kind_slug and rarity = 'legendary') then
    perform pg_advisory_xact_lock(hashtext('legendary:' || new.kind_slug));
    if public.cr_legendary_taken(new.kind_slug) then
      select slug into new.kind_slug from public.badge_kinds where active and droppable and rarity = 'rare' order by random() limit 1;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists cr_one_legendary on public.badge_items;
create trigger cr_one_legendary before insert on public.badge_items for each row execute function public.cr_one_legendary();
