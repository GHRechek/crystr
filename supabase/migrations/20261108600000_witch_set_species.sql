-- A witch can set what someone is, from their profile. The registry has no line for the Forsaken
-- (the undead among them), so this is how they come to count as Forsaken: for the Forsaken Friend
-- quest, and for voting with a witch's key.
create or replace function public.cr_witch_set_species(p_user uuid, p_species text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_witch() then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  if p_species not in ('elf', 'forsaken', 'shifter', 'human', 'orc', 'goblin', 'planar') then
    return jsonb_build_object('ok', false, 'code', 'bad_species');
  end if;
  perform set_config('crystr.economy', 'on', true);
  update public.profiles set species = p_species, updated_at = now() where id = p_user;
  if not found then return jsonb_build_object('ok', false, 'code', 'missing'); end if;
  return jsonb_build_object('ok', true, 'label', initcap(p_species));
end;
$$;
revoke all on function public.cr_witch_set_species(uuid, text) from public, anon;
grant execute on function public.cr_witch_set_species(uuid, text) to authenticated;
