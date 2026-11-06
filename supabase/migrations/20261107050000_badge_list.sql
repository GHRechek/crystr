-- The new badge list. Badges the system hands out itself carry a metric and a threshold (count this
-- about the person; at or past the threshold, it is theirs). Badges a witch approves are made and
-- edited by witches in the app. witch_approved is the difference.
alter table public.badges add column if not exists metric text;
alter table public.badges add column if not exists threshold int;

create or replace function public.cr_metric(p_user uuid, p_metric text)
returns bigint language plpgsql stable security definer set search_path = public as $$
declare v bigint := 0;
begin
  case p_metric
    when 'posts' then select count(*) into v from public.posts where author_id = p_user and parent_id is null;
    when 'image_days' then select count(distinct created_at::date) into v from public.posts where author_id = p_user and has_image;
    when 'post_streak' then
      select coalesce(max(c), 0) into v from (
        select count(*) c from (
          select dd, dd - (row_number() over (order by dd))::int as grp
            from (select distinct created_at::date dd from public.posts where author_id = p_user) d
        ) g group by grp) x;
    when 'quests' then select count(*) into v from public.quest_submissions where user_id = p_user;
    when 'likes_given' then select count(*) into v from public.post_likes where user_id = p_user;
    when 'likes_got' then
      select count(*) into v from public.post_likes l join public.posts p on p.id = l.post_id
       where p.author_id = p_user and l.user_id <> p_user;
    when 'likes_on_one' then
      select coalesce(max(c), 0) into v from (
        select count(*) c from public.post_likes l join public.posts p on p.id = l.post_id
         where p.author_id = p_user and l.user_id <> p_user group by l.post_id) x;
    when 'replies' then select count(*) into v from public.posts where author_id = p_user and parent_id is not null;
    when 'replies_on_one' then
      select coalesce(max(c), 0) into v from (
        select count(*) c from public.posts r join public.posts root on root.id = r.parent_id
         where root.author_id = p_user and r.author_id <> p_user group by r.parent_id) x;
    when 'whispers' then select count(*) into v from public.dm_messages where sender_id = p_user and deleted_at is null;
    when 'votes' then select count(*) into v from public.motion_votes where user_id = p_user;
    when 'opeds' then select count(*) into v from public.articles where author_id = p_user and kind = 'oped' and status = 'published';
    when 'helps_people' then
      select count(distinct other) into v from public.vouches where kind = 'helped' and status = 'confirmed' and claimant = p_user;
    when 'meets_people' then
      select count(distinct case when claimant = p_user then other else claimant end) into v
        from public.vouches where kind = 'meetup' and status = 'confirmed' and (claimant = p_user or other = p_user);
    when 'meet_witch' then
      select count(*) into v from public.vouches vv
        join public.profiles pr on pr.id = case when vv.claimant = p_user then vv.other else vv.claimant end
       where vv.kind = 'meetup' and vv.status = 'confirmed' and (vv.claimant = p_user or vv.other = p_user) and pr.is_witch;
    when 'bio' then select case when char_length(btrim(coalesce(bio, ''))) > 0 then 1 else 0 end into v from public.profiles where id = p_user;
    when 'details' then
      select case when char_length(btrim(coalesce(bio, ''))) > 0 and char_length(btrim(coalesce(likes, ''))) > 0
                   and char_length(btrim(coalesce(dislikes, ''))) > 0 and char_length(btrim(coalesce(food, ''))) > 0
                   and char_length(btrim(coalesce(obsession, ''))) > 0 and birthday is not null then 1 else 0 end
        into v from public.profiles where id = p_user;
    when 'top_full' then select case when count(*) >= 5 then 1 else 0 end into v from public.top_friends where user_id = p_user;
    when 'in_tops' then select count(distinct user_id) into v from public.top_friends where friend_id = p_user;
    when 'shown' then select jsonb_array_length(coalesce(shown_badges, '[]'::jsonb)) into v from public.profiles where id = p_user;
    when 'token_made' then select count(*) into v from public.tokens where user_id = p_user;
    when 'token_how' then select count(*) into v from public.tokens where user_id = p_user and nullif(btrim(coalesce(how, '')), '') is not null;
    when 'trades' then select count(*) into v from public.badge_trades where status = 'accepted' and (from_user = p_user or to_user = p_user);
    when 'token_given' then select count(*) into v from public.tokens where user_id = p_user and last_given_at is not null;
    when 'token_held' then select count(*) into v from public.badge_items where kind = 'token' and owner_id = p_user and earned_by is distinct from p_user;
    when 'gift_nothing' then select count(*) into v from public.badge_trades where status = 'accepted' and from_user = p_user and give_item is not null and want_item is null;
    when 'mana_spent' then select coalesce(spent_total, 0) into v from public.profiles where id = p_user;
    when 'mana_full' then select case when mana_cap > 0 and mana >= mana_cap then 1 else 0 end into v from public.profiles where id = p_user;
    when 'mana_cap' then select coalesce(mana_cap, 0) into v from public.profiles where id = p_user;
    when 'days_in' then select floor(extract(epoch from (now() - created_at)) / 86400)::bigint into v from public.profiles where id = p_user;
    when 'originals' then
      select count(*) into v from public.user_badges where user_id = p_user
         and badge_slug in ('first-words','show-and-tell','joined-in','whisper-web','a-voice-in-council','meet-in-person','a-helping-hand','registered-plaintiff');
    when 'max_tier' then select coalesce(max(tier), 0) into v from public.user_badges where user_id = p_user;
    else v := 0;
  end case;
  return coalesce(v, 0);
end;
$$;
revoke all on function public.cr_metric(uuid, text) from public, anon, authenticated;

insert into public.badges (slug, title, how, blurb, art, sort, active, witch_approved, metric, threshold) values
  ('first-picture-wall', 'Picture Wall', 'Post pictures on five different days.', 'Posted pictures on five different days.', 'set/116.png', 200, true, false, 'image_days', 5),
  ('ten-posts', 'Regular Voice', 'Make ten posts.', 'Made ten posts.', 'set/117.png', 201, true, false, 'posts', 10),
  ('fifty-posts', 'Town Crier', 'Make fifty posts.', 'Made fifty posts.', 'set/125.png', 202, true, false, 'posts', 50),
  ('three-days', 'Three in a Row', 'Post on three days in a row.', 'Posted three days running.', 'set/110.png', 203, true, false, 'post_streak', 3),
  ('quest-taker', 'Quest Taker', 'Answer a daily quest.', 'Answered a quest.', 'set/121.png', 204, true, false, 'quests', 1),
  ('first-like-given', 'Kind Word', 'Like someone else''s post.', 'Liked a post.', 'set/103.png', 205, true, false, 'likes_given', 1),
  ('fifty-likes-given', 'Generous Thumb', 'Like fifty posts.', 'Liked fifty posts.', 'set/131.png', 206, true, false, 'likes_given', 50),
  ('first-like-got', 'Noticed', 'Get a like on a post.', 'Got a first like.', 'set/101.png', 207, true, false, 'likes_got', 1),
  ('ten-likes-got', 'Well Liked', 'Get ten likes on a single post.', 'Had ten likes on one post.', 'set/107.png', 208, true, false, 'likes_on_one', 10),
  ('first-reply', 'Chimed In', 'Reply to someone''s post.', 'Replied to a post.', 'set/99.png', 209, true, false, 'replies', 1),
  ('twenty-replies', 'Conversationalist', 'Make twenty replies.', 'Made twenty replies.', 'set/115.png', 210, true, false, 'replies', 20),
  ('got-replied', 'Started Something', 'Get five replies on one post.', 'Got five replies on one post.', 'set/112.png', 211, true, false, 'replies_on_one', 5),
  ('first-whisper', 'First Whisper', 'Send a whisper.', 'Sent a first whisper.', 'set/117.png', 212, true, false, 'whispers', 1),
  ('ten-whispers', 'Quiet Voice', 'Send ten whispers.', 'Sent ten whispers.', 'set/115.png', 213, true, false, 'whispers', 10),
  ('first-motion-vote', 'Hand Up', 'Vote on a motion.', 'Voted on a motion.', 'set/125.png', 214, true, false, 'votes', 1),
  ('twenty-motions', 'Council Regular', 'Vote on twenty motions.', 'Voted on twenty motions.', 'set/106.png', 215, true, false, 'votes', 20),
  ('first-op-ed', 'In Print', 'Publish an op-ed.', 'Published an op-ed.', 'set/109.png', 216, true, false, 'opeds', 1),
  ('five-op-eds', 'Columnist', 'Publish five op-eds.', 'Published five op-eds.', 'set/149.png', 217, true, false, 'opeds', 5),
  ('five-helps', 'Five Favours', 'Help five different people.', 'Helped five different people.', 'set/103.png', 218, true, false, 'helps_people', 5),
  ('twenty-helps', 'Pillar', 'Help twenty different people.', 'Helped twenty different people.', 'set/141.png', 219, true, false, 'helps_people', 20),
  ('first-meet', 'Face to Face', 'Meet someone in person from the City.', 'Met someone in person.', 'set/102.png', 220, true, false, 'meets_people', 1),
  ('three-meets', 'Getting Around', 'Meet three different people in person.', 'Met three people in person.', 'set/113.png', 221, true, false, 'meets_people', 3),
  ('ten-meets', 'Known Face', 'Meet ten different people in person.', 'Met ten people in person.', 'set/124.png', 222, true, false, 'meets_people', 10),
  ('meet-witch', 'Audience', 'Meet a witch in person.', 'Met a witch in person.', 'set/107.png', 223, true, false, 'meet_witch', 1),
  ('first-bio', 'Say Something', 'Write your About Me.', 'Wrote an About Me.', 'set/109.png', 224, true, false, 'bio', 1),
  ('full-details', 'All the Details', 'Fill in every detail on your profile.', 'Filled in every detail.', 'set/139.png', 225, true, false, 'details', 1),
  ('top-five-full', 'Five Friends', 'Fill your Top 5.', 'Filled their Top 5.', 'set/103.png', 226, true, false, 'top_full', 1),
  ('top-five-in', 'In Someone''s Five', 'Be in someone''s Top 5.', 'Was in someone''s Top 5.', 'set/101.png', 227, true, false, 'in_tops', 1),
  ('show-five', 'On Display', 'Show five badges on your profile.', 'Showed five badges.', 'set/107.png', 228, true, false, 'shown', 5),
  ('token-made', 'Maker', 'Make your token.', 'Made a token.', 'set/123.png', 229, true, false, 'token_made', 1),
  ('token-how', 'Set the Terms', 'Write how people can earn your token.', 'Wrote how to earn their token.', 'set/149.png', 230, true, false, 'token_how', 1),
  ('first-trade', 'First Trade', 'Make a trade.', 'Made a trade.', 'set/119.png', 231, true, false, 'trades', 1),
  ('five-trades', 'Dealer', 'Complete five trades.', 'Completed five trades.', 'set/120.png', 232, true, false, 'trades', 5),
  ('give-token', 'Gave a Token', 'Give your token to someone.', 'Gave their token away.', 'set/143.png', 233, true, false, 'token_given', 1),
  ('got-token', 'Held One', 'Be given someone''s token.', 'Was given a token.', 'set/143.png', 234, true, false, 'token_held', 1),
  ('gift-badge', 'No Strings', 'Give a tradable badge for nothing.', 'Gave a badge away for nothing.', 'set/130.png', 235, true, false, 'gift_nothing', 1),
  ('first-spend', 'Spent a Little', 'Spend mana for the first time.', 'Spent mana for the first time.', 'set/119.png', 236, true, false, 'mana_spent', 1),
  ('spend-hundred', 'Big Spender', 'Spend a hundred mana in total.', 'Spent a hundred mana.', 'set/120.png', 237, true, false, 'mana_spent', 100),
  ('full-well', 'Brimming', 'Be at full mana.', 'Reached full mana.', 'set/131.png', 238, true, false, 'mana_full', 1),
  ('max-fifty', 'Deep Reserves', 'Reach a max mana of fifty.', 'Reached a max mana of fifty.', 'set/111.png', 239, true, false, 'mana_cap', 50),
  ('week-in', 'A Week In', 'Be in the City for a week.', 'Lasted a week in the City.', 'set/110.png', 240, true, false, 'days_in', 7),
  ('month-in', 'A Month In', 'Be in the City for a month.', 'Lasted a month in the City.', 'set/138.png', 241, true, false, 'days_in', 30),
  ('three-months', 'Settled', 'Be in the City for three months.', 'Lasted three months in the City.', 'set/181.png', 242, true, false, 'days_in', 90),
  ('year-in', 'Old Hand', 'Be in the City for a year.', 'Lasted a year in the City.', 'set/141.png', 243, true, false, 'days_in', 365),
  ('all-eight', 'Complete Set', 'Earn all eight of the first badges.', 'Earned all eight of the first badges.', 'set/141.png', 244, true, false, 'originals', 8),
  ('tier-three', 'Rising', 'Reach the third step of any badge.', 'Reached the third step of a badge.', 'set/107.png', 245, true, false, 'max_tier', 3)
on conflict (slug) do nothing;

insert into public.badges (slug, title, how, blurb, art, sort, active, witch_approved) values
  ('picnic', 'Picnic', 'Have a picnic on a real blanket, and post a picture of the spread.', 'Had a picnic.', 'set/134.png', 400, true, true),
  ('sunrise', 'First Light', 'Be outside when the sun comes up, and post a picture, a poem or a drawing.', 'Watched the sun come up.', 'set/181.png', 401, true, true),
  ('sunset', 'Last Light', 'Watch the whole sunset with your phone away, then post a poem about it.', 'Watched the sun go down.', 'set/181.png', 402, true, true),
  ('stargazing', 'Under the Stars', 'Lie on your back and look at the stars for a while. Post a poem or a drawing of the sky.', 'Spent time under the stars.', 'set/140.png', 403, true, true),
  ('outdoor-swim', 'Wild Swim', 'Swim in a lake, a river or the sea, and post a picture of the place.', 'Swam outdoors.', 'set/126.png', 404, true, true),
  ('bake-something', 'Fresh Baked', 'Bake something from scratch and post a picture of it.', 'Baked something.', 'set/135.png', 405, true, true),
  ('slow-meal', 'Slow Supper', 'Cook a home cooked meal, no delivery allowed, and post about it. We like pictures!', 'Cooked a home cooked meal.', 'set/135.png', 406, true, true),
  ('plant-something', 'Planted', 'Plant a seed, a cutting or a tree, and post a picture.', 'Planted something.', 'set/133.png', 407, true, true),
  ('garden-time', 'Green Thumb', 'Spend an afternoon in a garden, yours or not, and post about it.', 'Spent an afternoon in a garden.', 'set/133.png', 408, true, true),
  ('bike-ride', 'Wheels', 'Ride a bike somewhere you have never been, and post the view.', 'Went for a bike ride.', 'set/136.png', 409, true, true),
  ('read-in-the-park', 'Page and Park', 'Read a whole chapter outside and post what you are reading.', 'Read outdoors.', 'set/109.png', 410, true, true),
  ('finished-a-book', 'The End', 'Finish a book and post a spoiler free review.', 'Finished a book.', 'set/109.png', 411, true, true),
  ('handwritten-letter', 'Dear You', 'Write a letter by hand to someone you miss, and post about it. You do not have to post the letter.', 'Wrote a letter by hand.', 'set/149.png', 412, true, true),
  ('journal-page', 'Dear Diary', 'Write in a journal for ten minutes and post about it. The page stays private.', 'Wrote in a journal.', 'set/148.png', 413, true, true),
  ('proper-tea', 'Proper Tea', 'Make tea in a pot, let it steep, and drink it sitting down. Post about it.', 'Made a proper pot of tea.', 'set/164.png', 414, true, true),
  ('long-bath', 'Long Soak', 'Take a long bath with your phone in another room, then post a poem or a drawing about it.', 'Took a long bath.', 'set/169.png', 415, true, true),
  ('museum-visit', 'Museum Day', 'Visit a museum or a gallery and post your favourite piece.', 'Visited a museum.', 'set/113.png', 416, true, true),
  ('library-visit', 'Quiet Stacks', 'Spend an hour in a library and post about what you found.', 'Spent time in a library.', 'set/109.png', 417, true, true),
  ('wildlife-spotted', 'Spotted One', 'Spot a wild animal that is not a pigeon, and post a picture.', 'Spotted something wild.', 'set/184.png', 418, true, true),
  ('long-walk', 'Long Walk', 'Go for a walk with no destination and post where you ended up.', 'Went for a long walk.', 'set/182.png', 419, true, true),
  ('beach-day', 'Sea Air', 'Sit by the sea, a lake or a river until you feel like leaving, then post a poem about it.', 'Spent time by the water.', 'set/126.png', 420, true, true),
  ('campfire', 'Round the Fire', 'Sit by a fire and post a poem about it.', 'Sat by a fire.', 'set/291.png', 421, true, true),
  ('drawn-something', 'Pencil Case', 'Draw something from real life, not from a photo, and post it.', 'Drew something.', 'set/123.png', 422, true, true),
  ('painted-something', 'Wet Paint', 'Paint something, anything, and post it.', 'Painted something.', 'set/123.png', 423, true, true),
  ('jigsaw', 'Missing Piece', 'Do a jigsaw puzzle and post a picture of it, finished or not.', 'Did a jigsaw puzzle.', 'set/127.png', 424, true, true),
  ('gone-fishing', 'Gone Fishing', 'Go fishing, or sit by water with a line, and post about it.', 'Went fishing.', 'set/160.png', 425, true, true),
  ('market-day', 'Market Day', 'Go to a market and post what you took home.', 'Went to a market.', 'set/119.png', 426, true, true),
  ('dinner-with-a-friend', 'Shared Table', 'Share a meal with a friend, phones away, and post the table.', 'Shared a meal with a friend.', 'set/135.png', 427, true, true),
  ('dance-break', 'Dance Break', 'Put on a song and dance, then post about it. Link the song!', 'Danced.', 'set/117.png', 428, true, true),
  ('animal-friend', 'Animal Friend', 'Spend time with an animal and post a picture.', 'Spent time with an animal.', 'set/103.png', 429, true, true),
  ('rainy-day', 'Rain on the Window', 'Spend a rainy day somewhere warm with something hot to drink, and post about it.', 'Spent a rainy day somewhere warm.', 'set/169.png', 430, true, true),
  ('first-snow', 'Snow Day', 'Go out in the snow, or watch it fall, and post a picture.', 'Spent time in the snow.', 'set/111.png', 431, true, true),
  ('moon-watching', 'Moon Watch', 'Go outside and look at the moon for a while, then post a poem or a drawing.', 'Watched the moon.', 'set/140.png', 432, true, true),
  ('autumn-leaves', 'Leaf Pile', 'Walk through autumn leaves and post a picture.', 'Walked through autumn leaves.', 'set/133.png', 433, true, true),
  ('blossoms', 'Blossom', 'Find something in bloom and post a picture.', 'Found something in bloom.', 'set/133.png', 434, true, true),
  ('wildflowers', 'Wildflowers', 'Press some wildflowers and post a picture.', 'Pressed wildflowers.', 'set/123.png', 435, true, true),
  ('forest-bathing', 'Among the Trees', 'Spend an hour among trees with your phone on silent, and post about it.', 'Spent an hour among trees.', 'set/133.png', 436, true, true),
  ('high-place', 'High Place', 'Go somewhere high, look out, and post the view.', 'Went somewhere high and looked out.', 'set/132.png', 437, true, true),
  ('bird-watching', 'Bird Watch', 'Get a picture of an interesting bird.', 'Watched the birds.', 'set/184.png', 438, true, true),
  ('fresh-flowers', 'Fresh Flowers', 'Put fresh flowers in a vase, or give some away, and post a picture.', 'Put flowers in a vase.', 'set/103.png', 439, true, true),
  ('fruit-picking', 'Pick Your Own', 'Pick fruit or berries, or buy the best you can find and show us!', 'Picked fruit.', 'set/135.png', 440, true, true),
  ('made-by-hand', 'Made by Hand', 'Knit, sew, carve or mend something and post a picture!', 'Made or mended something by hand.', 'set/149.png', 441, true, true),
  ('jam-session', 'Jam Session', 'Jam with someone else, live, and post about it.', 'Jammed with someone, live.', 'set/117.png', 442, true, true),
  ('compose-a-song', 'Original Song', 'Compose a song and post a link to it!', 'Composed a song.', 'set/117.png', 443, true, true),
  ('whole-album', 'Whole Album', 'Listen to a whole album, start to end, with nothing else going on. Post about it.', 'Listened to a whole album.', 'set/117.png', 444, true, true),
  ('movie-night', 'Movie Night', 'Watch a movie with no phones and the lights off, then write a spoiler-free review.', 'Watched a movie properly.', 'set/114.png', 445, true, true),
  ('still-moment', 'Still Moment', 'Sit still for ten minutes and do nothing else. Post about it, or a poem.', 'Sat still for ten minutes.', 'set/110.png', 446, true, true),
  ('sunny-nap', 'Sunny Nap', 'Take a proper daytime nap, or lie in the sun. Post about it, or a poem.', 'Had a proper nap.', 'set/181.png', 447, true, true),
  ('new-skill', 'Beginner''s Luck', 'Try something you have never done before and post about it. We like pictures!', 'Tried something new.', 'set/128.png', 448, true, true),
  ('lent-a-hand', 'Lent a Hand', 'Do something kind for a neighbour or a stranger, and post about it.', 'Did something kind for someone.', 'set/103.png', 449, true, true)
on conflict (slug) do nothing;

-- Badges are only worked on, and earned, when they are on the person's Working On list. The list is
-- profiles.working_on ("a:<slug>"). A badge already done when it goes on the list is awarded then.
create or replace function public.award_badges(p_user uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare b record; ok boolean; n int := 0; v_count bigint; v_tier int; v_have int;
        v_helped int; v_minted int; v_kind text; v_work jsonb;
begin
  select coalesce(working_on, '[]'::jsonb) into v_work from public.profiles where id = p_user;
  v_work := coalesce(v_work, '[]'::jsonb);
  for b in select slug, tiers, metric, threshold from public.badges
            where active and v_work ? ('a:' || slug) loop
    select tier into v_have from public.user_badges where user_id = p_user and badge_slug = b.slug;

    if b.tiers > 1 then
      v_count := case b.slug
        when 'joined-in' then
          (select count(distinct r.parent_id)
             from public.posts r
             join public.posts root on root.id = r.parent_id
            where r.author_id = p_user and r.parent_id is not null
              and root.author_id <> p_user)
        when 'whisper-web' then
          (select count(distinct case when t.user_a = p_user then t.user_b else t.user_a end)
             from public.dm_threads t
            where (t.user_a = p_user or t.user_b = p_user)
              and exists (select 1 from public.dm_messages m
                           where m.thread_id = t.id and m.sender_id = p_user))
        when 'a-voice-in-council' then
          (select count(*) from public.motion_votes where user_id = p_user)
        else 0
      end;
      v_tier := least(b.tiers, public.badge_tier_for(v_count));
      if v_tier = 0 then continue; end if;
      if v_have is null then
        insert into public.user_badges (user_id, badge_slug, tier) values (p_user, b.slug, v_tier)
          on conflict do nothing;
        n := n + 1;
      elsif v_tier > v_have then
        update public.user_badges set tier = v_tier, upgraded_at = now(), seen = false
         where user_id = p_user and badge_slug = b.slug;
        n := n + 1;
      end if;
      continue;
    end if;

    if v_have is not null then continue; end if;
    if b.metric is not null then
      ok := public.cr_metric(p_user, b.metric) >= coalesce(b.threshold, 1);
    else
      ok := case b.slug
        when 'first-words' then
          exists (select 1 from public.posts where author_id = p_user and parent_id is null)
        when 'show-and-tell' then
          exists (select 1 from public.posts where author_id = p_user and has_image
                    and (image_url is not null or proof_path is not null))
        when 'meet-in-person' then
          exists (select 1 from public.vouches
                   where kind = 'meetup' and status = 'confirmed'
                     and (claimant = p_user or other = p_user))
        when 'a-helping-hand' then
          exists (select 1 from public.vouches
                   where kind = 'helped' and status = 'confirmed' and claimant = p_user)
        when 'registered-plaintiff' then
          exists (select 1 from public.plaintiffs where user_id = p_user)
        when 'visit-the-well' then
          exists (select 1 from public.quest_submissions where user_id = p_user)
        when 'vote-on-a-motion' then
          exists (select 1 from public.motion_votes where user_id = p_user)
        when 'publish-an-op-ed' then
          exists (select 1 from public.articles where author_id = p_user and kind = 'oped' and status = 'published')
        when 'ask-for-help' then
          exists (select 1 from public.profiles where id = p_user and nullif(btrim(mood), '') is not null)
        else false
      end;
    end if;
    if ok then
      insert into public.user_badges (user_id, badge_slug) values (p_user, b.slug)
        on conflict do nothing;
      n := n + 1;
    end if;
  end loop;

  select count(*) into v_helped from public.vouches
   where kind = 'helped' and status = 'confirmed' and claimant = p_user;
  select count(*) into v_minted from public.badge_items
   where kind = 'tradable' and earned_by = p_user and occasion = 'helped';
  while v_minted < v_helped / 5 loop
    select slug into v_kind from public.badge_kinds where active order by random() limit 1;
    exit when v_kind is null;
    insert into public.badge_items (kind, kind_slug, earned_by, owner_id, occasion)
    values ('tradable', v_kind, p_user, p_user, 'helped');
    v_minted := v_minted + 1;
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- A witch's like on a request only counts if the badge is on the author's list.
create or replace function public.trg_badge_request_liked()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_author uuid; v_badge text;
begin
  select author_id, badge_slug into v_author, v_badge from public.posts where id = new.post_id;
  if v_badge is null or v_author is null or v_author = new.user_id then return new; end if;
  if not exists (select 1 from public.profiles where id = new.user_id and is_witch) then return new; end if;
  if not exists (select 1 from public.badges where slug = v_badge and active and witch_approved) then return new; end if;
  if not exists (select 1 from public.profiles where id = v_author and working_on ? ('a:' || v_badge)) then return new; end if;
  insert into public.user_badges (user_id, badge_slug) values (v_author, v_badge) on conflict do nothing;
  return new;
end;
$$;

-- Saving the list also counts what is already done.
create or replace function public.cr_set_working_on(p_list jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'auth'); end if;
  v := public.cr_clean_working_on(p_list);
  update public.profiles set working_on = v where id = auth.uid();
  perform public.award_badges(auth.uid());
  return jsonb_build_object('ok', true, 'working_on', v);
end;
$$;

-- Witches make and edit the badges a witch approves; nobody edits the ones the system awards.
create or replace function public.cr_badge_save(p_slug text, p_title text, p_how text, p_blurb text, p_art int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_slug text; v_base text; v_n int := 1; v_title text := btrim(coalesce(p_title, ''));
        v_how text := btrim(coalesce(p_how, '')); v_blurb text := btrim(coalesce(p_blurb, ''));
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_witch) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  if char_length(v_title) not between 1 and 40 or char_length(v_how) not between 1 and 200
     or char_length(v_blurb) not between 1 and 120 or p_art is null or p_art not between 1 and 299 then
    return jsonb_build_object('ok', false, 'code', 'bad_input');
  end if;
  if p_slug is not null then
    update public.badges set title = v_title, how = v_how, blurb = v_blurb, art = 'set/' || p_art || '.png'
     where slug = p_slug and witch_approved;
    if not found then return jsonb_build_object('ok', false, 'code', 'missing'); end if;
    return jsonb_build_object('ok', true, 'slug', p_slug);
  end if;
  v_base := trim(both '-' from regexp_replace(lower(v_title), '[^a-z0-9]+', '-', 'g'));
  if v_base = '' then v_base := 'badge'; end if;
  v_slug := left(v_base, 40);
  while exists (select 1 from public.badges where slug = v_slug) loop
    v_n := v_n + 1; v_slug := left(v_base, 36) || '-' || v_n;
  end loop;
  insert into public.badges (slug, title, how, blurb, art, sort, active, witch_approved)
  values (v_slug, v_title, v_how, v_blurb, 'set/' || p_art || '.png',
          (select coalesce(max(sort), 0) + 1 from public.badges), true, true);
  return jsonb_build_object('ok', true, 'slug', v_slug);
end;
$$;
revoke all on function public.cr_badge_save(text, text, text, text, int) from public, anon;
grant execute on function public.cr_badge_save(text, text, text, text, int) to authenticated;

create or replace function public.cr_badge_delete(p_slug text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_witch) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  delete from public.badges where slug = p_slug and witch_approved;
  if not found then return jsonb_build_object('ok', false, 'code', 'missing'); end if;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.cr_badge_delete(text) from public, anon;
grant execute on function public.cr_badge_delete(text) to authenticated;

-- Count what is already done for everyone who has these on their list.
select public.award_badges(id) from public.profiles;
