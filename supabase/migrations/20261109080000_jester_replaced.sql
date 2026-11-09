-- Jesterae replaces the Jester. Nobody held a Jester copy, so his kind simply stops being found and leaves the
-- roster (his row stays, inactive, so nothing that ever referred to it breaks). She takes his place in the order
-- and everyone after her moves back up. Written by hand from scripts/build-historikals.mjs --update, which
-- otherwise re-upserts every re-ordered creature and would undo edits made in the creature editor.
update public.badge_kinds set active = false, droppable = false, sort = 3142 where slug = 'jester';
update public.badge_kinds set sort = sort - 1 where sort >= 1143 and sort < 2000;
