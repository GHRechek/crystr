# CRYSTR

A minimal starter: Google sign-in, an auto-created profile on first login, a
basic feed of everyone's profiles, and a page to edit your own.

CRYSTR is deliberately isolated from VLVT.NET — separate GitHub repo, separate
Vercel project, separate Supabase project/database. The only thing the two
apps share is the Google OAuth client used for login, so someone with a VLVT
account can sign in here with the same Google account, but they land as a
brand-new CRYSTR profile — nothing about their VLVT data is read, copied, or
referenced.

## How a profile gets created

There's no signup form. The `profiles` table has a database trigger
(`on_auth_user_created`) that fires the moment Supabase Auth creates a new
`auth.users` row — i.e. the first time a given Google account signs in to
*this* app. It inserts a starter profile (a random default handle, plus
whatever name/avatar Google provided) that the person can then edit from
Settings.

## Environment variables (set these in Vercel, and in `.env.local` for local dev)

- `NEXT_PUBLIC_SUPABASE_URL` — CRYSTR's Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — CRYSTR's Supabase anon/publishable key

Both come from the CRYSTR Supabase project's Settings → API page (this is a
different project than VLVT's — double check you're copying from the right
one).

## Google OAuth setup (one-time, in two places)

1. **Google Cloud Console** — open the OAuth client already used for VLVT and
   add this app's callback URL to its Authorized redirect URIs:
   `https://<your-crystr-supabase-project-ref>.supabase.co/auth/v1/callback`
2. **Supabase → Authentication → Providers → Google** (on the CRYSTR project)
   — enable it and paste in that same Google OAuth Client ID and secret.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in the two Supabase values above
npm run dev
```

## Deploying

This repo is already linked to a Vercel project (`crystr`, on the VLVT team).
Once the env vars above are set in Vercel and this code is pushed to `main`,
it deploys automatically.
