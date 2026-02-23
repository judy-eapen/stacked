# UX Walkthrough: Stacked for an Atomic Habits Reader

**Perspective:** End user who has read (or is reading) Atomic Habits and wants to implement the system.  
**Goal:** Assess whether the flow is clear, aligned with the book, and usable day to day.

---

## 1. First-time journey (new user)

### 1.1 Sign up → Tour → Onboarding

- **Landing:** New user signs up and lands on dashboard. If they have no identities, they either see the **guided tour** first (Today, Identities, Habits, Review, Partners, Settings) or get redirected to **onboarding** once the tour is completed/skipped.
- **Tour:** Explains each area in book-aligned language (e.g. "Every completion is a vote for your identity," "Never miss twice"). Last step: "Open Today to check in." On complete/skip, if no identities → redirect to onboarding.
- **Onboarding (identity-first):**
  - Step 0: "Who do you want to become?" — complete "I am a person who …" (min 3 characters). Example in subcopy. **Good:** Matches the book’s identity-first approach.
  - Step 1: One habit for that identity; **habit name** and **2-minute version (required)**. **Good:** Forces the 2-minute rule.
  - Step 2: Lightweight 4 Laws — Obvious (cue: time / after X / location), Easy (tiny version shown), Satisfying (reward), Attractive (optional bundle). **Good:** Mirrors the four laws without overwhelming.
  - Step 3: "Do the tiny version now" → **Done** → "You cast 1 vote for [identity]." **Good:** First win in-app; reinforces "vote for identity."
  - Step 4: "Want to add another identity?" — Go to dashboard or Add another identity.

**Verdict:** Onboarding is strong and method-aligned. Identity → one habit → 2-min → 4 Laws → first completion is a clear, book-like path.

**Gap:** After "Create habit now" from the post-identity prompt, user lands on **identity detail with ?add=1**. That page has no inline add-habit form; they see "Add your first habit" and click through to the **Habits** page. One extra step. Either send "Create habit now" straight to Habits with identity preselected, or add an inline habit form on identity detail when `?add=1`.

---

## 2. Returning user with habits (daily loop)

### 2.1 Default landing

- Users with at least one active habit are sent to **Today** from dashboard home. **Good:** Puts the daily check-in first.

### 2.2 Today page

- **Header:** "Today" + "X of N remaining" or "All done for today." Share check-in link.
- **Edit past days:** Expandable section; choose a date (last 7 days), then toggle completions. **Good:** Supports backfill and matches the book’s idea of not over-punishing missed days.
- **Habit list:** Each habit has name, 2-min version, stack context, streak, total completions. One-tap complete/incomplete. **Good:** Clear and fast.
- **Messaging:** "You missed yesterday. Do it today and your streak continues. Never miss twice." / "Fresh start. Your history isn’t gone…" **Good:** Non-punitive, book-aligned.
- **Welcome back:** After 7+ days without a completion, dismissible "Welcome back" banner. **Good:** Re-entry is gentle.
- **All done:** Celebration + identity vote summary. **Good:** Reinforces "votes for identity."
- **Share prompt:** When all done, dismissible "Share your check-in with your partner?" with Copy summary / Maybe later. **Good:** Encourages accountability without forcing.
- **Graduation:** If any habit has 21+ completions and all are done, "Ready to level up?" with links to habit detail/edit. **Good:** Surfaces the book’s "expand beyond 2 minutes" idea.

**Verdict:** Today supports the core loop (open app → see habits → complete → see votes/streak) and feels consistent with Atomic Habits.

**Minor:** Streak explainer is only in a tooltip ("Never miss twice: one miss doesn’t reset…"). A short inline line under the streak on first use could help readers who don’t hover.

---

## 3. Identity and habits (system design)

### 3.1 Identities list

- **Content:** Per identity: statement, "This week: N votes," trend vs last week, Momentum bar with one-line explainer. Reinforced by (up to 3 habits), Undermined by (up to 2 blockers). CTAs: + Add reinforcing habit, Add/View & fix blockers, View details.
- **Flow:** "View details" and "View all" go to **identity detail**. Add habit and blockers go to identity detail with `?add=1` or `?blockers=1`. **Good:** One place per identity.

### 3.2 Identity detail page

- **Content:** Same scoreboard (statement, votes, trend, Momentum). Full list of **reinforcing habits** (name, 2-min, streak, Edit, Contract). **Blockers** section (add/edit habit to break) on the same page.
- **Add reinforcing habit:** Links to **Habits** with identity and new=1 so the create form opens with identity set. **Good:** Identity is clear; user can design the habit (4 Laws, stack) on Habits.
- **Friction:** User leaves identity detail to add a habit and lands on the full Habits page. After creating, they stay on Habits. To return to the identity they use nav or back. Acceptable but not seamless; an inline quick-add on identity detail (name + 2-min, then "Design more" on Habits) would shorten the loop.

### 3.3 Habits page

- **Structure:** Grouped by identity; "Unlinked Habits" at the end. Subtitle explains 4 Laws and stacking. **Good:** Matches "habits vote for identity."
- **Habit cards:** Name, identity, stack chain (anchor → habit), intention, 2-min, bundle. View (→ habit detail), Edit, Archive, Share, Push, Contract. "Design this habit" when methodology is empty. **Good:** Stack chain view makes "After [X], I will [Y]" visible.
- **Blockers:** On Habits with `?identity=…&mode=fix` (e.g. from identity detail "Add a blocking habit") user would see the blockers UI; identity detail now has blockers inline, so the main path is identity detail for blockers. **Good:** Blockers live with the identity.

### 3.4 Habit detail page

- **Route:** `/dashboard/habits/[habitId]`.
- **Content:** Habit name, identity, 2-min, streak; **last 30 days** completion grid (filled = done, empty = not). Links to Edit and Contract. **Good:** Gives a visual of consistency (heatmap-like) and a clear place to see one habit’s history.

**Verdict:** Identity → identity detail → habits + blockers is coherent. The only notable friction is adding a new habit from identity detail (extra click and context switch to Habits).

---

## 4. Review and scorecard (reflection)

### 4.1 Review hub

- **Copy:** "The scorecard is a diagnostic + reset tool… It does not replace daily check-ins." **Good:** Sets expectation (scorecard ≠ daily tracker).
- **Options:** Weekly review, Map your day (scorecard), I’m stuck — reset, Monthly identity reflection, Review history. Each has a one-line description. **Good:** Clear entry points.

### 4.2 Weekly review (write)

- **Data summary:** Completion rate per habit, streak change, "Needs attention" (missed 2+ days), identity votes. **Good:** Reflection is data-informed.
- **Graduation:** "Ready to level up?" for habits with 21+ completions, with links to habit detail/edit. **Good:** Ties to the book’s graduation idea.
- **Form:** Wins, struggles, adjustments. **Good:** Simple and focused.

### 4.3 Scorecard and reset

- **Scorecard:** List habits, rate +/−=, group by time of day. Reached from Review only. **Good:** Keeps scorecard as a deliberate reflection/reset tool.
- **Reset:** Mini flow to pick one habit, shrink it, restart. **Good:** Matches "never miss twice" and fresh start.

**Verdict:** Review and scorecard support the book’s reflection and reset ideas without competing with the daily Today loop.

---

## 5. Partners and settings

- **Partners:** Invite, shared view, habit contract. Tour mentions accountability. **Good:** Aligns with the book’s accountability theme.
- **Settings:** Display name, email/push, Google Calendar, export. **Good:** Covers the basics.

---

## 6. Alignment with Atomic Habits (summary)

| Book concept | How the app supports it |
|--------------|--------------------------|
| Identity first | Onboarding and nav start with identity; habits linked to identity; "votes" language. |
| 2-minute rule | Required in onboarding; 2-min shown on Today and habit cards; graduation at 21+. |
| Four laws (build) | Onboarding cue/reward/bundle; Habits "Design this habit" with 4 laws; explainer on Habits. |
| Habit stacking | Stack anchor (scorecard or habit); "After [X] → [habit]" chain on cards. |
| Never miss twice | Streak logic; messaging on Today; reset flow. |
| Votes for identity | "You cast 1 vote for [identity]"; celebration and summary when all done. |
| Blockers (habits to break) | One per identity; 4 laws (break); identity detail has blockers on same page. |
| Review and scorecard | Weekly/monthly review; scorecard as diagnostic/reset; not the daily tracker. |

---

## 7. Friction and recommendations

### Higher impact

1. **Post-identity "Create habit now" → identity detail ?add=1**  
   User lands on identity detail but still has to click "Add your first habit" to open the form on Habits. **Recommendation:** Either (a) send "Create habit now" directly to Habits with `?identity=…&mode=reinforce&new=1`, or (b) add an inline add-habit form on identity detail when `?add=1` so they never leave the page.

2. **"Add reinforcing habit" from identity detail**  
   Takes user to Habits; after creating they are on Habits, not back on the identity. **Recommendation:** After successful create, redirect back to identity detail (e.g. `router.push(\`/dashboard/identities/${identityId}\`)`) so the new habit appears in context.

### Lower impact

3. **Streak / "never miss twice"**  
   Explained only in tooltip. **Recommendation:** Add a short inline line the first time streak is shown (e.g. under the streak: "One miss doesn’t reset; two in a row do.") or in empty state.

4. **Dashboard home when user has no habits**  
   Copy is generic ("Your habits, your focus"). **Recommendation:** If they have identities but no habits, add one line: "Add a habit to an identity to start checking in on Today."

5. **Habit detail entry**  
   "View" on habit cards goes to habit detail (calendar). **Recommendation:** Ensure the Habits list makes the "View" affordance obvious (e.g. "View calendar" or a small grid icon) so users discover the 30-day view.

---

## 8. Overall verdict

- **Flow:** The path from identity → habits → Today → review is clear and matches the book. Identity detail keeps "one identity, one page" and reduces context switching for blockers.
- **Daily loop:** Today is fast, clear, and supportive (streak messaging, celebration, share prompt, graduation). Past 7 days backfill fits the book’s forgiving approach.
- **Methodology:** 4 Laws, stacking, 2-minute rule, votes, blockers, and review/scorecard are all present and recognizable to an Atomic Habits reader.
- **Remaining work:** Small improvements (post-identity habit flow, return-to-identity after create, and optional copy/tooltips) would make the experience smoother; the current flow is already usable and aligned for someone implementing the book.
