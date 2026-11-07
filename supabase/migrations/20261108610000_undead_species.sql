-- The undead can register: Undead is a species on the registry, with its SDC on the Undead wiki page.
-- The Forsaken are a family: Forsaken, Undead and Planar all count as Forsaken (for the Forsaken Friend
-- quests and for voting with a witch's key). Banshees become Ghosts, all of them under Undead. Other
-- stays what it was: not a species, and the way to a witch.

insert into public.plaintiff_codes (kind, key, code) values ('sdc', 'undead', '70913') on conflict do nothing;

-- Who counts as Forsaken.
create or replace function public.cr_is_forsaken(p_species text) returns boolean
language sql immutable as $$ select coalesce(p_species in ('forsaken', 'undead', 'planar'), false); $$;

create or replace function public.cr_needs_witch_key(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select public.cr_is_forsaken(species) and not is_witch from public.profiles where id = p_user), false);
$$;
revoke all on function public.cr_needs_witch_key(uuid) from public, anon, authenticated;

create or replace function public.cr_witch_set_species(p_user uuid, p_species text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_witch() then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  if p_species not in ('elf', 'forsaken', 'undead', 'shifter', 'human', 'orc', 'goblin', 'planar') then
    return jsonb_build_object('ok', false, 'code', 'bad_species');
  end if;
  perform set_config('crystr.economy', 'on', true);
  update public.profiles set species = p_species, updated_at = now() where id = p_user;
  if not found then return jsonb_build_object('ok', false, 'code', 'missing'); end if;
  return jsonb_build_object('ok', true, 'label', initcap(p_species));
end;
$$;

do $do$
declare d text; n int;
begin
  -- Registering as undead.
  select pg_get_functiondef('public.cr_register'::regproc) into d;
  n := length(d);
  d := replace(d, $r$p_species not in ('orc', 'elf', 'human', 'goblin', 'shifter', 'planar')$r$, $r$p_species not in ('orc', 'elf', 'human', 'goblin', 'shifter', 'planar', 'undead')$r$);
  if length(d) = n then raise exception 'cr_register: undead patch did not apply'; end if;
  execute d;

  -- The form's species lands on the profile.
  select pg_get_functiondef('public.trg_species_from_form()'::regprocedure) into d;
  n := length(d);
  d := replace(d, $r$('elf', 'forsaken', 'shifter', 'human', 'orc', 'goblin', 'planar')$r$, $r$('elf', 'forsaken', 'undead', 'shifter', 'human', 'orc', 'goblin', 'planar')$r$);
  if length(d) = n then raise exception 'trg_species_from_form: undead patch did not apply'; end if;
  execute d;

  -- A quest that asks for a Forsaken takes any of the family.
  select pg_get_functiondef('public.cr_badge_claim(text, uuid)'::regprocedure) into d;
  n := length(d);
  d := replace(d, $r$o.species = b.peer_target)) then$r$, $r$(o.species = b.peer_target or (b.peer_target = 'forsaken' and public.cr_is_forsaken(o.species))))) then$r$);
  if length(d) = n then raise exception 'cr_badge_claim: forsaken patch did not apply'; end if;
  execute d;

  select pg_get_functiondef('public.cr_scan_quests(uuid)'::regprocedure) into d;
  n := length(d);
  d := replace(d, $r$o.species = b.peer_target))$r$, $r$(o.species = b.peer_target or (b.peer_target = 'forsaken' and public.cr_is_forsaken(o.species)))))$r$);
  if length(d) = n then raise exception 'cr_scan_quests: forsaken patch did not apply'; end if;
  execute d;
end
$do$;

-- The wiki: the Undead SDC on its page, and Banshees are Ghosts now (the address stays).
insert into public.wiki_facts (page_id, slot, body, status, author, reviewed_by, reviewed_at)
select p.id, 1, 'Undead SDC: 70913', 'kept', w.id, w.id, now()
  from public.wiki_pages p, (select id from public.profiles where handle = 'sammiwithaneye') w
 where p.slug = 'undead'
   and not exists (select 1 from public.wiki_facts f where f.page_id = p.id and f.body ilike '%SDC%');
update public.wiki_pages set title = 'Ghosts', updated_at = now() where slug = 'banshees';
