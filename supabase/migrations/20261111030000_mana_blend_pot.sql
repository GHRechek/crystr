-- MANA BLEND, one sacrifice at a time. Each Historikal thrown into the void is gone at once and counted
-- in your pot; the fourth of a rarity resolves the pot into one of the next rarity up (the same odds as
-- cr_recycle: an evolution one time in eight when one of the four has one a tier up). Backing out
-- empties the pot: those sacrifices meant nothing.

create table if not exists public.blend_pots (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  rarity text not null,
  slugs text[] not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.blend_pots enable row level security;
drop policy if exists "own pot" on public.blend_pots;
create policy "own pot" on public.blend_pots for select using (user_id = auth.uid());

create or replace function public.cr_blend_pot()
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select coalesce((select jsonb_build_object('rarity', rarity, 'count', cardinality(slugs)) from public.blend_pots where user_id = auth.uid()),
                  jsonb_build_object('rarity', null, 'count', 0));
$$;
revoke all on function public.cr_blend_pot() from public, anon;
grant execute on function public.cr_blend_pot() to authenticated;

create or replace function public.cr_blend_abandon()
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare n int;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'auth'); end if;
  select cardinality(slugs) into n from public.blend_pots where user_id = auth.uid();
  delete from public.blend_pots where user_id = auth.uid();
  return jsonb_build_object('ok', true, 'lost', coalesce(n, 0));
end $$;
revoke all on function public.cr_blend_abandon() from public, anon;
grant execute on function public.cr_blend_abandon() to authenticated;

create or replace function public.cr_blend_feed(p_item bigint)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  v_slug text; v_rar text; v_pot_rar text; v_slugs text[]; v_next text; v_out text; v_title text; v_evolved boolean := false;
  it bigint; v_rolled text; v_shown jsonb;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'auth'); end if;
  select i.kind_slug, k.rarity into v_slug, v_rar
    from public.badge_items i join public.badge_kinds k on k.slug = i.kind_slug
   where i.id = p_item and i.owner_id = auth.uid() and i.kind = 'tradable' for update of i;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_yours'); end if;
  if v_rar in ('epic', 'legendary') then return jsonb_build_object('ok', false, 'code', 'top'); end if;
  if exists (select 1 from public.badge_items where id = p_item and favorite) then return jsonb_build_object('ok', false, 'code', 'favorite'); end if;
  select shown_badges into v_shown from public.profiles where id = auth.uid();
  if coalesce(v_shown, '[]'::jsonb) ? ('i:' || p_item) then return jsonb_build_object('ok', false, 'code', 'lineup'); end if;
  if exists (select 1 from public.encounters e where e.kind = 'battle' and e.stage not in ('done', 'off', 'end') and e.updated_at > now() - interval '20 minutes'
              and (e.st->'team'->'a' @> to_jsonb(p_item) or e.st->'team'->'b' @> to_jsonb(p_item))) then
    return jsonb_build_object('ok', false, 'code', 'in_battle');
  end if;

  -- The pot: this rarity, or empty.
  select rarity, slugs into v_pot_rar, v_slugs from public.blend_pots where user_id = auth.uid() for update;
  if found and v_pot_rar <> v_rar then return jsonb_build_object('ok', false, 'code', 'mixed', 'count', cardinality(v_slugs), 'rarity', v_pot_rar); end if;
  if not found then v_slugs := '{}'; end if;

  perform set_config('crystr.economy', 'on', true);
  delete from public.badge_items where id = p_item;
  v_slugs := v_slugs || v_slug;
  if cardinality(v_slugs) < 4 then
    insert into public.blend_pots (user_id, rarity, slugs, updated_at) values (auth.uid(), v_rar, v_slugs, now())
      on conflict (user_id) do update set rarity = excluded.rarity, slugs = excluded.slugs, updated_at = now();
    return jsonb_build_object('ok', true, 'done', false, 'count', cardinality(v_slugs), 'rarity', v_rar);
  end if;

  -- The fourth: the pot resolves.
  delete from public.blend_pots where user_id = auth.uid();
  v_next := case v_rar when 'common' then 'uncommon' when 'uncommon' then 'rare' else 'epic' end;
  if random() < 0.125 then
    select ev.to_slug into v_out
      from unnest(v_slugs) s join public.historikal_evolutions ev on ev.from_slug = s
      join public.badge_kinds k on k.slug = ev.to_slug
     where k.active and k.rarity = v_next order by random() limit 1;
    v_evolved := v_out is not null;
  end if;
  if v_out is null then select slug into v_out from public.badge_kinds where active and droppable and rarity = v_next order by random() limit 1; end if;
  if v_out is null then return jsonb_build_object('ok', false, 'code', 'none'); end if;
  insert into public.badge_items (kind, kind_slug, earned_by, owner_id, occasion, seen)
    values ('tradable', v_out, auth.uid(), auth.uid(), 'recycle', true) returning id, kind_slug, rolled into it, v_out, v_rolled;
  select title into v_title from public.badge_kinds where slug = v_out;
  return jsonb_build_object('ok', true, 'done', true, 'count', 4, 'rarity', v_rar, 'item', it, 'slug', v_out, 'name', v_title, 'rolled', v_rolled, 'evolved', v_evolved, 'next', v_next);
end $$;
revoke all on function public.cr_blend_feed(bigint) from public, anon;
grant execute on function public.cr_blend_feed(bigint) to authenticated;
