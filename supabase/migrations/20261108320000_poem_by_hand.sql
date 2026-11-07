-- Write a poem says "by hand, on something that isn't a screen", so it takes a photo of the page, not typing.
update public.quests set text_first = false, proof_required = true where slug = 'poem';
