-- Share a Well hand-in as a post.
--  * posts gain proof_path (a file in the proofs bucket), quest_slug and submission_id (one post
--    per hand-in). A member-readable storage policy lets everyone signed in see a proof that a post
--    uses, and nothing else in that bucket.
--  * cr_share_quest(submission, caption): the person's own hand-in becomes a post, free, with
--    their caption (a drawing/photo with no caption is titled with the quest; a written one is
--    the writing itself, with the caption above it).
--  * The SHOW AND TELL badge now counts a shared picture (award_badges re-created with
--    "has_image and (image_url is not null or proof_path is not null)").
--  * Backfill: Sammi's drawing handed in on 2026-10-23 (submission 12) became their latest post.
alter table public.posts
  add column if not exists proof_path text,
  add column if not exists quest_slug text references public.quests(slug),
  add column if not exists submission_id bigint references public.quest_submissions(id) on delete set null;
create unique index if not exists posts_submission_key on public.posts (submission_id) where submission_id is not null;
create index if not exists idx_posts_proof_path on public.posts (proof_path) where proof_path is not null;
create index if not exists idx_posts_quest_slug on public.posts (quest_slug) where quest_slug is not null;

create policy "read shared proof" on storage.objects for select to authenticated
  using (bucket_id = 'proofs' and exists (select 1 from public.posts p where p.proof_path = name));

-- (cr_share_quest and award_badges: see the functions in the database for their bodies.)

insert into public.posts (author_id, body, has_image, cost, proof_path, quest_slug, submission_id, created_at)
select s.user_id, q.title, true, 0, s.proof_url, s.quest_slug, s.id, s.created_at
  from public.quest_submissions s join public.quests q on q.slug = s.quest_slug
 where s.id = 12 and s.proof_url is not null
   and not exists (select 1 from public.posts p where p.submission_id = s.id);
