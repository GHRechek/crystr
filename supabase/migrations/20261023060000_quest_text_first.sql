-- Quests meant to be done in the moment: the writing box leads and a photo is the secondary option.
-- "Write a poem" is text_first. (Photo-only and drawing quests are unchanged.)
alter table public.quests add column if not exists text_first boolean not null default false;
update public.quests set text_first = true where slug = 'poem';

-- The placeholder for the writing box, per quest, and "Compliment a stranger" leads with writing too.
alter table public.quests add column if not exists write_prompt text;
update public.quests set text_first = true, write_prompt = 'What did you say, and to whom? Write it down while it is fresh. Kind words only.' where slug = 'compliment';
update public.quests set write_prompt = 'Off the cuff is the point. It does not have to be good. It does have to be now.' where slug = 'poem';
