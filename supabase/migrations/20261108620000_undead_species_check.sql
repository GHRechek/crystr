-- Undead is a species the profile can hold.
alter table public.profiles drop constraint if exists profiles_species_check;
alter table public.profiles add constraint profiles_species_check
  check (species is null or species in ('elf', 'forsaken', 'undead', 'shifter', 'human', 'orc', 'goblin', 'planar'));
