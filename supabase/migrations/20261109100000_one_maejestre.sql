-- One jester after all: Jesterae is renamed Maejestre and the original Jester leaves again (nobody holds one).
-- Hand-written in place of the generator's --update, which would re-upsert every re-ordered creature and
-- undo creature-editor edits; only these two rows change, and the order closes up behind him.
update public.badge_kinds set active = false, droppable = false, sort = 3142 where slug = 'jester';
update public.badge_kinds set title = 'MAEJESTRE' where slug = 'jesterae';
update public.badge_kinds set sort = sort - 1 where sort >= 1144 and sort < 2000;
