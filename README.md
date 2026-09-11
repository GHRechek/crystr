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
| `/me`, `/me/edit`, `/me/avatar` | MySpace-shaped profile: mood, about, Top 8, the mana ledger, and the portrait builder. |
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

There is no avatar upload. `/me/avatar` builds a face out of layers — skin,
ears, nine hair styles, hair and eye colour, brows, eyes, nose, mouth, face
markings, horns/antlers/circlet, worn items, collar, ground — drawn as SVG on
a 64×64 grid with integer coordinates and `crispEdges`, so it reads 16-bit and
stays sharp at 28px in a whisper list. The choices live in
`profiles.avatar_config`; nothing is uploaded and nothing is stored as a file.
The artwork in `lib/avatar.tsx` is original, drawn for this app.

A built portrait beats the Google photo; anyone who hasn't made one keeps the
prototype's letter tile.

## Still placeholder

Images are striped tiles with a monospace label, as in the prototype — posts
and article banners record *that* there's an image but there's nowhere to
upload one yet (quest proofs do upload, to the `proofs` bucket). Replies toast
"replies are posts wearing a hat" rather than threading. The prototype's
feed-layout and pixel-intensity variation knobs are baked to their defaults
(Roomy cards, Subtle).
