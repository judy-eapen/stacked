# Product Expert Review: Stacked

**Reviewed:** 2026-02-19
**PRD:** `docs/prd/atomic-habits-companion-prd.md`

## What This Product Is

Stacked is a web app that walks users through the Atomic Habits methodology step by step: awareness (scorecard), identity design, habit design (stacking, bundling, implementation intentions), daily tracking with "never miss twice" streaks, periodic review, and 1:1 accountability sharing. It replaces a 4-tool workflow (pen + paper + messaging + calendar) with a single guided system.

**Core value:** The full Atomic Habits playbook as a guided workflow, not just a tracker. The methodology itself is the product.

## Primary User & Use Case

- **Who:** People who have read Atomic Habits and want to actually implement the system. Initially: the builder and close friends.
- **Main job:** "I want to build good habits and break bad ones, using the system from the book, without managing 4 different tools."
- **Success looks like:** The user checks in daily. Habits stick over weeks. They feel like they're becoming the person they want to be. They share progress with a friend who keeps them honest.

## Strengths

- **Methodology-first design.** The PRD organizes the entire product around the book's progression (awareness, identity, design, execute, review), not around generic CRUD. This is the correct product decision and the core differentiator.
- **"Never miss twice" streak logic.** This is the single most important UX decision in the PRD. Most habit apps punish one bad day by resetting everything. Stacked doesn't. This alone could be the reason users stay.
- **Phasing is user-value-driven.** Each phase delivers something usable. Phase 1 gives you the scorecard + identities. Phase 3 gives you daily tracking. You don't need to build all 6 phases to have a useful product.
- **Accountability is private, not social.** The 1:1 partner model matches the book's concept and avoids the trap of building a social network. Smart scope control.
- **Scorecard as the entry point.** Starting with awareness (not tracking) is faithful to the book and differentiates from every competitor. Most apps start with "add a habit." Stacked starts with "see your habits clearly."

## Gaps & Blind Spots (What People Often Don't Think Of)

### 1. The transition from scorecard to action is missing

The scorecard asks users to list habits and rate them +, -, =. Then identities are on a separate page. Then habits are on another page. The book's flow is:

Scorecard reveals problems -> Identity defines who you want to become -> New habits target the problems

But the app doesn't connect these steps. A user marks "scrolling after dinner" as (-). Nothing happens next. There's no prompt saying "Want to replace this with something?" or "Which identity does this conflict with?"

**What to do:** After completing a scorecard, show a summary of (-) habits and prompt: "Pick one to work on. What would you rather do instead?" This bridges the gap between awareness and action. It can be a simple callout card on the scorecard summary page, linking to habit creation with the (-) entry pre-filled as the stack anchor or the "thing to replace."

### 2. Empty states and first-run flow are not designed

The PRD says "guided but skippable onboarding" but doesn't specify what the user actually sees:
- First login: blank sidebar, blank pages. Where do they start?
- Today view with 0 habits: what shows?
- Habits page with 0 identities: what shows?
- Reviews page with 0 reviews: what shows?

Empty states are the first impression of every page. They should teach, not just say "Nothing here."

**What to do:** Design empty states for every major page:
- **Today (no habits):** "You don't have any habits to track yet. Start by creating your Habit Scorecard to see where you stand, or add your first habit."
- **Scorecard (empty):** "Walk through your day. What do you do when you wake up? After breakfast? Before bed? List each habit and rate it."
- **Identities (empty):** "Who do you want to become? Write it down. Example: 'I am a person who moves every day.'"
- **Reviews (empty):** "Your first review will be available after your first week of tracking."

### 3. Identity reinforcement is passive

The PRD groups habits under identities (good) and has monthly identity reflection in reviews (good). But the daily experience misses the most powerful moment: **the completion itself.**

When the user checks off "Write for 2 minutes," the app should briefly reinforce: "Vote cast for 'I am a writer.'" This is the book's central insight: every action is a vote for your identity. The app doesn't surface this during the action that matters most.

**What to do:** After completing a habit linked to an identity, show a subtle inline message on the Today view: "1 vote for [identity]." At the end of the day (all habits done), show a summary: "Today you cast 5 votes for 'I am a writer,' 3 for 'I am healthy.'" This turns mundane tracking into identity reinforcement. Low effort, high emotional impact.

### 4. No external trigger until Phase 6

Until email reminders (Phase 6a) and push notifications (Phase 6b) are built, the only reason a user opens the app is... remembering to open the app. That's the weakest possible trigger. For a habit tracker, this is a significant retention risk during the most critical period (Phases 1-5, when you're validating the product).

**What to do:** Add two lightweight triggers that don't require Phase 6:
- **"Add to Home Screen" prompt** on mobile browsers. The app is mobile-first but has no install/bookmark prompt. This puts the icon on their phone where they'll see it.
- **Browser tab title update** when the app is open: "Stacked (3 remaining)" so even if it's a background tab, they see the nudge.

Both are near-zero effort and improve daily re-engagement before email/push exist.

### 5. Missed-day emotional design is not specified

The streak logic is well-defined technically. But the UI messaging around missed days is undefined. This matters more than most people think. The moment a user misses a day, they either:
- Feel guilt and avoid the app (churn), or
- Feel supported and come back (retention)

**What to do:** Specify messaging for three states:
- **Missed 1 day:** "You missed yesterday. Do it today and your streak continues. Never miss twice." (Encouraging. References the book.)
- **Missed 2+ days (streak reset):** "Fresh start. Your history isn't gone, and neither is your progress. Pick up where you left off." (Non-punitive. Shows lifetime completions alongside the reset streak.)
- **Returned after 1+ weeks:** "Welcome back. Here's where things stand." Show a summary of what happened while they were gone, and a single action: "Check in today."

### 6. Habit creation is too heavy for casual use

The multi-step form is: name -> identity -> intention -> stack -> bundle -> 2-min version. That's 6 fields to create one habit. If someone wants to add "Drink a glass of water," they have to walk through identity selection, implementation intention fields, stack anchor selection, temptation bundle, and two-minute version.

The methodology fields are valuable but should not be barriers to adding a habit.

**What to do:** Two modes:
- **Quick add:** Name + identity (optional). One screen, one tap. The habit is created and trackable.
- **Full design:** Expand to see all methodology fields (intention, stack, bundle, 2-min). Available during creation or later via "Design this habit" on the habit card.

This reduces friction for casual additions while preserving the full methodology for users who want it.

### 7. The accountability partner has no reason to check

The partner gets a read-only dashboard showing their friend's habits and streaks. But nothing prompts them to look at it. There's no notification, no email, no nudge. The partner has to actively remember to open the app and navigate to their friend's dashboard.

For accountability to work, the partner needs to be pulled in. Without Phase 6 notifications, the partner dashboard is a page nobody visits.

**What to do (within Phase 5, no external service needed):**
- When a user checks in for the day (completes all habits), show an option: "Share your check-in with [partner name]?" If yes, generate a shareable summary (text/link) the user can paste into any messaging app. This leverages the messaging apps they already use as the notification channel, at zero infrastructure cost.
- On the partner dashboard, show "last active" timestamp so the partner knows when their friend last checked in (or didn't).

### 8. Weekly review doesn't show the user's data

The review form asks: wins, struggles, identity reflection, adjustments. But it doesn't show the user their actual data from the week. They have to remember (or navigate away to check) which habits they completed, which they missed, and what their streaks look like.

**What to do:** The weekly review page should display (read-only, above the form):
- Completion rate per habit for the past week
- Streaks (current + changes from last week)
- Habits that were missed 2+ days (flagged for attention)
- Identity vote counts ("This week: 5 votes for 'I am a writer'")

Then below that data, the review form asks: "What went well? What was hard? What will you adjust?" The data informs the reflection.

### 9. No concept vocabulary help

The app uses book-specific terms: Scorecard, Implementation Intention, Temptation Bundling, Habit Stacking, Two-Minute Rule. These mean nothing to a user who read the book a year ago, or who was told about the app by a friend who read the book.

**What to do:** Add a one-line explainer (subtitle or tooltip) to every concept when it appears in the UI:
- **Scorecard:** "List your current habits. Rate each one: positive (+), negative (-), or neutral (=)."
- **Implementation Intention:** "Be specific. I will [behavior] at [time] in [location]."
- **Habit Stacking:** "Attach a new habit to something you already do. After [current habit], I will [new habit]."
- **Temptation Bundling:** "Pair something you need to do with something you want to do."
- **Two-Minute Rule:** "Scale it down. What's the two-minute version of this habit?"

These appear inline, always visible (not hidden behind a help icon). They teach as you use.

### 10. Data export is out of scope but it's a trust issue

The PRD explicitly excludes data export. For a habit tracker where users invest months of personal data, this erodes trust. "Can I get my data out?" is a question power users ask early.

**What to do:** Add a simple CSV export of habit completions to a future phase (or even Phase 4, since reviews already look at historical data). One button: "Export my data." Exports completions as a CSV with columns: habit name, date, completed (true/false). Minimal effort, significant trust signal.

---

## Improvements for This Use Case

| Improvement | Why it helps | Effort |
|-------------|-------------|--------|
| Scorecard-to-action bridge (prompt to turn (-) habits into new habits) | Closes the gap between awareness and behavior change. Core methodology. | Medium |
| Empty states for every major page | First impression of every feature. Teaches users what to do. | Quick |
| Identity vote feedback on completion ("1 vote for 'I am a writer'") | Turns tracking into identity reinforcement. The book's central insight, surfaced daily. | Quick |
| "Add to Home Screen" prompt + browser tab title update | Only external triggers before Phase 6. Directly impacts daily retention. | Quick |
| Missed-day messaging (3 states: 1 day, 2+ days, 1+ weeks) | Prevents guilt-driven churn. The emotional make-or-break moment. | Quick |
| Quick add mode for habit creation (name + identity only) | Reduces friction for casual additions. Full design available later. | Quick |
| Shareable check-in summary for partner (text/link to paste in messaging) | Makes accountability work without building notifications. Uses existing messaging apps. | Medium |
| Weekly review pre-populated with actual data (completion rates, streaks, identity votes) | Informed reflection instead of blank text fields. | Medium |
| Concept vocabulary explainers (one-line subtitles on every methodology term) | Users who forgot the book (or never read it) can still use the app. | Quick |
| CSV data export | Builds trust. Users commit more when they know they can leave. | Quick |

## Quick Wins

These are low-effort, high-impact changes that can be added during development without changing the phasing or architecture:

1. **Empty states with guidance text** on every page (Scorecard, Identities, Today, Habits, Reviews, Partners). Copy only, no new logic.
2. **Concept explainer subtitles** under every methodology term in the UI. Static text.
3. **"1 vote for [identity]" on habit completion.** One line of conditional text on the Today view.
4. **Missed-day messaging.** Three conditional messages based on streak state. Frontend only.
5. **Quick add mode for habits.** Make all fields except name optional on the creation form. Show "Customize" expander for methodology fields.
6. **Browser tab title with remaining habits count.** One line of JavaScript.

## Edge Cases & Failure Modes

| Scenario | What happens today | What would be better |
|----------|-------------------|---------------------|
| User opens Today view with 0 habits | Undefined (no empty state spec) | Show guidance: "No habits yet. Start with your Scorecard or add your first habit." |
| User completes scorecard, then what? | Nothing. They navigate away to another page. | Show a bridge: "You have 5 negative habits. Want to pick one to work on?" |
| User returns after 2 weeks | They see broken streaks, possibly zero progress. Discouraging. | Show a "Welcome back" summary. Emphasize lifetime completions, not broken streaks. |
| User creates 30+ habits | Today view becomes a long scrollable list | Group by time of day or identity. Add a "focus" mode (show only the next 3 habits). |
| User's accountability partner never checks the dashboard | Accountability doesn't work. Silent failure. | Add "Share check-in" button that generates a text summary for messaging. |
| User archives a habit and wants it back | No user story or UI for un-archiving | Add "Restore" action in the Archived section. |
| All habits completed for the day | User sees all checkmarks. Then what? | Show a "You're done for today" celebration moment. Surface identity votes for the day. |
| User who hasn't read the book | Terms like "Implementation Intention" are meaningless | Inline explainers on every concept. |
| User tries to create a review mid-week | PRD says weekly review prompt on Sunday | Allow manual review creation anytime. Don't gate reflection to a schedule. |

## PRD / Design Suggestions

1. **Add a "Scorecard-to-Action" flow.** After scorecard summary, prompt user to select a (-) habit and create a replacement or stacked habit from it. Add as US-1.6 in Phase 1.
2. **Specify empty states.** Add a section to the PRD (or to each phase) defining the empty state for every major view. At minimum: Today, Scorecard, Identities, Habits, Reviews, Partner dashboard.
3. **Add "identity vote" feedback to Phase 3.** When a habit is completed on the Today view, show "1 vote for [identity]." When all habits are done, show a daily vote summary. Add as an AC to US-3.1.
4. **Add quick-add mode to Phase 2.** Change US-2.1 to specify that only name is required. Identity and all methodology fields are optional (expandable). This reduces habit creation to one field.
5. **Add missed-day messaging to Phase 3.** Specify three message states (1 miss, 2+ misses, 1+ week absence) as acceptance criteria on US-3.2.
6. **Add "Share check-in" to Phase 5.** After daily completion, offer a "Share with [partner]" action that generates a text summary (shareable via any messaging app). Add as US-5.3b.
7. **Add weekly review data display to Phase 4.** US-4.2 should specify that the review page shows completion data (rates, streaks, identity votes) above the form.
8. **Add concept explainers.** Specify that every methodology-specific term in the UI includes a one-line subtitle explaining it. This is a UX pattern, not a feature. Add as a design guideline in Phase 1.
9. **Add "Add to Home Screen" prompt.** Add to Phase 1 frontend tasks. Simple meta tags + a dismissible banner on mobile.
10. **Add un-archive action.** Update D20 (Archived habits) to include "user can restore an archived habit. Streak restarts from 0; history is preserved."
11. **Add CSV data export.** Move from Out of Scope to a future phase (Phase 4 or Phase 5). Simple export of completions as CSV.
