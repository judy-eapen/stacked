# Identities Page Redesign — Requirements (for confirmation)

Based on the target design (v0-style Identities page), below are the proposed requirements. **Please confirm these make sense before implementation.**

---

## 1. Page layout and header

| # | Requirement | Notes |
|---|-------------|--------|
| 1.1 | **Page title:** "Identity statements" (large, bold). | Same as current. |
| 1.2 | **Subtitle:** "Who do you want to become? Example: 'I am a person who moves every day.'" | Same as current. |
| 1.3 | **Primary action:** Orange "+ Create identity" button, top-right of header (desktop); sensible placement on mobile. | Currently a text link when identities exist; move to a persistent button. |

---

## 2. Summary stats (new block above identity cards)

| # | Requirement | Notes |
|---|-------------|--------|
| 2.1 | **Three summary cards** in a horizontal row (stack on small screens): | New block. |
| 2.2 | **Card 1 — Identities:** Label "IDENTITIES", value = count of user's identities, small icon (e.g. people/identity). | |
| 2.3 | **Card 2 — Votes this week:** Label "VOTES THIS WEEK", value = sum of votes this week across all identities (same logic as today). | Reuse existing `countVotesInRange` / this-week bounds. |
| 2.4 | **Card 3 — Avg momentum:** Label "AVG MOMENTUM", value = average of each identity’s momentum % (momentum = votes_this_week / (7 × habit_count), 0 if no habits). | New metric; average of existing per-identity momentum. |
| 2.5 | Cards: white/light background, rounded corners, consistent with app; optional light highlight (e.g. orange tint) on the number for Votes and Avg Momentum. | Visual only. |

---

## 3. Identity cards

| # | Requirement | Notes |
|---|-------------|--------|
| 3.1 | **Grid:** Identity cards in a **2-column grid** on desktop; 1 column on mobile. | Current list is single column. |
| 3.2 | **Card content order (top to bottom):** | |
| | • **Title:** Full identity statement (bold, prominent). | Same data as now. |
| | • **Performance:** "X votes this week" and "+X vs last week" (green text + upward arrow when positive; show negative/neutral as appropriate). | Same as current trend_delta. |
| | • **Momentum section:** Label "MOMENTUM", percentage on same line (right-aligned), horizontal progress bar (orange fill), then helper text: "How much you showed up this week vs. max possible (7 days × habits)." | Same formula as current. |
| 3.3 | **Linked habits section (collapsible):** | |
| | • Section title: "LINKED HABITS" with chevron (up when expanded, down when collapsed). Default: **expanded**. | |
| | • **Reinforcing:** Sub-label "Reinforcing (N)" with green dot/icon; then **habit pills** (rounded tags) for each reinforcing habit — habit name + optional small icon (e.g. dumbbell, walk, etc.). Per-identity "+ Add habit" button (outline/secondary). | Current "Reinforced by" list → pills; show all linked reinforcing habits (or cap with "View all" if we keep a cap). |
| | • **Undermining:** Sub-label "Undermining (N)" with red dot/icon; habit pills for blockers; "+ Add blocker" (or "No blockers linked yet. + Add one" when 0). | Current "Undermined by" → pills. |
| 3.4 | **Card actions (bottom):** Three actions: | Same actions as now, possibly reordered/labeled to match design. |
| | • "+ Add reinforcing habit" (primary orange). | |
| | • "View & fix blockers" (outline). | |
| | • "View details" (outline). | |
| 3.5 | **Edit/delete:** Keep ability to edit statement and delete identity (e.g. icon buttons or menu on the card). | No change in behavior. |

---

## 4. Create / empty state

| # | Requirement | Notes |
|---|-------------|--------|
| 4.1 | **When no identities:** Single CTA card: "Who do you want to become? Write it down." and prominent "Create your first identity" (or "+ Create identity") button. | Same intent as current empty state. |
| 4.2 | **Create flow:** Unchanged: complete-the-sentence with prefix "I am a person who ", min length, create then optionally prompt to add a habit. Can be modal/drawer or inline below header. | Keep existing behavior; placement can match design (e.g. open from header button). |

---

## 5. Data and behavior (no backend changes)

| # | Requirement | Notes |
|---|-------------|--------|
| 5.1 | **Data source:** Same as now — identities, habits (identity_id), habits_to_break; votes/momentum from existing helpers (this week / last week, 7 days × habits). | No API or schema changes. |
| 5.2 | **Links:** "Add habit" → existing flow (e.g. `/dashboard/habits?identity=...&mode=reinforce&new=1`); "View & fix blockers" → identity detail with blockers; "View details" → identity detail. | Keep current routes and query params. |
| 5.3 | **Reinforcing count:** Show all reinforcing habits on the card (or first N with "View all" if we want to cap for very long lists). Design shows 5 habits in a row; we can cap at 5–7 with "View all" linking to identity detail. | Product choice: show 5–7 + "View all" vs. show all. |

---

## 6. Visual and UX alignment

| # | Requirement | Notes |
|---|-------------|--------|
| 6.1 | **Design system:** Use existing app colors (e.g. primary orange), typography (e.g. font-heading / font-body if in use), spacing, and border radius. | Match Today page and rest of app. |
| 6.2 | **Icons:** Use lucide-react (or existing icon set) for identity icon, calendar, chart, reinforcing/undermining indicators, chevrons, and optional per-habit icons. | No new icon library. |
| 6.3 | **Accessibility:** Labels for stats, buttons, and collapsible section; keyboard and screen-reader friendly. | Same standards as rest of app. |

---

## 7. Out of scope for this redesign

- Changing backend APIs or data model.
- Changing identity detail page structure (only links to it).
- Changing create-identity or add-habit flows (logic and routes stay; only placement/UI can be adjusted to match design).

---

## Summary for confirmation

1. **Header:** Title + subtitle + top-right "+ Create identity" button.
2. **New summary block:** 3 cards — Identities count, Votes this week, Avg momentum.
3. **Identity cards:** 2-col grid; each card: statement, votes + trend, momentum bar + explanation, collapsible "Linked habits" with reinforcing (pills + add) and undermining (pills + add), then three action buttons; edit/delete retained.
4. **Empty and create flows:** Unchanged behavior; visual placement can follow design.
5. **No backend changes;** use existing data and routes.

If you confirm these requirements (or note edits), next step is implementation against this spec.
