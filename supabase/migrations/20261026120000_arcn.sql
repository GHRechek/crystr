-- "Are you a registered spellcaster?" on the welcome page. A caster gives an ARCN (Arcane
-- Registry Codex Number): any 8 digits, except that a planar cannot be a registered
-- spellcaster and is told to contact arcane enforcement. Also seeds the Magic wiki page.
drop function if exists public.cr_register(text, text, text, text);

create or replace function public.cr_register(p_district text, p_district_code text, p_species text, p_species_code text, p_spellcaster boolean default false, p_arcn text default '')
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_ok boolean;
        v_name text;
        v_arcn text := btrim(coalesce(p_arcn, ''));
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  if exists (select 1 from public.profiles where id = auth.uid() and onboarded) then
    return jsonb_build_object('ok', true, 'already', true);
  end if;

  if p_district not in ('city', 'outland', 'gate', 'enclave')
     or p_species not in ('orc', 'elf', 'human', 'shifter', 'planar')
     or char_length(btrim(coalesce(p_district_code, ''))) = 0
     or char_length(btrim(coalesce(p_species_code, ''))) = 0
     or char_length(p_district_code) > 24 or char_length(p_species_code) > 24 then
    return jsonb_build_object('ok', false, 'code', 'incomplete');
  end if;

  if p_district = 'enclave' and p_species <> 'elf' then
    return jsonb_build_object('ok', false, 'code', 'enclave_elves');
  end if;

  select exists (select 1 from public.plaintiff_codes
                  where kind = 'adc' and key = p_district
                    and position(lower(code) in lower(p_district_code)) > 0) into v_ok;
  if not v_ok then return jsonb_build_object('ok', false, 'code', 'bad_adc'); end if;

  select exists (select 1 from public.plaintiff_codes
                  where kind = 'sdc' and key = p_species
                    and position(lower(code) in lower(p_species_code)) > 0) into v_ok;
  if not v_ok then return jsonb_build_object('ok', false, 'code', 'bad_sdc'); end if;

  if p_spellcaster then
    if p_species = 'planar' then return jsonb_build_object('ok', false, 'code', 'planar_caster'); end if;
    if v_arcn !~ '^[0-9]{8}$' then return jsonb_build_object('ok', false, 'code', 'bad_arcn'); end if;
  end if;

  select coalesce(nullif(btrim(display_name), ''), handle) into v_name from public.profiles where id = auth.uid();

  insert into public.plaintiffs (user_id) values (auth.uid()) on conflict do nothing;
  insert into public.plaintiff_forms (user_id, answers)
  values (auth.uid(), jsonb_build_object('name', v_name, 'district', p_district, 'species', p_species,
                                         'spellcaster', coalesce(p_spellcaster, false),
                                         'arcn', case when p_spellcaster then v_arcn else null end))
  on conflict (user_id) do nothing;

  perform set_config('crystr.economy', 'on', true);
  update public.profiles set onboarded = true, updated_at = now() where id = auth.uid();
  perform public.award_badges(auth.uid());
  return jsonb_build_object('ok', true);
end;
$function$;
