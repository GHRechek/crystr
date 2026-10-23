-- About me goes back to 500 characters (the other profile fields stay at 40).
alter table public.profiles drop constraint profiles_bio_len,
  add constraint profiles_bio_len check (char_length(bio) <= 500);
