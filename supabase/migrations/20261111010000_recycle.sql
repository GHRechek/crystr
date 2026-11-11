-- RECYCLE: four Historikals of one rarity become one of the next rarity up, picked at random from the
-- ones that drop; one time in eight, when one of the four has a known evolution a tier up, it becomes that.
-- Epics and mythics can't go in: commons, uncommons and rares only. Nothing in the lineup, nothing favourited, nothing mid-battle.

create table if not exists public.historikal_evolutions (
  from_slug text not null references public.badge_kinds(slug) on delete cascade,
  to_slug text not null references public.badge_kinds(slug) on delete cascade,
  primary key (from_slug, to_slug)
);
alter table public.historikal_evolutions enable row level security;
drop policy if exists "evolutions are public" on public.historikal_evolutions;
create policy "evolutions are public" on public.historikal_evolutions for select using (true);

insert into public.historikal_evolutions (from_slug, to_slug) values
  ('feathered-wyrmling', 'feathered-wyrm'), ('goblin', 'clever-goblin'), ('orc', 'orc-marauder'), ('orc', 'orc-raider'),
  ('orc', 'orc-mystic'), ('office-zombie', 'zombie-boss'), ('sneaky-orc', 'orc-prowler'), ('gargoyle-2010', 'perched-gargoyle'),
  ('troll', 'hulking-troll'), ('troll', 'big-nose-troll'), ('ghost', 'ghost-squire'), ('clever-goblin', 'goblin-bandit'),
  ('clever-goblin', 'goblin-bard'), ('ghostnya', 'lit-ghostnya'), ('orc-prowler', 'orc-assassin'), ('zombie', 'office-zombie')
on conflict do nothing;

alter table public.badge_items drop constraint if exists badge_items_occasion_check;
alter table public.badge_items add constraint badge_items_occasion_check
  check (occasion is null or occasion in ('helped', 'birthday', 'epic', 'battle', 'pick', 'quest', 'recycle'));

create or replace function public.cr_recycle(p_items bigint[])
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  v_ids bigint[]; v_rar text; v_next text; v_slug text; v_title text; v_evolved boolean := false; it bigint; v_rolled text;
  v_shown jsonb;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'auth'); end if;
  select array_agg(distinct x) into v_ids from unnest(p_items) x;
  if v_ids is null or cardinality(v_ids) <> 4 then return jsonb_build_object('ok', false, 'code', 'four'); end if;

  -- Yours, all four, held for the rest of this.
  if (select count(*) from public.badge_items i where i.id = any(v_ids) and i.owner_id = auth.uid() and i.kind = 'tradable' for update) <> 4 then
    return jsonb_build_object('ok', false, 'code', 'not_yours');
  end if;
  -- One rarity between them, and not the top one.
  select min(k.rarity), max(k.rarity) into v_rar, v_next
    from public.badge_items i join public.badge_kinds k on k.slug = i.kind_slug where i.id = any(v_ids);
  if v_rar <> v_next then return jsonb_build_object('ok', false, 'code', 'mixed'); end if;
  if v_rar in ('epic', 'legendary') then return jsonb_build_object('ok', false, 'code', 'top'); end if;
  -- Not a favourite, not in the lineup, not fighting.
  if exists (select 1 from public.badge_items where id = any(v_ids) and favorite) then return jsonb_build_object('ok', false, 'code', 'favorite'); end if;
  select shown_badges into v_shown from public.profiles where id = auth.uid();
  if exists (select 1 from unnest(v_ids) x where coalesce(v_shown, '[]'::jsonb) ? ('i:' || x)) then return jsonb_build_object('ok', false, 'code', 'lineup'); end if;
  if exists (select 1 from public.encounters e, unnest(v_ids) x where e.kind = 'battle' and e.stage not in ('done', 'off', 'end') and e.updated_at > now() - interval '20 minutes'
              and (e.st->'team'->'a' @> to_jsonb(x) or e.st->'team'->'b' @> to_jsonb(x))) then
    return jsonb_build_object('ok', false, 'code', 'in_battle');
  end if;

  v_next := case v_rar when 'common' then 'uncommon' when 'uncommon' then 'rare' else 'epic' end;

  -- One time in eight: an evolution of one of the four, when it has one a tier up.
  if random() < 0.125 then
    select ev.to_slug into v_slug
      from public.badge_items i join public.historikal_evolutions ev on ev.from_slug = i.kind_slug
      join public.badge_kinds k on k.slug = ev.to_slug
     where i.id = any(v_ids) and k.active and k.rarity = v_next and (k.rarity <> 'legendary' or not public.cr_legendary_taken(k.slug))
     order by random() limit 1;
    v_evolved := v_slug is not null;
  end if;
  if v_slug is null and v_next = 'legendary' then
    select slug into v_slug from public.badge_kinds where active and droppable and rarity = 'legendary' and not public.cr_legendary_taken(slug) order by random() limit 1;
  end if;
  if v_slug is null then
    select slug into v_slug from public.badge_kinds where active and droppable and rarity = v_next and rarity <> 'legendary' order by random() limit 1;
  end if;
  if v_slug is null then
    -- No mythic left to find: the best there is.
    select slug into v_slug from public.badge_kinds where active and droppable and rarity = 'epic' order by random() limit 1;
  end if;
  if v_slug is null then return jsonb_build_object('ok', false, 'code', 'none'); end if;
  if v_next = 'legendary' then perform pg_advisory_xact_lock(hashtext('legendary:' || v_slug)); end if;

  perform set_config('crystr.economy', 'on', true);
  delete from public.badge_items where id = any(v_ids);
  insert into public.badge_items (kind, kind_slug, earned_by, owner_id, occasion, seen)
    values ('tradable', v_slug, auth.uid(), auth.uid(), 'recycle', true) returning id, kind_slug, rolled into it, v_slug, v_rolled;
  select title into v_title from public.badge_kinds where slug = v_slug;
  return jsonb_build_object('ok', true, 'item', it, 'slug', v_slug, 'name', v_title, 'rolled', v_rolled, 'evolved', v_evolved, 'rarity', v_next);
end $$;
revoke all on function public.cr_recycle(bigint[]) from public, anon;
grant execute on function public.cr_recycle(bigint[]) to authenticated;
