-- The line under your picture is "ask for help" now, up to three lines: 160 characters, not 40.
alter table public.profiles drop constraint if exists profiles_mood_len;
alter table public.profiles add constraint profiles_mood_len check (char_length(mood) <= 160);
