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
2. Run migrations in order (Supabase Dashboard → SQL Editor → paste each file’s contents → Run). Minimum for core app:
   - `supabase/migrations/20260220100000_phase1_schema.sql`
   - `supabase/migrations/20260220110000_profiles_insert_policy.sql`
   - `supabase/migrations/20260220120000_scorecard_identity_id.sql`
   - `supabase/migrations/20260220140000_habits_table.sql`
   - `supabase/migrations/20260220150000_habits_design_build.sql`
   - `supabase/migrations/20260220160000_habits_to_break.sql`
   - `supabase/migrations/20260220170000_add_habit_id_to_habits_to_break.sql`
   - `supabase/migrations/20260220170000_weekly_review_ratings.sql`
   - `supabase/migrations/20260222100000_habit_completions.sql`
   - `supabase/migrations/20260223100000_reviews.sql`
   - `supabase/migrations/20260224100000_partnerships.sql` (required for Partners page)
   - `supabase/migrations/20260224110000_habit_contracts_and_partner_rls.sql`
   - `supabase/migrations/20260224120000_partnerships_rls_accept.sql`
   - `supabase/migrations/20260229100000_partner_checkin_shares.sql` (for Today → Share → Send to partner)
   - Then any remaining migrations in `supabase/migrations/` by filename order.
3. **Partners page:** If you see "Could not find the table public.partnerships", the `partnerships` table is missing. Run the three partnership migrations above (20260224100000, 20260224110000, 20260224120000) in order; if you have not run earlier migrations (e.g. profiles, habits), run those first.
4. Authentication → Providers: enable Email; optionally enable Google and add Client ID/Secret from Google Cloud Console. In URL configuration, add redirect URL(s) (e.g. `http://localhost:3000/auth/callback`).

## Production (deployed) auth

For the deployed app (e.g. Vercel), Supabase must allow your production URL:

1. **Supabase Dashboard** → **Authentication** → **URL configuration**.
2. **Site URL:** set to your production URL (e.g. `https://stacked-dusky.vercel.app`). Do not leave this as `http://localhost:3000` if you use the same project for production.
3. **Redirect URLs:** add your production callback URL exactly, e.g. `https://stacked-dusky.vercel.app/auth/callback`. Or use a wildcard for Vercel: `https://*.vercel.app/auth/callback` (or `https://*-.vercel.app/**` per Supabase docs).
4. **Vercel:** set env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and **`NEXT_PUBLIC_APP_URL`** to your production URL (e.g. `https://stacked-dusky.vercel.app`). The app uses `NEXT_PUBLIC_APP_URL` for OAuth redirect URLs so Google sends users back to the deployed app, not localhost.

If Google sign-in works locally but not in production, check: (1) production callback URL is in Supabase Redirect URLs, (2) Site URL is not localhost, (3) `NEXT_PUBLIC_APP_URL` is set in Vercel to your production URL.

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
