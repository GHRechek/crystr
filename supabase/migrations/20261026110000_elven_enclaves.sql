-- A fourth part of the City: the Elven Enclaves, where only elves live. Its ADC is three
-- digits. (The code itself is kept in plaintiff_codes, set directly in the database.)
create or replace function public.cr_register(p_district text, p_district_code text, p_species text, p_species_code text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_ok boolean;
        v_name text;
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

  -- Only elves live in the Enclaves.
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

  select coalesce(nullif(btrim(display_name), ''), handle) into v_name from public.profiles where id = auth.uid();

  insert into public.plaintiffs (user_id) values (auth.uid()) on conflict do nothing;
  insert into public.plaintiff_forms (user_id, answers)
  values (auth.uid(), jsonb_build_object('name', v_name, 'district', p_district, 'species', p_species))
  on conflict (user_id) do nothing;

  perform set_config('crystr.economy', 'on', true);
  update public.profiles set onboarded = true, updated_at = now() where id = auth.uid();
  perform public.award_badges(auth.uid());
  return jsonb_build_object('ok', true);
end;
$function$;
