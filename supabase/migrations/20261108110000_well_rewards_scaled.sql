-- The Well gives back in proportion to the lower ceiling (max mana starts at 15, not 40):
-- poem 12 to 5, photo 15 to 6, sit still 8 to 3, compliment 10 to 4, draw 14 to 5.
update public.quests set reward = case slug when 'poem' then 5 when 'photo' then 6 when 'still' then 3 when 'compliment' then 4 when 'draw' then 5 else reward end;
