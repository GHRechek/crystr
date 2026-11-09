-- The original Jester comes back as Maejestre, beside Jesterae. Hand-written from the generator's --update
-- (which would re-upsert every re-ordered creature and undo creature-editor edits): only this one row is
-- upserted; the creatures after take one step down the order.
update public.badge_kinds set sort = sort + 1 where sort >= 1143 and sort < 2000;
update public.badge_kinds set title = 'MAEJESTRE', active = true, droppable = true, sort = 1143 where slug = 'jester';
