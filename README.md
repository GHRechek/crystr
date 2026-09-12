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
| `/post` | Compose, with a live cost preview and an image toggle. |
| `/well`, `/well/[slug]` | The five quests and their proof screens. |
| `/whispers`, `/whispers/[id]`, `/whispers/new` | DMs at 2 mana a message. |
| `/me`, `/me/edit`, `/me/avatar` | MySpace-shaped profile: mood, about, Top 6, the mana ledger, and the portrait builder. |
| `/vote`, `/vote/new` | The motion board (open / decided) and the witch-only two-step composer. |
| `/ball`, `/ball/[id]`, `/ball/new`, `/ball/[id]/edit` | Crystr Ball: dispatches, the op-ed review queue, the editor. |

## Witches and players

`profiles.is_witch` is the whole permission model.

- **Witches** table motions (never without a briefing — both rows are written
  in one transaction or neither is), publish dispatches, and approve or return
  player op-eds. On the Ball they get a `VIEWING AS WITCH / PLAYER` switch so
  they can see what a player sees; a player has no switch.
- **Players** file op-eds for 6 mana, which queue as `pending` and reach the
  City only when a witch approves them.

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
`cr_table_motion`, `cr_set_top_friends`), each of which locks the caller's
profile row before reading the balance, so two tabs can't spend the same mana
twice.

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
opening grant of 20 mana that shows up on the ledger.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in the two values
npm run dev
```

## Deploying

The repo is linked to the `crystr` Vercel project on the VLVT team. Pushing to
`main` deploys it.

## Portraits

`/me/avatar` builds a face from the Portrait Maker sprite sheets, in a UI that
mirrors the tool the art was drawn for — shape steppers and colour swatches,
preview pinned to the top. 26 jaws, 26 eyes, 28 mouths, 16 noses, 15 brow
sets, 14 ear shapes, 13 beards; hair as two controls, 27 backs and 27
fronts; then scars (5), freckles and marks (8), horns (2), eyewear (7),
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

**Hair is two controls.** `HairBack` is length and volume, `HairFront` is
hairline and fringe, and the tool paired them by index. Chosen separately
they give 27 × 27 styles for the price of 27 — every one of them the
artist's own pixels. The builder keeps the originals one tap away: while
back and front match, stepping the back moves the front with it; change the
front on its own and they stay split. Faces nobody has built keep the
artist's pairings 70% of the time so the feed doesn't fill with blunt bangs
on afros. A face saved when hair was one control maps its id to both.

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

The scalp is special-cased: bare skin on a bald head, but under any
hairstyle it's buzzed, so it takes 75% hair colour over 25% skin. Without
that, an undercut's shaved side reads as a bald patch. The literal hair
colour was tried and is worse — a shaved side filled with full hair colour
stops being a shaved side. The buzz is applied by the compositor to the
`Cranium` layer only, not as a palette entry: the jaws use the same
`#d3bea8` for a patch of lower-cheek shading, and as a palette entry the
buzz greyed the cheek too.

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

## Still placeholder

Images are striped tiles with a monospace label, as in the prototype — posts
and article banners record *that* there's an image but there's nowhere to
upload one yet (quest proofs do upload, to the `proofs` bucket). Replies toast
"replies are posts wearing a hat" rather than threading. The prototype's
feed-layout and pixel-intensity variation knobs are baked to their defaults
(Roomy cards, Subtle).
