-- Species and spellcasting are decided once, when someone registers with the SDC form, and nobody edits
-- them afterwards. Every witch is a spellcaster.
create or replace function public.trg_species_from_form()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_sp text := new.answers ->> 'species'; v_cast boolean := coalesce(new.answers ->> 'spellcaster', '') in ('true', 'on', 't', '1');
begin
  update public.profiles
     set species = case when v_sp in ('elf', 'forsaken', 'shifter', 'human', 'orc', 'goblin', 'planar') then v_sp else species end,
         spellcaster = spellcaster or v_cast or is_witch
   where id = new.user_id;
  return null;
end;
$$;
drop trigger if exists species_from_form on public.plaintiff_forms;
create trigger species_from_form after insert or update of answers on public.plaintiff_forms
  for each row execute function public.trg_species_from_form();

create or replace function public.trg_witch_spellcaster()
returns trigger language plpgsql as $$
begin
  if new.is_witch then new.spellcaster := true; end if;
  return new;
end;
$$;
drop trigger if exists witch_spellcaster on public.profiles;
create trigger witch_spellcaster before insert or update of is_witch, spellcaster on public.profiles
  for each row execute function public.trg_witch_spellcaster();

revoke update (species, spellcaster) on public.profiles from authenticated;

update public.profiles set spellcaster = true where is_witch;
update public.profiles set species = 'human' where handle = 'darkmagemahllyc';
update public.profiles p set species = f.answers ->> 'species'
  from public.plaintiff_forms f
 where f.user_id = p.id and f.answers ->> 'species' in ('elf', 'forsaken', 'shifter', 'human', 'orc', 'goblin', 'planar');
