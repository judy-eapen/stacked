# Validation Report: Stacked — Phase 1 (first pass) & Phase 2

**Validated:** 2026-02-20  
**PRD:** `docs/prd/atomic-habits-companion-prd.md`  
**Design Catalog:** `docs/design/stacked-phase-1-designs.md`  
**Scope:** Phase 1 scorecard strip-down (first pass), Phase 2 habit design (4 laws build + habits_to_break)  
**Overall:** Pass with notes

**Note:** Validation was performed against the codebase and PRD. The app was not run in the browser; run migrations and manual smoke test before demo/ship.

---

## Acceptance Criteria

### Phase 1 (relevant to first-pass changes)

| User Story | AC | Status | Notes |
|------------|-----|--------|-------|
| US-1.2 | User can add habits to scorecard, assign rating, reorder them, edit, and delete. | Pass | Scorecard page: add form, rating +/−/=, drag reorder, edit (name/rating/time), delete in menu. |
| US-1.3 | Entries can be tagged with time_of_day. View groups by time. | Pass | time_of_day in add/edit; list grouped by Morning/Afternoon/Evening/Anytime. |
| US-1.4 | User can create, edit, delete, reorder identity statements. Optionally per identity: one "habit to break" with name and 4-laws (break) design. | Pass | Identities CRUD present. Habit to break: add/edit inline with name + DesignBreakForm (4 laws × 3 sub-points); save to habits_to_break. |
| US-1.5 | (Deferred) First pass: scorecard shows current state only (habits, +/−=, timing). | Pass | Summary, Take Action, Commit, PatternByTime removed. List + rating + timing only. |
| US-1.6 | (Deferred) First pass: not implemented. | Pass | Take Action callout not present. |

### Phase 2

| User Story | AC | Status | Notes |
|------------|-----|--------|-------|
| US-2.1 | Quick-add: name required, identity optional. Full design: expandable "Design this habit" with 4 laws form and stack anchor. "Design this habit" on card. Unlinked group. | Pass | Create: name + identity; expandable Design shows DesignBuildForm + stack dropdowns. HabitCard has "Design this habit" when !hasDesignFields. "Unlinked Habits" section exists. |
| US-2.1b | Design includes 4 laws (obvious, attractive, easy, satisfying), 3 sub-points each; user can enter text; stored in design_build. | Pass | DesignBuildForm has 12 inputs; create/update send design_build; legacy fields synced from design_build. |
| US-2.2 | Implementation intention from 4-laws form and/or legacy; stored and displayed. | Pass | obvious.implementation_intention used; synced to implementation_intention on save; intentionString used on card. |
| US-2.3 | Habit creation shows scorecard/habit as anchor options; stack chain visible. | Pass | Stack anchor dropdowns (scorecard entries, habits); getStackLabel shows "After …" on card. |
| US-2.4 | Temptation bundle optional; displayed. | Pass | attractive.temptation_bundling in 4 laws; synced to temptation_bundle; card shows temptation_bundle. |
| US-2.5 | Two-minute version; displayed. | Pass | easy.two_minute_rule in 4 laws; synced to two_minute_version; card shows two_minute_version. |
| US-2.6 | Habits grouped by identity; Unlinked group; "Design this habit" if fields empty. | Pass | habitsByIdentity; "Unlinked Habits" heading; hasDesignFields includes design_build; prompt shown when !hasDesignFields. |
| US-2.7 | Archive action; Archived section (collapsed by default); Restore. | Pass | Archive on card; archivedOpen state; "Archived (N)" expandable; Restore button. |
| (Phase 2 AC) | Per identity: add/edit one habit to break with name and 4-laws (break); stored and shown on identity card. | Pass | Identity card: "Add habit to break" or show name + "Edit how to break it"; form has name + DesignBreakForm; upsert to habits_to_break; fetched and displayed. |

---

## Design Comparison

| Screen | Design Match | Notes |
|--------|-------------|-------|
| Scorecard page | Intentional mismatch | Design catalog describes Summary + Take Action + Commit + PatternByTime. PRD D38 first pass: current state only (habits, +/−=, timing). Implementation matches PRD. |
| Identities page | Partial | Design catalog does not describe "habit to break" block. New block added per PRD (habit to break name + 4-laws break form). |
| Habits page | Partial | Design catalog references implementation intention / stack / bundle / 2-min. Replaced by 4-laws (build) form per PRD; stack anchor retained. |

---

## Non-Functional Checks

- [ ] Page loads within performance threshold — Not measured (no browser run).
- [x] Error states: setError used on scorecard, habits, identities; inline error display present.
- [x] Loading states: loading flags and "Loading…" or spinner on scorecard, habits, identities.
- [ ] Mobile layout at primary breakpoint — Not verified in browser.
- [ ] Dark mode — Not verified (if in scope).
- [x] RLS: habits_to_break and habits (design_build) use user_id; policies in migrations.

---

## Backend / Migrations

- [x] `20260220150000_habits_design_build.sql`: adds design_build jsonb to habits.
- [x] `20260220160000_habits_to_break.sql`: creates habits_to_break (id, user_id, identity_id UNIQUE, name, design_break), RLS, indexes, updated_at trigger.

**Action:** Run migrations (e.g. `supabase db push` or apply the two new migration files) before using 4-laws habit design or habit to break.

---

## Issues Found

1. **Design catalog out of date for scorecard:** Design doc still describes Summary and Take Action. **Severity:** Low. **Fix:** Update design catalog to note "First pass: current state only per D38" or add a first-pass variant.
2. **No browser verification:** Validation was code-only. **Severity:** Low. **Fix:** Run app locally, run migrations, then smoke-test scorecard (add/edit/delete/reorder, rating, time), habits (create with 4-laws, edit, archive/restore), identities (add habit to break, edit 4-laws break).

---

## Verdict

**Ready to ship** after migrations are applied and a quick manual smoke test (scorecard, habits with 4-laws, identities with habit to break). No blocking issues; design catalog update is optional for consistency.
