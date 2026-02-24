# Product Review: Stacked for an Atomic Habits Fan

**Review date:** 2026-02-22  
**Lens:** A user who has read Atomic Habits and wants to implement the system (identity, 2-minute rule, stacking, votes, never miss twice, review, scorecard).  
**Evidence:** PRD, UX walkthrough (`docs/ux-walkthrough-atomic-habits-user.md`), app routes and features (Today, Identities, Habits, Review, Partners, onboarding).

---

## 1. Overall verdict

**How it fares:** Stacked is well aligned with the book and usable day to day for an Atomic Habits fan. The core loop exists: identity first, habits linked to identity, daily check-in on Today, “votes” and streaks, weekly review with data, scorecard as diagnostic, and accountability partners. Terminology and flows match what a reader expects. Remaining friction is mostly small (e.g. one extra step when adding a habit from an identity). A practitioner can rely on it as their main habit system.

**Likelihood of sustained use:** High, assuming they complete onboarding and use Today regularly. The app gives a clear place to “vote” daily, see streaks, and review with real data. Missing pieces (e.g. automatic “struggling? reset” nudge) are nice-to-have, not blockers.

---

## 2. Alignment with the book

| Book concept | How Stacked supports it | Verdict |
|--------------|--------------------------|---------|
| Identity first | Onboarding and nav start with identity; habits link to identity; “votes” language throughout. | Strong |
| 2-minute rule | Required in onboarding; 2-min shown on Today and habit cards; graduation prompt at 21+ completions. | Strong |
| Four laws (build) | Onboarding: cue, reward, bundle; Habits: “Design this habit” with full 4 laws. | Strong |
| Habit stacking | Stack anchor (scorecard or habit); “After [X] → [habit]” chain on cards. | Strong |
| Never miss twice | Streak logic; “You missed yesterday…” and “Fresh start” on Today; reset flow under Review. | Strong |
| Votes for identity | “You cast 1 vote for [identity]” at first completion; all-done summary and identity vote counts. | Strong |
| Blockers (habits to break) | One per identity; 4 laws (break); identity detail has blockers on same page. | Strong |
| Review and scorecard | Weekly review with data (completion, streaks, needs attention); scorecard under Review only (diagnostic + reset). | Strong |
| Accountability | Partners with shared habits, read-only view, habit contract. | Strong |

The app does not gamify (no XP, badges, levels). It focuses on identity, systems, and consistency. That matches the book and will feel right to a serious reader.

---

## 3. Strengths for an Atomic Habits fan

- **Onboarding.** Identity → one habit (2-min required) → lightweight 4 Laws → “Do the tiny version now” → first completion → “You cast 1 vote for [identity].” Clear, method-aligned, ends with a win.
- **Today.** Default landing for users with habits. One-tap complete, streak and week dots, “X of N remaining,” identity vote on completion, celebration when all done. Edit past days (last 7) for backfill. Messaging: “Never miss twice,” “Fresh start,” “Welcome back” after 7+ days. Share check-in and graduation prompt when relevant.
- **Identity as scoreboard.** Identities first in nav. Per identity: statement, votes this week, trend, momentum bar, reinforcing habits, undermining habits (blockers). CTAs to add habit or fix blockers. Matches “habits are votes for who you are becoming.”
- **Habit design.** Full 4 Laws (build), implementation intention, stack anchor, temptation bundle, 2-minute version. Blockers with 4 laws (break). Quick-add plus “Design this habit.” Grouped by identity; stack chain visible on cards.
- **Weekly review.** Data summary (completion, streaks, identity votes, needs attention), then 4-prompt reflection (wins, improve, lesson, next week). Wins & needs-attention list and Atomic Habits insight. Saves to history. Feels like the book’s “review your systems” habit.
- **Scorecard and reset.** Scorecard lives under Review only (diagnostic + reset), not as the daily tracker. “I’m stuck — reset” flow: pick one habit, shrink 2-min, restart. No guilt; clear path to start again.
- **Partners.** Invite by link; partners see shared habits and streaks (read-only). Habit contract. Supports the book’s accountability idea without social feed or gamification.

---

## 4. Gaps and friction

**Higher impact**

1. **Post-identity “Create habit now.”** User lands on identity detail with `?add=1` but still has to open the Habits page to add a habit. One extra step. Fix: send “Create habit now” to Habits with identity preselected, or add an inline add-habit form on identity detail.
2. **Return after adding a habit.** After creating a habit from identity detail, user stays on Habits. They don’t see the new habit in the identity context. Fix: after create, redirect back to that identity detail.

**Lower impact**

3. **Streak / “never miss twice.”** Explained in a tooltip. Some users may not hover. Optional: short inline line under the streak (e.g. “One miss doesn’t reset; two in a row do”) or in empty state.
4. **“Struggling? Reset” nudge.** No automatic prompt when user has missed 3+ days or lost streak twice. They can still go to Review → I’m stuck. Optional: soft banner or prompt that links to reset.
5. **Concept explainers.** 2-minute rule, stacking, temptation bundling are in the UI; not every surface has a one-line explainer. Helpful for someone who read the book a while ago.

None of these block an Atomic Habits fan from using the product effectively. They are polish and flow improvements.

---

## 5. Where a fan might be surprised or disappointed

- **Scorecard is not the daily tracker.** The book’s “scorecard” is sometimes read as “list habits and rate them daily.” In Stacked, the scorecard is a separate, deliberate tool under Review (rate +/−=, map your day, reset). Daily check-in is Today. That’s intentional per the PRD and matches “scorecard as diagnostic,” but a fan looking for “scorecard every day” will find that behavior in Today (list + complete), not in the Scorecard page. The UX walkthrough and Review hub copy explain this; keeping that clear in-app avoids confusion.
- **No habit “themes” or templates.** The book gives examples (e.g. “read 20 pages,” “meditate 5 min”). Stacked is blank slate: user defines identity and habits. Some fans might want starter identities or habit ideas. Not a flaw; just a design choice.
- **Blockers are one per identity.** The book doesn’t cap “habits to break.” Stacked allows one habit to break per identity. Enough for the method; power users might want more. Documented in PRD.

---

## 6. Summary for an Atomic Habits fan

| Question | Answer |
|----------|--------|
| Can I set up identity-first? | Yes. Onboarding and nav are identity-first. |
| Can I do a 2-minute version and see it daily? | Yes. Required in onboarding; shown on Today and habit cards. |
| Do I get “votes for identity” when I complete? | Yes. On first completion and when all done for the day. |
| Is there a real daily check-in? | Yes. Today shows today’s habits, one-tap complete, streaks, week dots. |
| Does “never miss twice” show up? | Yes. Messaging on Today for one miss vs two; reset flow under Review. |
| Can I stack habits (“After X, I will Y”)? | Yes. Stack anchor and chain on habit cards and design. |
| Can I design with 4 laws (build and break)? | Yes. Full 4 laws on Habits; blockers use 4 laws (break). |
| Is there a weekly review with real data? | Yes. Completion, streaks, identity votes, needs attention, then reflection. |
| Is the scorecard like the book? | It’s the diagnostic/reset tool under Review, not the daily list. Daily list + complete is Today. |
| Can I have an accountability partner? | Yes. Invite by link; they see shared habits and streaks (read-only). |

**Bottom line:** An Atomic Habits fan can use Stacked as their main system. The product delivers identity, 2-minute rule, stacking, daily votes, streaks, “never miss twice” messaging, data-informed review, scorecard as diagnostic, and partners. Remaining work is mostly flow tweaks and optional nudges, not missing methodology.
