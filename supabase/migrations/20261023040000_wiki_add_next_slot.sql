-- Wiki: adding "something" to a page, not to a numbered gap.
-- cr_wiki_add_fact(page, NULL, words) puts the fact in the next position at the end of the page
-- (a number still means "change my words in that place"), and widens the page's slot count to
-- fit. Everything else about it is as before: 2 mana, witches' facts are kept at once, others'
-- wait for a witch. See the function in the database for its body.

-- Later the same day: adding is limited to 3 words (80 characters), witches included.
-- cr_wiki_add_fact's check became `cardinality(regexp_split_to_array(v_body, ' ')) > 3`.
-- cr_wiki_review_fact is unchanged at 10, so a fact sent before the limit came down can
-- still be kept as it was written.
