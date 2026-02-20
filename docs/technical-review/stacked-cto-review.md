# Technical Review: Stacked — Build Habits That Compound

**Reviewed:** 2026-02-19
**PRD:** `docs/prd/atomic-habits-companion-prd.md`
**Verdict:** Sound architecture, ready to build — with 6 technical issues to fix before or during implementation.

## Executive Summary

The PRD is thorough and well-structured. The tech stack (Next.js + Supabase + Vercel) is the right choice for a solo developer building a CRUD-heavy web app with auth and real-time needs. The phasing is logical. The data model covers the domain well. There are six technical issues ranging from "fix before you start" to "fix when you get to that phase." None are blockers, but addressing them early will save rework.

## Recommended Approach

Build as proposed. The monolithic Next.js + Supabase architecture is correct for this scale. No need for separate API servers, microservices, or complex infrastructure. The PRD's decision to use Supabase client SDK with Row Level Security (instead of building a REST API for every entity) is the right call — it's less code, fewer bugs, and security is enforced at the database level.

## Why This Approach

- **Right-sized for the audience.** 5-20 users, solo developer, learning project. A monolith with managed services (Supabase, Vercel) eliminates infrastructure overhead.
- **Supabase handles the hard parts.** Auth, database, row-level security, real-time subscriptions, and backups come free out of the box.
- **One codebase, one deploy.** Next.js API routes + frontend in a single repo, auto-deployed via Vercel from GitHub. No CI/CD to configure.

## Alternatives Considered

| Option | Why we're not choosing it |
|--------|---------------------------|
| Notion/Airtable template | Gets 60% of the way there in a day, but no custom streak logic, no accountability partner UX, and the user explicitly wants to build for learning. |
| Separate backend (Express/Fastify) | Unnecessary infrastructure. Supabase + Next.js API routes cover every server-side need. |
| Firebase instead of Supabase | Firebase's security rules are harder to reason about than Supabase RLS. Supabase gives you raw PostgreSQL, which is more powerful and portable. |
| React SPA (Vite) instead of Next.js | Would work, but loses SSR for the public landing page and API routes. Next.js is a better fit since Vercel is already chosen. |

## Technical Issues to Fix

### Issue 1: Polymorphic stack_anchor is a data integrity risk (Fix before Phase 2)

**What the PRD says:** The `habits` table has `stack_anchor_id` (uuid) and `stack_anchor_type` (enum: 'scorecard_entry' or 'habit'). This is a "polymorphic association" — one column points to two different tables.

**Why it's a problem:** PostgreSQL cannot enforce a foreign key constraint on a column that might reference two different tables. This means:
- If someone deletes a scorecard entry, any habit stacked on it keeps a dangling reference (points to a row that no longer exists).
- Application code must handle "which table do I look up?" logic everywhere the stack anchor is used.
- Bugs here are subtle and hard to catch.

Think of it like having a phone number on your fridge that could be either the plumber OR the electrician, but you didn't write down which one. When you call it and someone answers, you have to guess.

**Fix:** Replace with two separate nullable foreign key columns:

```
stack_anchor_scorecard_id  uuid  FK -> scorecard_entries.id  ON DELETE SET NULL
stack_anchor_habit_id      uuid  FK -> habits.id             ON DELETE SET NULL
```

Add a CHECK constraint: at most one can be non-null. This gives you real foreign key enforcement, cascade behavior (if the anchor is deleted, the reference is automatically set to null), and simpler queries.

**Effort:** Small. Change the schema before Phase 2 starts.

---

### Issue 2: Streak calculation will be slow on the Today view (Fix during Phase 3)

**What the PRD says:** The `/api/habits/today` endpoint calculates streaks by scanning `habit_completions` for every active habit.

**Why it's a problem:** To compute "never miss twice" streaks, you need to walk through every completion record for each habit, checking for two consecutive misses. For 20 habits with a year of history, that's ~7,300 rows scanned on every page load. The Today view is the most-used screen in the app — it needs to be fast.

Think of it like counting your exercise streak by flipping through every page of your calendar going back a year, every single morning. It works when you just started, but gets slower over time.

**Fix:** Add two columns to the `habits` table:

```
current_streak     integer  DEFAULT 0
last_completed_date  date     DEFAULT null
```

Update these on every completion/uncompletion. The Today view becomes a simple SELECT with no aggregation. Only recalculate streaks from history when a user backfills past dates (which is rare).

**Effort:** Small. Add the columns in the Phase 3 migration. The streak update logic goes in the completion endpoint.

---

### Issue 3: Supabase Auth cookie handling needs clarification (Fix in Phase 1)

**What the PRD says (Section 8, Security):** "Auth tokens managed by Supabase SDK (httpOnly cookies)."

**Why it's a problem:** This is only true if you use `@supabase/ssr` — the server-side auth package for Next.js. The default `@supabase/supabase-js` client stores tokens in **localStorage**, which is NOT httpOnly and is vulnerable to XSS (cross-site scripting).

Think of the difference: httpOnly cookies are like a sealed envelope the browser carries — JavaScript can't peek inside. localStorage is like writing your password on a sticky note on your monitor — any script on the page can read it.

**Fix:** Use `@supabase/ssr` for the Next.js integration. This stores auth tokens in httpOnly cookies automatically. The Supabase docs have a Next.js-specific setup guide. Make this the standard from PR-1 (project setup).

**Effort:** None extra — it's just picking the right package during initial setup.

---

### Issue 4: Phase 6 bundles three unrelated integrations (Fix before Phase 6)

**What the PRD says:** Phase 6 includes email reminders (Resend), push notifications (OneSignal), AND Google Calendar sync (Google API) in a single phase.

**Why it's a problem:** These are three separate external services with different auth flows, different failure modes, and different testing requirements. If Google Calendar OAuth breaks, you don't want it blocking email reminders from shipping. The PRD's own phasing rule says "each phase must deliver user-visible value and be testable independently."

**Fix:** Split into three sub-phases:
- **Phase 6a — Email reminders (Resend):** Daily check-in email, weekly summary, notification preferences, cron job. Ships independently.
- **Phase 6b — Push notifications (OneSignal):** Browser push, per-habit toggle, OneSignal SDK. Ships independently.
- **Phase 6c — Google Calendar sync:** OAuth flow, event creation/update/delete, calendar_connections table. Ships independently.

This lets you ship email reminders (highest impact for retention) first, without waiting for Google Calendar OAuth to be working.

**Effort:** Zero code effort — it's just a planning change.

---

### Issue 5: Google Calendar token encryption is under-specified (Fix before Phase 6c)

**What the PRD says:** Store `google_refresh_token` as "Encrypted at rest" in the `calendar_connections` table.

**Why it's a problem:** Supabase doesn't offer column-level encryption natively. "Encrypted at rest" for the full database is a Supabase Pro feature ($25/month). On the free tier, you'd need to:
- Encrypt the token in application code before inserting
- Decrypt after selecting
- Store the encryption key in environment variables
- Handle key rotation

This is doable but non-trivial, and the PRD doesn't specify the approach.

**Options:**
1. **Supabase Vault** (if available on your plan) — built-in secrets management. Simplest.
2. **Application-level encryption** — use Node.js `crypto` module with AES-256-GCM. Encrypt before insert, decrypt after select. Key in `ENCRYPTION_KEY` env var.
3. **Defer Google Calendar** — if this feels like too much for a learning project, ship email and push first, add calendar sync later when you're comfortable with encryption patterns.

**Effort:** Medium. Needs a utility function for encrypt/decrypt and careful key management.

---

### Issue 6: Supabase free tier pauses after inactivity (Awareness)

**What the PRD says:** Supabase free tier is the database and auth provider.

**What it doesn't say:** Supabase free tier projects **pause after 1 week of inactivity**. When paused:
- Your database is offline
- Auth stops working
- Cron jobs (email reminders) stop running
- Users see errors

For a personal project used daily by you and friends, this probably won't trigger (daily usage keeps it alive). But if there's a week where nobody logs in (vacation, holidays), the app goes down silently.

**Mitigations:**
- Set up a simple health check ping (a Vercel Cron job that hits Supabase once a day) to keep the project active.
- If you monetize, upgrade to Supabase Pro ($25/month) — no auto-pause.
- Be aware that Phase 6 cron jobs (email reminders) depend on the project being active.

---

## Additional Observations (Not Blockers)

### Habit completion pattern: pick UPSERT

The PRD says "To uncheck, set `completed = false` or delete the row." Pick one. Recommendation: always UPSERT (insert or update on conflict). One row per habit per day, toggle the `completed` boolean. Simpler code, consistent data, and the unique constraint does the heavy lifting.

### Missing: display_name collection flow

The `profiles` table requires `display_name`, but Supabase auth sign-up doesn't collect it. You need either:
- A post-signup onboarding step ("What should we call you?")
- Pull it from Google OAuth profile data (for Google sign-in)
- Make `display_name` nullable and prompt on first visit

Add this to the Phase 1 spec.

### Missing: account deletion

Not needed for friends-only, but if you ever go public, GDPR and CCPA require users to be able to delete their account and all associated data. Worth noting as a future requirement. Supabase cascading deletes from `profiles` would handle most of it if foreign keys are set up with `ON DELETE CASCADE`.

### sort_order reordering

Multiple tables use integer `sort_order`. Reordering means updating every row after the insertion point. For small lists (< 100 items per user), this is fine. If lists grow, consider fractional indexing (lexicographic sort keys) later — but don't over-engineer this now.

---

## Phased Build Plan Assessment

The PRD's phasing is sound. Each phase delivers independent value:

| Phase | Assessment |
|-------|-----------|
| Phase 1 (Auth + Scorecard + Identities) | Correct starting point. Delivers the awareness step. |
| Phase 2 (Habit Design) | Correct second step. Depends on Phase 1 entities. |
| Phase 3 (Daily Tracker) | This is the phase that makes the app a daily-use tool. Most critical for retention. |
| Phase 4 (Review & Reflect) | Good separation. Depends on completion data from Phase 3. |
| Phase 5 (Accountability Partner) | Correctly deferred — social features add RLS complexity. |
| Phase 6 (Notifications + Calendar) | **Split into 6a/6b/6c** (see Issue 4). Otherwise correct to defer external services. |

**Build order is correct.** No changes recommended.

**Note on Phase 3 priority:** Phase 3 is the make-or-break phase. If the Today view is fast, satisfying, and frictionless, users will come back. If it's slow or clunky, they won't. Invest extra care here — optimistic updates, skeleton loaders, sub-300ms completion toggle.

---

## Key Technical Decisions (Agreed)

| Decision | CTO Assessment |
|----------|---------------|
| Next.js + Supabase + Vercel | Correct for scale, solo dev, learning goals |
| Supabase RLS for auth | Correct. Database-level security is the right layer. |
| Client SDK + RLS (not REST API for CRUD) | Correct. Less code, same security. |
| "Never miss twice" streak | Great product choice. Needs the denormalized streak column (Issue 2) for performance. |
| TanStack Query for caching | Correct. Industry standard for React server state. |
| No gamification | Agree. Stay true to the methodology. |
| Mobile-first | Correct given daily check-in use case and future native app plans. |

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Supabase free tier auto-pause | Medium | High (app goes down) | Daily health check ping via Vercel Cron. Upgrade to Pro if monetizing. |
| RLS policy bugs (data leaks to partners) | Low | High (privacy) | Write RLS integration tests in Phase 5. Test with two user accounts. |
| Streak calculation performance degrades over time | Medium | Medium (slow Today view) | Denormalize streak onto habits table (Issue 2). |
| Google OAuth token security | Low | High (if token leaked) | Use application-level encryption with env var key (Issue 5). |
| Scope creep during build | Medium | Medium (delays) | Strict PR scoping per execution plan. No features not in PRD. |
| OneSignal SDK conflicts with Next.js service worker | Low | Medium (push breaks) | Test early in Phase 6b. OneSignal has Next.js docs. Have a fallback plan (raw Web Push API). |

---

## Open Questions for Engineering

1. **Which Supabase auth package?** Use `@supabase/ssr` (not just `@supabase/supabase-js`) for proper cookie-based auth in Next.js. Confirm this in PR-1.
2. **Streak storage pattern:** Denormalize `current_streak` and `last_completed_date` onto the `habits` table? (Recommendation: yes.)
3. **Completion toggle: UPSERT or delete?** Recommendation: UPSERT (always keep the row, toggle boolean).
4. **Display name collection:** Onboarding step after first login, or pull from Google profile? Both?
5. **Encryption library for Google Calendar tokens:** Node.js `crypto` (AES-256-GCM) or Supabase Vault?

---

## PRD Suggestions

1. **Fix polymorphic stack_anchor** — Replace `stack_anchor_id` + `stack_anchor_type` with two nullable FK columns (Issue 1). Update the Habit entity in Section 4.
2. **Add `current_streak` and `last_completed_date` to Habit entity** — Denormalize for performance (Issue 2). Update Section 4 and the streak API contract in Section 5.
3. **Specify `@supabase/ssr`** — In the Authentication section (5), note that the Next.js integration uses `@supabase/ssr` for httpOnly cookie auth, not just the base client SDK (Issue 3).
4. **Split Phase 6 into 6a/6b/6c** — In Section 7 (Issue 4).
5. **Add display_name collection** — Add a user story to Phase 1: "As a new user, I want to set my display name after signing up so my partner can identify me."
6. **Add Supabase keep-alive note** — In Section 8 (Reliability), note the free tier auto-pause risk and the Vercel Cron mitigation.
7. **Pick UPSERT for completions** — In the Habit Completion entity notes, specify UPSERT as the pattern (not "delete or set false").

---

## TL;DR

The PRD is solid. The stack is right. The phasing is logical. Fix the six issues above — most are small schema or configuration changes. The biggest wins are: (1) fix the polymorphic stack anchor before Phase 2, (2) denormalize streaks before Phase 3, and (3) use `@supabase/ssr` from day one. Everything else can be addressed when you reach the relevant phase.

Ready to build.
