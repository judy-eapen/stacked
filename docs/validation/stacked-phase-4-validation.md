# Validation Report: Stacked — Phase 4

**Validated:** 2026-02-23  
**PRD:** `stacked-auth-demo/docs/prd/atomic-habits-companion-prd.md`  
**Design Catalog:** N/A  
**Phase:** 4 — Review & Reflect  
**App running:** Not verified in browser (code and PRD only)

**Overall:** Pass with notes

---

## Acceptance Criteria

| User Story | AC | Status | Notes |
|------------|-----|--------|-------|
| US-4.1 | Banner or prompt once per week if no review for current week; "Write a review" always on Reviews page, not gated to cadence | Pass | Banner in ReviewHubClient when no weekly review for current week; "Write a review" link always visible in hub. Cadence suggested, not enforced. |
| US-4.2 | Review page shows read-only data summary above form: completion rate per habit, current streak (with +N/-N vs prior week), habits missed 2+ days flagged "needs attention," identity vote totals; form has wins, struggles, adjustments; saved and viewable in history | Pass | Write page: summary from `/api/reviews/summary` with completion_rate, current_streak, streak_change, missed_two_plus ("Needs attention"), identity_votes; form fields wins, struggles, adjustments. Upsert to `reviews`. History lists past reviews and links to write with date. |
| US-4.3 | Monthly prompt shows identity statements and asks for reflection; saved with review | Pass | `/dashboard/review/monthly`: lists identities, identity_reflection textarea, saves to `reviews` with review_type=monthly, review_date=first of month. |
| US-4.4 | After 21+ days of completion (non-consecutive / never-miss-twice), suggestion to upgrade habit | Pass | Write page shows "Ready to level up?" for habits with total_completions >= 21; lists habit names and suggests expanding beyond 2-minute version. |
| US-4.5 | Reviews page shows chronological list of past reviews with key stats from that period | Partial | Review history shows chronological list (review_date desc) with type, date, and snippet of wins/struggles/adjustments. "Key stats from that period" (e.g. completion rates for that week) are not stored on the review record, so history shows reflection text only. |
| US-4.6 | Settings has "Export my data"; CSV has habit_name, identity, date, completed, streak_at_time; filename stacked-export-YYYY-MM-DD.csv; includes all habits (active and archived) | Pass | Settings has Export button; fetches `/api/export`, downloads CSV. Export API uses all habits (no filter on archived_at), all habit_completions; columns and filename match. streak_at_time is computed (consecutive completions per date). |

---

## Phase 4 Acceptance Criteria (bulleted)

- Review prompts appear at correct cadence: **Pass** (banner when no review for current week).
- Manual review creation works at any time via "Write a review" button: **Pass**.
- Review page shows accurate data summary for the review period: **Pass** (summary API + write page).
- Reviews are persisted and editable: **Pass** (upsert; history links to write?date= for that period).
- Graduation prompt appears for eligible habits: **Pass** (21+ total completions on write page).
- Review history is chronological and scannable: **Pass** (date desc, type + date + snippet).
- CSV export downloads a valid file with all habit completion data: **Pass** (all habits, all completions, correct columns and filename).

---

## Design Comparison

No design catalog provided for Phase 4. N/A.

---

## Non-Functional Checks

- [x] Error states: write page shows error message on failed summary or save; history and monthly handle empty/error.
- [x] Loading states: write, history, monthly show "Loading…" while fetching.
- [x] RLS: `reviews` table has policy "Users can CRUD own reviews" (auth.uid() = user_id). Export and summary APIs use authenticated user only.
- [ ] Page load performance: not measured (no browser run).
- [ ] Mobile layout at primary breakpoint: not verified (no browser run).
- [ ] Dark mode: not verified (PRD specifies dark mode in v1; no Phase 4–specific check).

---

## Issues Found

1. **Future-period reviews (DoD):** PRD Definition of Done says "Reviews cannot be created for future periods." The write page accepts `?date=` and defaults to current week; there is no server- or client-side check that `review_date` is not in the future. **Severity:** Low. **Fix:** In write page (or API), reject or disable save when weekStart (or review_date) is after the current week’s Monday; for monthly, reject when review_date is after first of current month.

2. **Review history — monthly link:** History links each review to `/dashboard/review/write?date=${r.review_date}`. For monthly reviews, review_date is the first of the month (e.g. 2026-02-01), which is not necessarily a Monday; the write page interprets the date as week start for the summary. So clicking a monthly review may show the wrong week’s summary. **Severity:** Low. **Fix:** Either separate "Edit weekly" vs "Edit monthly" (e.g. monthly goes to `/dashboard/review/monthly` with month pre-filled) or document that editing monthly from history opens write for that week.

3. **Export — optional:** CSV includes all habits; completions for deleted/archived habits remain in habit_completions and are exported. habit_name/identity come from current habits table; if a habit was deleted, habit_id in completions might have no row in habits (habitById would miss it). **Severity:** Low. **Fix:** Export could use left join semantics (show habit_id or "Unknown" if habit missing); current code uses habitById[row.habit_id] which may be undefined for orphaned completions.

---

## Verdict

**Ready to ship** with the above notes. All Phase 4 user stories are met or partially met; the only DoD gap is enforcement of "no future-period reviews." Recommend adding a simple client-side guard on the write page (e.g. disable save or show message when selected week is in the future) before or shortly after release.
