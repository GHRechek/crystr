-- A legendary that rolls its type (Ancient Wyrm, Justababy) is one of a kind per type: one Fire Ancient Wyrm,
-- one Tide, and so on. It is taken only when every type it can roll is held, and a new one rolls a type
-- nobody holds yet. Every other legendary is still one of a kind outright.

-- The types a legendary can still be found in: for one that rolls, those of its rolls nobody holds; for the
-- rest, its own first type if nobody holds it, else none.
create or replace function public.cr_legendary_free_types(p_slug text) returns text[]
language sql stable security definer set search_path = public as $$
  select case
    when k.rarity <> 'legendary' then null
    when k.rnd then coalesce((select array_agg(t order by o) from unnest(array_remove(array['fire', 'tide', 'nature', 'ward', 'dark', 'spirit'], k.types[2])) with ordinality u(t, o)
                               where not exists (select 1 from public.badge_items i where i.kind_slug = k.slug and coalesce(i.rolled, k.types[1]) = u.t)), '{}')
    when exists (select 1 from public.badge_items i where i.kind_slug = k.slug) then '{}'
    else array[k.types[1]] end
  from public.badge_kinds k where k.slug = p_slug;
$$;
revoke all on function public.cr_legendary_free_types(text) from public, anon, authenticated;

create or replace function public.cr_legendary_taken(p_slug text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(cardinality(public.cr_legendary_free_types(p_slug)) = 0, false);
$$;

create or replace function public.cr_legendaries_taken() returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(k.slug), '{}') from public.badge_kinds k
   where k.rarity = 'legendary' and exists (select 1 from public.badge_items i where i.kind_slug = k.slug) and public.cr_legendary_taken(k.slug);
$$;

-- A rolled type is drawn from the free ones, for a legendary; cr_one_legendary (which runs first) holds the
-- lock on it for the rest of the transaction, and has already swapped it for a rare if none is free.
create or replace function public.cr_roll_element() returns trigger
language plpgsql security definer set search_path = public as $$
declare k public.badge_kinds; opts text[];
begin
  if new.rolled is null and new.kind_slug is not null then
    select * into k from public.badge_kinds where slug = new.kind_slug;
    if found and k.rnd then
      opts := case when k.rarity = 'legendary' then public.cr_legendary_free_types(k.slug) else array_remove(array['fire', 'tide', 'nature', 'ward', 'dark', 'spirit'], k.types[2]) end;
      if cardinality(opts) > 0 then new.rolled := opts[1 + floor(random() * array_length(opts, 1))::int]; end if;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.cr_roll_element() from public, anon, authenticated;
