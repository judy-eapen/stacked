# Stacked

Atomic Habits companion app. Phase 1: sign up, Habit Scorecard, and Identity statements.

## Stack

- Next.js 14 (App Router)
- Tailwind CSS
- TypeScript
- Supabase (auth, Postgres, RLS)

## Run locally

```bash
cd stacked-auth-demo
npm install
cp .env.local.example .env.local
```

Edit `.env.local` and set:

- `NEXT_PUBLIC_SUPABASE_URL` — from Supabase Dashboard → Project settings → API
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon/public key from the same page

Then:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supabase setup (first time)

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Run the Phase 1 migration: Supabase Dashboard → SQL Editor → paste contents of `supabase/migrations/20260220100000_phase1_schema.sql` → Run.
3. Authentication → Providers: enable Email; optionally enable Google and add Client ID/Secret from Google Cloud Console. In URL configuration, add redirect URL(s) (e.g. `http://localhost:3000/auth/callback`).

## What’s in the app

- **Auth:** Sign up / log in (email+password or Google), forgot password, display name after signup.
- **Dashboard:** Scorecard (list habits, rate +/−=, add/edit/delete), Identities (create/edit/delete identity statements), Settings (display name, sign out).
- **Guarded routes:** `/dashboard/*` and `/display-name` require auth; unauthenticated users are redirected to login.

## Scripts

| Command        | Description              |
|----------------|--------------------------|
| `npm run dev`  | Start dev server         |
| `npm run build`| Production build         |
| `npm run start`| Run production build     |

## Keeping this README up to date

When you add env vars, new scripts, or major features, update this file so new contributors and your future self can run and understand the project without guessing.
