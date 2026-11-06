# CRYSTR

A social network for The City — a LARP prop that works. Everything you say
costs mana: a post is 5, an image is 3 more, a like is 1, a whisper is 2, a
vote is 3, an op-ed is 6. The well refills only when you bring it proof you
did something real away from the screen. Run out and the feed doesn't lock —
it decays, visibly, until you can barely read it.

Built from the Claude Design prototype (`Crystr.dc.html`), against Next.js 14,
Supabase and Vercel.

## The screens

| Route | What it is |
| --- | --- |
| `/` | The timeline. Posts, plus published Ball dispatches interleaved at positions 2, 5 and 8 with a `◉ BALL` tag. Decays with your balance. |
| `/post` | Compose, with a live cost preview and an image toggle. Reached from the NEW POST button at the top of the feed, not a tab. |
| `/thread/[id]` | A post and the replies under it, oldest first, with the reply box. Five mana a reply, same as a post. |
| `/well`, `/well/[slug]` | The five quests and their proof screens. |
| `/whispers`, `/whispers/[id]`, `/whispers/new` | DMs at 2 mana a message. A conversation with something new in it shows as unread, and the WHISPER tab wears a small bubble with how many such conversations there are; opening one reads it (`dm_reads`, `cr_mark_thread_read`, `cr_unread_whispers`; migration `20261105010000_whisper_reads.sql`). |
| `/thread/[id]/send` | Send a post to someone in a whisper, with a note if you like, for the price of a whisper (2 mana). Reached from SEND IN A WHISPER in the three-dot menu on a post, beside REPORT (which opens the detailed form in place). The post arrives in the whisper as a quoted card (`dm_messages.post_id`, `cr_send_post`; the migration is `20261105000000_send_post_in_whisper.sql`). Unsending drops the post from the message. |
| `/welcome` | The registry: a face, your info (your own name, username, character name), birthday, district and species codes. Until it is done the tab bar is REGISTRY and WIKI, nothing else. |
| `/me`, `/me/edit`, `/me/avatar`, `/me/top-six` | MySpace-shaped profile: a plain banner with the thought and a bigger portrait, the username in the pixel font, a blank `?` tile for your token beside About Me (tap it to open the token), Top 5 on one line (picked on its own page), the badge collection as tight icons, WORKING ON, max mana, the mana ledger, and the portrait builder. |
| `/me/token`, `/me/trades`, `/u/[handle]/trade` | Badges: design your token, see offers waiting, offer someone a trade. |
| `/me/override`, `/override/[code]`, `/breach` | The override (witches only on the first): a witch's key as a QR code, the address it points at, and the break-in that lets someone past the registry. See below. |
| `/ball?tab=motions`, `/vote/new` | The motion board (open / decided) is the MOTIONS tab of the Ball, beside CITY NEWS and OP-EDS; `/vote` redirects there. `/vote/new` is the witch-only two-step composer. |
| `/ball`, `/ball/[id]`, `/ball/new`, `/ball/[id]/edit` | Crystr Ball, in two tabs: CITY NEWS (dispatches, with NEW DISPATCH for witches) and OP-EDS (citizens' pieces, with SUBMIT AN OP-ED for players and the review queue for witches). Witches get a VIEWING THE BALL AS switch (witch or player) in the three-dot menu at the top right; it keeps the tab they were on. The editor's "Published by" and "Highlight" fields are the byline and the one-line summary. ATTACH IMAGE picks a picture for the article from everything we have (the 69 token icons, the 8 achievement and 48 tradable badges, and the 299 badges of the uploaded set, now served from `public/badges/set/`; `lib/article-icons.ts` lists them with their sizes and what a saved name such as `set-120` or `tradable-bat-banner` means) (`articles.banner_icon`, set by `cr_set_article_icon`; migration `20261106000000_article_icon.sql`): on the article it comes first, below the highlight, half the width and on the left, with the body starting level with its top and wrapping round it; on the Ball list and the feed it shows as a small tile. The header no longer carries a line about how much mana you have; the number and the potion say it. |

## Witches and players

`profiles.is_witch` is the whole permission model.

- **Witches** table motions (never without a briefing — both rows are written
  in one transaction or neither is), publish dispatches, and approve or return
  player op-eds. On the Ball they get a `VIEWING AS WITCH / PLAYER` switch so
  they can see what a player sees; a player has no switch.
- **Players** file op-eds for 6 mana, which queue as `pending` and reach the
  City only when a witch approves them.
- Every witch also holds an **override key** (`/me/override`) that lets
  someone the registry cannot take into the City, and sees who came in that
  way. See "The override" below.

To make someone a witch:

```sql
do $$ begin
  perform set_config('crystr.economy', 'on', true);
  update public.profiles set is_witch = true where handle = 'their-handle';
end $$;
```

The `set_config` line is required — see below.

## How the economy is protected

The client never moves mana. Every charge and every credit happens inside a
`SECURITY DEFINER` function (`cr_create_post`, `cr_like_post`,
`cr_submit_quest`, `cr_send_whisper`, `cr_cast_vote`, `cr_submit_oped`,
`cr_table_motion`, `cr_set_top_friends`, `cr_offer_trade`, `cr_answer_trade`),
each of which locks the caller's profile row before reading the balance, so two
tabs can't spend the same mana twice.

Three things hold the line:

1. **A guard trigger.** `guard_profile_economy` silently restores `mana`,
   `spent_total` and `is_witch` on any UPDATE that isn't running inside an
   economy function (they set a `crystr.economy` GUC for their transaction).
   A player can edit their handle and bio; they cannot edit their balance.
2. **No write policies.** The tables carry SELECT policies only. There is no
   INSERT policy on `posts`, `mana_ledger`, `motion_votes` and the rest — the
   only writer is a definer function.
3. **Tight grants.** `cr_take` (the raw charge, which takes an amount) is
   revoked from `PUBLIC`, `anon` and `authenticated`; the rest are revoked
   from `PUBLIC`/`anon` and granted to `authenticated` only.

Quests carry a per-quest cooldown (4–8 hours) so the well is not a tap, and
`cr_submit_quest` rejects a submission with neither an uploaded artifact nor
at least a written account of what you did.

## Privacy

Individual votes are private: `motion_votes` has a SELECT policy for your own
rows only, and the public tallies come from the `motion_tallies()` function,
which returns counts and never a row. Whispers are readable only by the two
people in the thread. Proof uploads go to a private `proofs` bucket, one
folder per player, readable by that player and by witches.

## Environment variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Both from the CRYSTR Supabase project's Settings → API page. Set them in
Vercel and in `.env.local` for local work.

## Google OAuth (one-time, two places)

1. **Google Cloud Console** — add this app's callback to the OAuth client's
   authorized redirect URIs:
   `https://<crystr-project-ref>.supabase.co/auth/v1/callback`
2. **Supabase → Authentication → Providers → Google** — enable it and paste
   the same client ID and secret.

There is no signup form. The `on_auth_user_created` trigger makes a profile
the first time a Google account signs in here, with a starter handle and an
opening grant of 5 mana that shows up on the ledger. Until they have registered
on `/welcome` they can hold 10 at most, and only the registry and the wiki are
open to them (the registry tab wears a red pixel `!` until the form is done).
The low-mana wash and scanlines still come for them (5 of 10 is low), but
not the SIGNAL DEGRADING card: its RECOVER button leads to the Well, which is
closed until they are in.

## The override

Some of the City's people cannot fill in the registry: the form has no line
for what they are (choosing "Other" on it tells them to contact their local
CRYSTR administrator). Every witch holds a **key** against it, theirs for
good: `/me/override` shows it as a QR code pointing at `/override/<code>`. Scanning it puts
the code in a cookie and sends the person to `/breach`, by way of the sign-in
and the terms if they are new (the cookie waits half an hour, and the welcome
gate sends anyone holding one to the breach instead of the form). There the
break-in plays out line by line and `cr_override_onboard` lets them in with
no form filled: on the books as "let in by <witch>" (`registry_overrides`),
not as a registered plaintiff, so that badge stays out of reach. A key does
not change, and it opens the City for as long as its holder is a witch. Keys
are 32 hex characters from `gen_random_uuid()` (`override_keys`, one row per
witch); the migration is
`supabase/migrations/20261028080000_registry_override.sql`. The QR code is
drawn on the server by `components/qr.tsx` from the module grid the `qrcode`
package works out, as pixel runs on white with the quiet zone readers expect.
A code the City does not know lands on a NOT A KEY notice; someone already
in lands on NOTHING TO BREAK INTO.

The potion beside the mana count in the header is the way to the Well (there is no separate
Well button). It shakes harder the lower the meter gets: still above half, a slow pulse below
half, faster below a quarter, a constant rattle below an eighth, the fastest at nothing, and
still for anyone who asks the browser for reduced motion. Before registering the Well is shut,
so there it is only a potion.

Shown badges are `profiles.shown_badges` (`a:<slug>` for an earned achievement, `i:<id>` for a
tradable badge held now, at most four, in order). `cr_set_shown_badges` saves them and a trigger
on the column (`profiles_shown_badges_guard`) drops anything the person has not earned or does
not hold, so a badge traded away disappears from the display; migration
`20261106010000_shown_badges.sql` (four, not five, from `20261106020000_shown_badges_four.sql`).

Shown badges (up to five, `20261108040000_shown_badges_five_again.sql`) sit in the About Me card after the token, smaller; a dashed ✎ on your own page (an eye on anyone else's) opens every badge full screen, earned and tradable in tabs, no cards; on your own page tapping picks the five to show. A token carries a line its maker writes, `tokens.how` (`20261106060000_token_how.sql`), shown when someone lists it under Working On. The
collections (BADGES, TRADABLE BADGES, WHAT THEY HOLD) are icons only, packed tight, three rows to
a page with the count and the page arrows on the header line; tapping one gives its tooltip. It
is built to hold hundreds. WORKING ON lists up to five badges a person is going after, one to a
row with what each takes; on your own page a button opens every badge, earned or not, to pick
them. They are `profiles.working_on` (`a:<slug>`, any active badge, no need to have earned it),
saved by `cr_set_working_on` and cleaned by `profiles_working_on_guard`; migration
`20261106030000_working_on.sql`.
Other people's tokens can be listed too (`t:<user id>`, "Be given it by …"), from `20261106040000_working_on_tokens.sql`.
On someone else's page, tapping a badge in their Working On list offers THEY HELPED ME (counts at once, since the helped person is saying it) and WE MET UP (waits for their yes), with no whisper needed: `cr_vouch_from_profile`, `vouches.badge_slug`, `20261107000000_vouch_from_profile.sql`.
Badge requests (`20261107010000_badge_requests.sql`): a badge with `badges.witch_approved` (Take a Hike, Latte Art) is earned by making a post from its Working On entry (`/post?badge=<slug>`, saved in `posts.badge_slug`, marked BADGE REQUEST); a witch's like on that post awards it (trigger `badge_request_liked`).
Badges are two kinds (`badges.kind`, `20261108000000_goals_and_quests.sql`). **Goals** (shown as EPIC QUESTS) are long-term (reply on five different posts, whisper to five people, get ten likes on one post, ...): you pick up to three at a time under EPIC QUESTS (the old WORKING ON), they only count while listed (history counts the moment you list one), and a finished one comes off and asks for a new goal. **Quests** are every other badge, kept in their own QUESTS list: the system gives some out the moment they are true (be in someone's Top 5, fill your Top 5, ...), and the ones a witch approves are done by making a post (`/post?badge=<slug>`) that a witch likes, with no need to list them. New people start with Helping Hand, Joined In and Whisper Web as goals. Goals show how far along they are (`cr_goal_progress`, 3/5), and there are more long-term ones (streaks, different days, different people; `20261108010000_more_goals.sql`). The mana ledger is no longer shown on the profile. A goal only counts events from the moment it was picked (`user_goals.since`, counted by `cr_goal_count`, `20261108020000_goal_counting.sql`), stops when it is dropped, and is not shown as progress unless picked. Goals' how-to text is fixed: a witch can rename one or change its picture only. The portrait menu has PICK GOALS and SEE QUESTS. On your profile QUESTS (8 / 71) sits right under the Top 5: your token, up to five shown badges and a trade icon in a row, with SEE ALL QUESTS → opening the list (and a button there to choose which badges to show). A whisper costs 1 mana (`20261108030000_whisper_one.sql`); reports still cost 2.

## Max mana and badges

Nobody has a flat ceiling any more. `profiles.mana_cap` is each person's own:
10 until they register, then **40**, plus what their badges carry:

| Kind | Worth | How you get one |
| --- | --- | --- |
| Achievement (the eight under BADGES) | +1 max mana each | Doing things the app can see: a first post, five replies, five votes... |
| Tradable | +2 max mana each | Every five confirmed "I helped them" vouches, one is drawn at random from the 48 in `badge_kinds` (art under `public/badges/tradable/`). The heart on A HELPING HAND shows `x/5` towards the next, in white pixels. One more a year on your birthday, drawn the same way. |
| Token | +7 max mana each | Someone gives you theirs. |

Three of the achievements **step up** with use. JOINED IN (replies on
different people's posts), WHISPER WEB (people whispered to) and A VOICE IN
COUNCIL (votes cast) are earned at five and go to tier II at ten, III at
twenty-five and IV at fifty (`badge_tier_for` and `user_badges.tier`, from
`supabase/migrations/20261028070000_badge_tiers.sql`). The ladder is not
advertised: the badge says five, and steps up on its own. A step up is
announced once like a new badge ("A badge stepped up: JOINED IN II") and
shows on the badge: the numeral after its name, one pip lit per tier along
the bottom of the frame, and from II a ring round it (blue, purple, magenta).
A tier is a mark, not mana: the badge is worth one max mana at any tier.

**Birthday badges.** On their birthday, or the first time they open the app
after it has gone by, everyone with a birthday on the registry gets one
tradable badge drawn at random from the same pool, worth the same two max
mana, with a HAPPY BIRTHDAY toast. Once a year, never twice. The app layout
asks `cr_birthday_badge` only when the profile says one could be due
(`profiles.birthday_badge_year` is the last year given), and the function
checks again itself. `badge_items.occasion` says whether a tradable badge
was for helping or for a birthday, and only the helping ones count against
the five-helps rule, so a birthday badge never costs anyone a helping-hand
badge. A 29th of February falls on the 28th. Birthdays that had already gone
by when the feature shipped do not count. Anyone registered before the form
asked for a birthday has none on record, and gets nothing until they set one
on `/me/edit`; the migration is
`supabase/migrations/20261029020000_birthday_badges.sql`.

A **token** is the badge a person designs for themselves on `/me/token`: a
badge shape (circle, framed circle, shield, diamond, plate, hexagon, each with
or without a rim band, at full size or three quarters or half) in their
colours, and items from the uploaded set
(`public/badges/items/`), added from a sheet and placed by dragging them on a
stage, up to five at a time, each of which can be flipped, turned in steps of 45
degrees (so the diagonals work too), shrunk from 100 to 55 percent in steps of
fifteen, and layered. The editor is the badge on a stage with a + on its left and, once an icon is picked, that
icon's tools down its right: take it off, up and down the layers, turn right and turn left
by 45 degrees, and flip, all small buttons with no words on them. The + offers ADD ICON (the
icon picker) and SHAPE (the shape, the badge's size, and the badge and frame colours).
Icons can be made bigger in steps of a quarter, up to double or as far as the picture has room for (a diagonal turn needs more room, so a turn can cut the size back), and smaller again, but never below as drawn. Older designs that were shrunk keep the size they had. The badge shape is
itself a layer, so moving an icon down past it puts it behind the badge (only what hangs out
past its edge shows), and a token can have no shape at all. In the data this is `order` (the
draw order of the five slots) and `under` (how many of the first ones sit under the shape).
The stage has no card behind it, and shrinks in whole cells on a narrow phone so it always
fits between its two columns. Whole turns move the pixels; a diagonal turn is rotated at four
times the size and brought back down by each cell's commonest colour, so small pixel art stays
solid. Designs saved before this (quarter turns, two or three icons, "on top" or a behind flag
on each icon) are read as they were and render identically. The shape is
drawn small on purpose, the middle 22 of the picture's 32 cells: an item at
its drawn size already reaches the rim, one dragged outward hangs over it
(hilts and points past the edge), a shrunk one sits inside like heraldry; an
item can go to the edge of the picture and no further. It is named
"<Character's first name>'s Token". `/token/<packed>.png` draws one the way
`/face` draws a face: the URL describes the whole picture, so it caches
forever (`lib/token.ts` packs it, `lib/token.server.ts` paints it). Giving
your token mints a copy for the other person, with the design as it was that
day, and the next one is six months away; the trade form says so before you
do it.

**Trades** (`/u/[handle]/trade`, answered on `/me/trades`): one of your
badges or your token, for one of theirs or for nothing. The other person sees
the offer at the top of their screen and nothing moves until they say yes;
`cr_answer_trade` moves the rows in one transaction, and the triggers on
`badge_items` and `user_badges` call `cr_recount_cap` so both ceilings are
worked out again on the spot (mana above the new ceiling comes down to it).
Trading a tradable badge away does not earn you another: `badge_items.earned_by`
remembers who it was minted for. The migration is
`supabase/migrations/20261027000000_badges_max_mana_birthday.sql` (tokens went
from 10 to 7 in `20261028000000_token_mana_7.sql`); it also adds
`profiles.birthday` (a date between the years 1026 and 2026, asked on the
welcome page) and keeps the person's own name with the registry answers, where
only witches read it.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in the two values
npm run dev
```

## Deploying

The repo is linked to the `crystr` Vercel project on the VLVT team. Pushing to
`main` deploys it. The build runs with webpack (`next build --webpack`) and the
three fonts (Inter, Pixelify Sans, and the label face) ship in `app/fonts/` rather than
being fetched from Google, so a deploy never depends on a font host being
reachable. The City's address is `crystr.app`; `cryster.app`, `www.cryster.app` and
`www.crystr.app` redirect there (308, path kept) from `proxy.ts`, and `crystr.vercel.app`
is redirected by a Vercel domain setting. The label face is Jersey 10 with its lower case folded onto the capitals
and renamed Crystr Label (`app/fonts/crystr-label.woff2`, built from the Fontsource
file with fontTools, with its C and G redrawn with a wider opening so they never read
as O); it replaced Silkscreen, whose C, O and G are nearly one shape.

**Database changes** are the files under `supabase/migrations/`, in name order,
and the repo is the record of what has been applied: most were run by hand in
the Supabase SQL editor, so the project's own migration history is incomplete
and, where it has entries, names them by the time they were run rather than by
file. Do not `supabase db push` against the live project, which would try to
replay the hand-run files; apply a new migration by pasting it into the SQL
editor (or through the Supabase MCP tool) and leave the older ones alone. They
are written to be safe to run twice (`if not exists`, `or replace`), but there
is no reason to.

**Source art** that is not served lives under `assets/`: the Portrait Maker
sheets in `assets/portrait/`, the archive of the achievement-badge set in
`assets/badges/achievement/` (its 299 pictures are served now, from
`public/badges/set/`), the rune sheets in `assets/runes/`, and `assets/mana.jpg`.
What the app serves is under `public/`.

## Portraits

`/me/avatar` builds a face from the Portrait Maker sprite sheets, in a UI that
mirrors the tool the art was drawn for — shape steppers and colour swatches,
preview pinned to the top. 26 jaws, 26 eyes, 28 mouths, 16 noses, 15 brow
sets, 14 ear shapes, 13 beards; hair as two controls, 26 sides and 26
tops (the artist's 27 styles less the receding hairline); then scars (5), freckles and marks (8), horns (2), eyewear (7),
jewellery (3, in two slots so a face can wear a nose ring and a brow ring at
once), earrings (10), eyeshadow (6); and FACING, left as drawn or mirrored
right — the whole composed frame flips, so every layer swaps sides together.
Colour pickers for skin, hair, eyes and background.

The source is fifteen 128x128 sheets on a 6-wide grid, and cells line up **by
grid position across sheets**: `HairBack/07` is the back of the same hairstyle
as `HairFront/07`, `pupils/13` belongs in `Eyes/13`. That pairing is what the
manifest encodes, so one choice always draws its whole self rather than, say,
a pupil floating without its socket.

The tool's own MISC control paired the same way, and that was worth undoing:
index N from the skin-marks sheet drew *with* index N from the worn-things
sheet, so antlers came welded to an eye scar and an eyepatch to heavy
freckles. Those two sheets are read cell by cell instead and sorted into their
own controls, and the compositor lets one sheet contribute several cells to a
face. Run `node scripts/build-portrait-manifest.mjs` after changing the asset
set.

**Hair is two controls: the sides of the head and the top of it.** The
sheets give hair as `HairBack` (crown, sides and length, one painted piece)
and `HairFront` (hairline and fringe), paired by index into 27 styles. The
top of a head is the back cell above the skull's curve plus the front
cell; the sides are the rest of the back cell. `scripts/build-hair-crown.mjs`
cuts every back cell along that line into `HairCrown/NN` and `HairSides/NN`
(they add back up to the original exactly), and TOP draws the crown and
the front of one style together — so a top is a whole top, fringe
included, and swapping it puts the bun over the long hair, the blunt
bangs over the braid, the slicked top over the shaved sides.

Two shapes painted for different silhouettes don't agree along the cut,
so the script scores every top against every sides along the part of the
cut the face doesn't cover (the jaw; the skull draws under the hair), and
a pair is offered when three things hold: the sides don't stick out from
under the top by more than three pixels (a shelf); the top doesn't stop at
the cut more than seven pixels out from the skull with nothing under it (a
slab in the air — the big dome and the messy bun over a short side); and
the shading doesn't jump across the line, under 25 on average. Hair that
stops at the cut close to the skull isn't counted against a pair: at this
row that's a high fade, and it reads as one, which is how a short top sits
on the curly sides that are a few curls at the nape, and on no sides at
all — a mohawk over a shaved head. 120 pairs beyond the styles' own, and
seven tops that sit on nothing. The pairs live in
`assets/portrait/_crown-pairs.json` and the manifest as `TOPS`. The
builder keeps the originals one tap away: while top and sides match,
stepping the sides moves the top with them; change the top on its own and
they stay split, until you reach sides it won't sit on. Faces nobody has
built keep the artist's pairings 75% of the time so the feed doesn't fill
with buns on bobs. Older faces migrate: one saved when hair was one
control maps its id to both; one saved when it was a back and a front (or
a back, a crown and a front) keeps the top of the style it had chosen
where that sits on its sides, and wears the sides' own otherwise.

A first version split the front and the crown separately, with the crown
cut at the skull's midline. It swapped too little (a fringe on its own) and
cut through too much: the mohawk's crest, the undercut's side mass, the
bob's highlight band all straddled the line and needed hand locks. Moving
the cut up to where the skull stops curving in, and taking the fringe with
the top, made the score sufficient on its own.

**Earrings** are the one thing drawn rather than sliced: five designs in two
metals, a handful of pixels each in the sheets' own metal tones, hung from
the lobe of each of the 14 ear shapes (`scripts/build-earrings.mjs` finds
the lobe as the ear cell's lowest opaque row). The option's cell is a
template — `Earrings/hoop-gold-{ears}` — and the compositor fills `{ears}`
from the face, so the earring follows the ear. They draw right after
`EarsFront`, under the hair, so a style that falls over the ear covers them.

**Eyeshadow** works the same way, per eye shape: `scripts/build-eyeshadow.mjs`
finds each Eyes cell's upper lash line (per column, the topmost dark pixel)
and tints the four rows above it, strongest at the lashes and fading up. It's
translucent, so the lid's own shading shows through. Six colours, drawn over
the eye and under the brows. Lipstick and blush were mocked up alongside and
not taken: lipstick worked (the lip tones re-ramp like hair does) but wasn't
wanted; blush went muddy on the fantasy skins.

**Below the jaw, nothing.** The sheets stop mid-neck — all 26 jaws end at the
same 20px stub — and the portrait ends there too. A body and then a neck were
both drawn to continue it, in the sheets' own palette, and neither ever read
as belonging to the head. Anything added under a face this well painted has
to be painted as well, and generated pixels weren't. So the crop is tight to
the head and the stub is the artist's own last row.

**Recolouring.** The art is drawn in one fixed palette and the tool swaps
specific colours for the player's choice — a replace shader, not a tint. That
is reproduced per pixel in `lib/portrait/core.ts`: eight skin steps, fourteen
hair steps (eyebrows and beard stubble are hair), three pupil steps, and
everything else — sclera, lips, metal, bone — left exactly as drawn, which is
why the tool offers exactly three colour pickers plus a ground.

Each ramp is rebuilt around the chosen colour, keeping every step's lightness
distance from the anchor so the shading survives the swap, but **squeezed to
fit** rather than clipped: the brightest hair step sits a long way above its
base, and given the full offset a light blond blows out to cream and puts a
beige cap on every head. Two traps worth naming — `#d3bea8` is the flat scalp
the `Cranium` layer paints, and the antler and horn tones are bone, so they
stay out of the hair ramp.

The palette is one table per face, and the artist's wasn't, quite: a few
colours mean one thing on the face and another inside one layer.
`LAYER_ALIASES` in `lib/portrait/core.ts` handles those per layer — `#845e4b`
is the skin's deepest step everywhere except in the brows, where it's the
brow's own lighter hairs and follows the hair colour instead. (On pale skin
the skin step re-ramps to orange-brown, and the brows went orange.)

The scalp is a choice — SCALP: SKIN, STUBBLE (75% hair colour over skin) or
HAIR — because an undercut's shaved side is shaved hair, not a bald patch,
and bald plus STUBBLE is a buzz cut. It's applied by the compositor to the
`Cranium` layer only, not as a palette entry: the jaws use the same
`#d3bea8` for a patch of lower-cheek shading, and as a palette entry the
buzz greyed the cheek too. Faces saved before it was a choice keep what
they looked like — stubble under hair, skin when bald.

`/face/<render>.<packed>.png` composes a portrait and caches it immutably.
The URL fully describes what it draws — a changed face is a changed URL — so
there is no lookup, no auth, and nothing identifying in the path. The leading
segment is `RENDER` in `lib/portrait/core.ts`; bump it whenever the palette,
draw order, frame or art changes, or every browser keeps serving the old
picture out of its year-long cache. The frame is 120x120, cropped tight to
the head: the 128x128 sheet art lands at the `ART` offset with the tallest
hair against the top.

Anyone who hasn't built a face gets one derived from their user id, which is
a real config, so opening the builder starts you on the face the rest of the
app has been showing. There is no upload: every face in the City is built
here. (`profiles.portrait_url` and the `avatars` bucket are left over from
when there was one, and are unused.)

**Artwork:** the Portrait Maker sheets under `assets/portrait/`, sliced from
the originals kept in `assets/portrait/_sheets/`. This is paid art — check its
licence covers redistribution before this repo goes public, and serve the
cells from the Supabase bucket instead if it doesn't.

## Wiki pages under pages

A page can sit under another (`wiki_pages.parent_id`), to any depth: MORDLs holds
Orcs, Humans and Goblins; The Forsaken holds Planar and Undead, and Undead holds
Zombies, Vampires and Banshees. On the shelf (`/wiki`) each page is one card, and the pages under it are
folded inside the card under a count and open with a click (as darker cards of their own); on the page itself they are listed at
the bottom and also turn up inside the rune text as links, each at a spot of its
own. Anyone adding a few words to a page can instead start a new page under it
for 40 mana (`cr_wiki_add_subpage`), with those words as its first fact, on the
shelf at once. Witches pay nothing, for that or for adding a fact, and their
facts are kept at once. Witches start pages under others from the new-page form, move a
page under another or out on its own (`cr_wiki_set_parent`, which refuses a
loop), and put a page's facts and sub pages in order with the arrows on the
moderation tile (`cr_wiki_move_fact`, `cr_wiki_move_page`; `wiki_pages.sort`).

Low on mana, the wiki breaks numbers first (a digit or two from each run of
three or more) and only lower still starts eating letters; with mana to spare,
and for witches, it reads clean (`lib/wiki-mask.ts`).

## Replies

A reply is a post with a `parent_id`, written by `cr_create_reply` at the price
of a post (5 mana, 3 more with an image). One level only: replying to a reply
attaches to the post at the top of its thread, so a thread is a post and a flat
list under it. The timeline shows top-level posts only, with a reply count on
the REPLY button; tapping a post or REPLY opens `/thread/[id]`, replies oldest
first, with the reply box. Deleting a post deletes its replies. The migration is
`supabase/migrations/20261005120000_replies.sql`; it is additive, so the old app
keeps working until the new one ships.

## Still placeholder

Images are striped tiles with a monospace label, as in the prototype — posts
and article banners record *that* there's an image but there's nowhere to
upload one yet (quest proofs do upload, to the `proofs` bucket). The prototype's
feed-layout and pixel-intensity variation knobs are baked to their defaults
(Roomy cards, Subtle).

The token maker offers 117 icons: the 69 plain ones and, added after them so existing tokens are unchanged, the 48 tradable badge pictures (`t-<name>`, files in `public/badges/tradable`; `itemSrc` in `lib/token.ts` says where each lives).

The badge picture set (`public/badges/set/`) is the 299 first served plus picture 100 (which had been missed) and 210 more (300 to 509) picked from the 1,015 in the achievement archive for the quests we have: trees, sun, moon, stars, water, fire, music, books, animals, food and drink, maps and boots, hands and hearts. The combat, monster and sci-fi pictures were left out. `SET_COUNT` in `lib/badges.ts` and the limit in `cr_badge_save` say how far it runs.
