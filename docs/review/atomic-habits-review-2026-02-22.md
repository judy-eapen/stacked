# Atomic Habits Practitioner Review — Stacked App

**Review date:** 2026-02-22  
**Reviewer lens:** Serious Atomic Habits practitioner (identity-based habits, tiny habits, systems > goals, never miss twice, skeptical of gimmicks).

**Evidence gathered from:** PRD (`docs/prd/atomic-habits-companion-prd.md`), app routes and components (onboarding, identities, habits, review, reset), `lib/identityMetrics.ts`, dashboard layout, migrations. No live app run (review based on code and PRD).

---

## 1. Executive Summary (1 page max)

### Overall verdict

Stacked’s **design and intent** are well aligned with Atomic Habits: identity-first, 4 Laws, 2-minute rule, scorecard as diagnostic, weekly review with friction → 4 Laws advice, reset flow. **Execution is incomplete.** The app has no daily check-in surface and no per-day completion data. Without a Today view and `habit_completions`, the core loop (open app → see today’s habits → complete → see identity vote → see streak) does not exist. A practitioner would set up identity and habits once, then have nowhere to actually “vote” daily or see “never miss twice” in action.

### Likelihood of long-term use

**Low in current state.** The parts that would drive daily return (Today view, completion feedback, streak and recovery messaging) are missing. Onboarding and identity/habit design are strong; retention will depend on adding the daily loop.

### Biggest strengths

- **Onboarding:** Identity → one habit (2-min required) → lightweight 4 Laws (cue, reward, bundle) → “Do the tiny version now” → first completion → “You cast 1 vote for [identity]” → optional add identity. Ends with a win and teaches the method.
- **Identity-as-scoreboard:** Identities first in nav; page shows statement, “This week: N votes,” trend, momentum bar, Reinforced by / Undermined by, clear CTAs to Habits. Post-create prompt to add a habit.
- **Habit design:** Quick-add plus full 4 Laws (build) and blockers (break) with deep-links. Supports implementation intention, stack anchor, temptation bundle, 2-minute version.
- **Weekly review:** = / − per habit → friction (Forgot, Hard, Boring, etc.) → 4 Laws–based suggestion → “Apply fix” (e.g. shrink to 2-min). Matches PRD Workflow B.
- **Reset flow:** Pick one habit → shrink 2-min → restart. Good “never miss twice” / recovery entry point.
- **Scorecard placement:** Under Review only (diagnostic + reset), not a daily tracker. Aligns with PRD.

### Biggest risks

- **No Today view.** No route or nav item for “today’s habits.” No one-tap completion, no daily identity vote feedback, no streak or missed-day messaging in a daily context. This is the main gap.
- **No `habit_completions`.** Completions are approximated via `last_completed_date` on habits (one date per habit). No per-day history, no “never miss twice” calculation, no backfill, no completion calendar. Identity “votes this week” count habits with `last_completed_date` in the week (at most one per habit per week), not true daily votes.
- **No `/api/habits/today` or `/api/habits/:id/complete`.** PRD’s Phase 3 APIs are not implemented. Dashboard home and nav point to Identities, Habits, Review only.

---

## 2. Flow-by-Flow Critique

### Onboarding

**What works:** Identity-first (who do you want to become?), single habit with required 2-minute version, 4 Laws in ~60–90 sec (obvious: time/after/location cue; easy: confirm tiny; satisfying: reward; attractive: optional bundle). “Do the tiny version now” → Done → “You cast 1 vote for [Identity].” Step 4: add another identity or go to dashboard. Redirect when zero identities sends new users here. Feels focused and method-aligned.

**Misaligned / gaps:** First “completion” only updates `last_completed_date` and `current_streak` on the habit; no row in `habit_completions`. So the first vote is recorded in a way that doesn’t extend to a real daily system. No explicit “never miss twice” or recovery hint yet (acceptable for step 0).

**Confusion risk:** Low. Copy is clear. Optional “Add another identity later” avoids overload.

**Verdict:** Strong. Main fix is to ensure this completion (and all future ones) write into `habit_completions` once that exists.

---

### Daily (Today view)

**Current state:** **There is no Today view.** Nav is Identities | Habits | Review. Dashboard home links to those three. The PRD’s “Daily Tracker: today view, one-tap completion, never miss twice streak logic” (Phase 3) is not built. The split signup page has a static “Today” mock (list of habits, “14 day streak”) for marketing only.

**Impact:** The identity → habit → vote loop exists only in onboarding. After that, a user has no daily place to open the app, see today’s habits, tap complete, and see “1 vote for [identity].” Streaks, “never miss twice,” missed-day messaging (“You missed yesterday. Do it today and your streak continues”), and welcome-back after 7+ days cannot be delivered without a Today view and completion API.

**Verdict:** Critical gap. Building Today + `habit_completions` + `/api/habits/today` and `/api/habits/:id/complete` is the highest priority for Atomic Habits alignment and retention.

---

### Habits

**What works:** Habits page is the single source of truth: create/edit/delete/archive, identity selector, full 4 Laws (build), stack anchor, implementation intention, temptation bundle, 2-minute version. Blockers (habit to break) per identity with 4 Laws (break). Deep-links: `?identity=…&mode=reinforce|fix&new=1`. Quick-add (name + optional identity) plus “Design this habit” for full methodology. Archived section (collapsed by default) with restore.

**Misaligned / gaps:** No way to “complete” a habit from here for today; that would live in the missing Today view. No completion calendar/heatmap (PRD Phase 3) because there’s no per-day completion data.

**Confusion risk:** Low for someone who knows the method. Concept explainers (PRD) may not be fully in UI; worth checking that 2-minute rule, stacking, temptation bundling have short inline explanations where they appear.

**Verdict:** Solid design and CRUD. Becomes fully effective once Today + completions exist and link back to habit detail (e.g. streak, calendar).

---

### Identities

**What works:** Scoreboard only (read-only summary + CTAs). Statement, “This week: N votes,” trend vs last week, momentum bar, Reinforced by (up to 3 habits), Undermined by (up to 2 blockers), “+ Add reinforcing habit,” “View & fix blockers.” Create/edit/delete identity; after create, one-time “Create habit now” / “Skip for now.” Nav and dashboard put Identities first.

**Misaligned / gaps:** “Votes” are derived from `last_completed_date` in range: count of habits with at least one completion date in the week. So it’s “how many habits got done this week,” not “how many completions (votes) this week.” If the same habit is done every day, it still counts as one vote per week. When `habit_completions` exists, votes should be true completion counts so “12 votes for ‘I am a writer’” is accurate.

**Confusion risk:** Low. “This week: N votes” could be clarified later (e.g. “N completions” or “N votes”) once data is real.

**Verdict:** Structure and UX are right. Back the scoreboard with real completion data when available.

---

### Review

**What works:** Review hub (Review page) explains scorecard as diagnostic + reset and offers: Weekly review, Map your day (scorecard), I’m stuck — reset. Weekly review: rate each habit = or − → friction for − habits → 4 Laws suggestions → Apply fix (e.g. shrink to 2-min, Yes/Later). Reset: pick one habit → shrink 2-min → restart streak. Scorecard lives under Review only; no daily scorecard prompt. Matches PRD Workflows B and C.

**Misaligned / gaps:** PRD says weekly review should show “read-only data summary above the reflection form: completion rate per habit, streak changes, identity vote totals, habits needing attention.” Current weekly flow uses `weekly_review_ratings` ( = / −, friction) but does not show completion rates, streak deltas, or identity vote totals; that would require `habit_completions` and the today/streak logic. So the “data-informed” part of the review is not yet there.

**Confusion risk:** Low. Flow is clear. “Apply fix” is concrete (e.g. change to 2-minute version).

**Verdict:** Flow and 4 Laws mapping are good. Add data summary (completion rates, streaks, votes) when completion data exists.

---

### Recovery

**What works:** “I’m stuck — reset” at `/dashboard/review/reset`: pick one habit, optionally shrink 2-minute version, save → streak set to 0, “You restarted with a 2-minute version. Use it today.” No guilt; clear restart. Entry from Review hub.

**Misaligned / gaps:** No automatic trigger (e.g. “missed 3+ days” or “streak lost twice”) surfacing this flow; user must go to Review → I’m stuck. PRD Workflow C mentions trigger by missed days / streak loss; that could come after Today and completions exist. No “never miss twice” messaging in the app yet because there’s no daily view to show “You missed yesterday. Do it today…”.

**Verdict:** Reset flow itself is good. Add triggers and daily recovery messaging when the daily loop exists.

---

## 3. Retention Risks (Top 5)

1. **No daily habit loop.** Without a Today view, users have no reason to open the app daily. Identity and habit design are one-time or occasional; the repeat behavior is “check in today.” Risk: drop-off after onboarding.
2. **Identity vote is one-time (onboarding only).** “You cast 1 vote for [identity]” appears once. The book’s idea is that every completion is a vote. Without daily completion, that loop never reinforces. Risk: identity feels theoretical, not experiential.
3. **Votes and streaks are approximate or missing.** “This week: N votes” and momentum use `last_completed_date` only; no true daily history. No streak display in a daily context, no “never miss twice” or “fresh start” messaging. Risk: users don’t see progress or recovery in the way the method promises.
4. **No data-informed weekly review.** Review doesn’t show completion rates, streak changes, or identity vote totals. Risk: reflection feels generic; less trust that the app “knows” how the week went.
5. **No welcome-back or recovery nudge.** No “Welcome back” after 7+ days, no automatic nudge to reset when streak is lost. Risk: returning users don’t get a clear “start again” path.

---

## 4. High-Impact Improvements (Top 7, ranked by ROI)

1. **Add Today view and daily completion (Phase 3 core).** New route (e.g. `/dashboard/today` or make dashboard home the Today view). Implement `habit_completions` table, `/api/habits/today`, `/api/habits/:id/complete`, “never miss twice” streak logic. Today: list today’s habits, one-tap complete, show “1 vote for [identity]” and daily summary when all done. **ROI:** Enables the core loop and retention; unblocks real votes and streaks.
2. **Put Today in primary nav and default landing.** Add “Today” to nav (e.g. first item). After login, users with identities/habits land on Today (or dashboard = Today). **ROI:** Makes daily check-in the default behavior; aligns with “systems > goals.”
3. **Back identity “votes” and momentum with `habit_completions`.** When recording completions, write rows to `habit_completions`. Identity metrics: sum completions in date range per identity (from habits’ identity_id). **ROI:** “This week: N votes” becomes meaningful; momentum reflects real behavior.
4. **Add missed-day and welcome-back messaging.** In Today view: if missed yesterday (one miss) → “You missed yesterday. Do it today and your streak continues. Never miss twice.” If streak reset (2+ consecutive misses) → “Fresh start. You’ve completed this N times total. Pick up where you left off.” If `days_since_last_visit` ≥ 7 → “Welcome back. Here’s where things stand” + summary + “Check in today.” **ROI:** Reduces guilt, supports recovery, matches PRD and book.
5. **Show completion data in weekly review.** Above the weekly review form: completion rate per habit for the week, streak change vs prior week, identity vote totals, habits that missed 2+ days. **ROI:** Data-informed reflection; builds trust and relevance.
6. **Optional: trigger reset flow.** When user has missed 3+ days or lost streak twice, show a soft prompt (banner or modal) with “Struggling? Let’s reset in 60 seconds” → Review → Reset. **ROI:** Brings recovery into the flow without being intrusive.
7. **Inline concept explainers.** Ensure 2-minute rule, habit stacking, temptation bundling, implementation intention (and scorecard purpose) have one-line explainers where they appear (per PRD UX guidelines). **ROI:** Helps users who haven’t read the book recently; reinforces method.

---

## 5. "If I Were Building This" (first 60 days)

- **Weeks 1–2:** Ship `habit_completions` migration, `/api/habits/today` and `/api/habits/:id/complete` with “never miss twice” and `days_since_last_visit`. Build Today page: list for today, one-tap complete, identity vote on complete, “all done” summary. Add Today to nav and make it the default post-login destination for users who have habits.
- **Weeks 3–4:** Switch identity votes and momentum to use completion counts from `habit_completions`. Add missed-day states (1 miss vs 2+ miss) and welcome-back banner (7+ days) on Today. Ensure onboarding’s first completion inserts into `habit_completions` and updates streak/last_completed_date consistently.
- **Weeks 5–6:** Add data summary to weekly review (completion rates, streak deltas, identity votes, habits needing attention). Consider optional “Struggling? Reset” trigger. Add concept explainers where methodology terms appear. Optional: past-day backfill (e.g. last 7 days) and completion calendar on habit detail.

---

## 6. Final Recommendation

**Iterate before launch.**

Do not ship the current build as the main habit product. Identity and habit design are strong and method-aligned; the missing piece is the **daily loop**. Without a Today view and real completion data, the app does not deliver the experience the PRD and Atomic Habits promise. Prioritize Phase 3 (Today view, `habit_completions`, completion and streak APIs, missed-day and welcome-back messaging), then re-run this review. After that, consider a limited launch (e.g. friends) and iterate from feedback.

---

*Review produced per `docs/review/atomic-habits-review-prompt.md`. Constraints: honest, no sugarcoating, optimize for user success.*
