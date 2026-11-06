-- Pronouns: free text, shown under the character name, set on Edit Profile.
alter table public.profiles add column if not exists pronouns text;
alter table public.profiles drop constraint if exists profiles_pronouns_len;
alter table public.profiles add constraint profiles_pronouns_len check (pronouns is null or char_length(pronouns) <= 30);

-- Species and spellcasting come from registration only. (profiles has a table-wide UPDATE grant, so
-- the guard trigger is what keeps them put, like mana and witch status.)
create or replace function public.guard_profile_economy()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('crystr.economy', true), '') <> 'on' then
    new.mana        := old.mana;
    new.spent_total := old.spent_total;
    new.is_witch    := old.is_witch;
    new.onboarded   := old.onboarded;
    new.mana_cap    := old.mana_cap;
    new.species     := old.species;
    new.spellcaster := old.spellcaster;
  end if;
  return new;
end;
$$;

create or replace function public.trg_species_from_form()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_sp text := new.answers ->> 'species'; v_cast boolean := coalesce(new.answers ->> 'spellcaster', '') in ('true', 'on', 't', '1');
begin
  perform set_config('crystr.economy', 'on', true);
  update public.profiles
     set species = case when v_sp in ('elf', 'forsaken', 'shifter', 'human', 'orc', 'goblin', 'planar') then v_sp else species end,
         spellcaster = spellcaster or v_cast or is_witch
   where id = new.user_id;
  return null;
end;
$$;
