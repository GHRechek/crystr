-- Low-priority audit items on the database side.
--
--  * Indexes on the foreign keys the advisor flagged (they speed up joins and deletes).
--  * Row-level-security policies call (select auth.uid()) so it is worked out once per
--    query instead of once per row.
--  * Wiki facts have invisible and text-direction characters stripped
--    (zero-width spaces, bidi overrides, soft hyphen, BOM), as well as the
--    app doing it: a fact cannot hide words or reorder what is shown.

create index if not exists idx_articles_author_id        on public.articles (author_id);
create index if not exists idx_articles_reviewed_by      on public.articles (reviewed_by);
create index if not exists idx_dm_messages_sender_id     on public.dm_messages (sender_id);
create index if not exists idx_dm_threads_user_b         on public.dm_threads (user_b);
create index if not exists idx_motion_votes_user_id      on public.motion_votes (user_id);
create index if not exists idx_motions_briefing_id       on public.motions (briefing_id);
create index if not exists idx_motions_created_by        on public.motions (created_by);
create index if not exists idx_post_likes_user_id        on public.post_likes (user_id);
create index if not exists idx_posts_author_id           on public.posts (author_id);
create index if not exists idx_quest_submissions_slug    on public.quest_submissions (quest_slug);
create index if not exists idx_reports_about_user        on public.reports (about_user);
create index if not exists idx_reports_handled_by        on public.reports (handled_by);
create index if not exists idx_top_friends_friend_id     on public.top_friends (friend_id);
create index if not exists idx_top_six_notices_from_user on public.top_six_notices (from_user);
create index if not exists idx_user_badges_badge_slug    on public.user_badges (badge_slug);
create index if not exists idx_wiki_facts_author         on public.wiki_facts (author);
create index if not exists idx_wiki_facts_reviewed_by    on public.wiki_facts (reviewed_by);
create index if not exists idx_wiki_pages_created_by     on public.wiki_pages (created_by);
create index if not exists idx_wiki_pages_updated_by     on public.wiki_pages (updated_by);
create index if not exists idx_wiki_views_page_id        on public.wiki_views (page_id);

alter policy "read the ball" on public.articles using (((status = 'published'::text) OR (author_id = (select auth.uid())) OR is_witch()));
alter policy "own messages" on public.dm_messages using ((EXISTS ( SELECT 1 FROM dm_threads t WHERE ((t.id = dm_messages.thread_id) AND ((t.user_a = (select auth.uid())) OR (t.user_b = (select auth.uid())))))));
alter policy "own threads" on public.dm_threads using (((user_a = (select auth.uid())) OR (user_b = (select auth.uid()))));
alter policy "own ledger" on public.mana_ledger using ((user_id = (select auth.uid())));
alter policy "own votes" on public.motion_votes using ((user_id = (select auth.uid())));
alter policy plaintiff_forms_read on public.plaintiff_forms using (((user_id = (select auth.uid())) OR is_witch()));
alter policy "unsay your own" on public.posts using ((author_id = (select auth.uid())));
alter policy "Users can update their own profile" on public.profiles using (((select auth.uid()) = id));
alter policy "own submissions" on public.quest_submissions using (((user_id = (select auth.uid())) OR is_witch()));
alter policy reports_read on public.reports using (((reporter = (select auth.uid())) OR is_witch()));
alter policy top_six_notices_read on public.top_six_notices using ((user_id = (select auth.uid())));
alter policy tos_acceptances_read on public.tos_acceptances using ((user_id = (select auth.uid())));
alter policy vouches_read on public.vouches using (((claimant = (select auth.uid())) OR (other = (select auth.uid()))));
alter policy wiki_facts_read on public.wiki_facts using (((EXISTS ( SELECT 1 FROM wiki_pages p WHERE ((p.id = wiki_facts.page_id) AND ((NOT p.archived) OR is_witch())))) AND ((status = 'kept'::text) OR (author = (select auth.uid())) OR is_witch())));
alter policy wiki_views_read on public.wiki_views using ((user_id = (select auth.uid())));

-- Invisible characters: U+200B, U+200E-200F, U+202A-202E, U+2060-2064, U+2066-2069, U+FEFF, U+00AD
-- (not the joiners U+200C/U+200D, which emoji sequences and some scripts need).
create or replace function public.cr_strip_invisible(t text)
returns text language sql immutable set search_path = public as $$
  select regexp_replace(
    coalesce(t, ''),
    '[' || chr(173) || chr(8203) || chr(8206) || '-' || chr(8207) || chr(8234) || '-' || chr(8238)
        || chr(8288) || '-' || chr(8292) || chr(8294) || '-' || chr(8297) || chr(65279) || ']',
    '', 'g')
$$;

update public.wiki_facts set body = public.cr_strip_invisible(body) where body <> public.cr_strip_invisible(body);

-- The wiki functions strip them too. (cr_wiki_add_fact and cr_wiki_review_fact are
-- re-created with the clean-up in front of their whitespace tidying; otherwise unchanged.)
-- v_body := btrim(regexp_replace(public.cr_strip_invisible(p_body), '[[:space:]]+', ' ', 'g'));
-- v_text := btrim(regexp_replace(public.cr_strip_invisible(coalesce(nullif(btrim(coalesce(p_body, '')), ''), f.body)), '[[:space:]]+', ' ', 'g'));
-- Full bodies: supabase/migrations/20261007000000_wiki.sql with those two lines swapped in.
