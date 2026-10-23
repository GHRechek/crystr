-- Quests meant to be done in the moment: the writing box leads and a photo is the secondary option.
-- "Write a poem" is text_first. (Photo-only and drawing quests are unchanged.)
alter table public.quests add column if not exists text_first boolean not null default false;
update public.quests set text_first = true where slug = 'poem';
