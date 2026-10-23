-- Quests that need a picture, and the in-app drawing pad.
--  * quests.proof_required: words alone are not accepted. The proof must be a real file in the
--    proofs bucket, in the person's own folder (not just any text).
--  * quests.drawing_pad: the quest page offers a drawing pad (the picture it makes is uploaded as
--    the proof, like a photo would be).
-- "Hand-draw something" is both. Every other quest is unchanged. cr_submit_quest is re-created
-- with the extra check (see the function in the database for its body).
alter table public.quests
  add column if not exists proof_required boolean not null default false,
  add column if not exists drawing_pad boolean not null default false;
update public.quests set proof_required = true, drawing_pad = true where slug = 'draw';

-- "Photo with a friend" needs a real photo too: words alone are no longer accepted.
update public.quests set proof_required = true where slug = 'photo';
