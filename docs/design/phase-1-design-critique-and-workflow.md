# Phase 1 Design Critique & Workflow Overview

**Date:** 2026-02-20

---

## Part 1: Design Critique

Review of the Phase 1 design catalog and implemented screens against the PRD (Atomic Habits Companion). Target: `stacked-auth-demo`.

### Strengths

- **Concept explainers.** Scorecard and Identities pages use inline subtitles that match the PRD UX guidelines (e.g. "List your current habits. Rate each one: positive (+), negative (−), or neutral (=)." and "Who do you want to become? Example: …"). No methodology term is dropped in without explanation.

- **Empty states.** Both Scorecard and Identities have dedicated empty states with teaching copy and a single primary CTA ("Add your first habit", "Create your first identity"). Copy aligns with the PRD empty-state table. "View empty state" / "View with sample data" toggles support design review without losing data.

- **Scorecard structure.** Grouping by time of day (Morning / Afternoon / Evening / Anytime), net score + directional insight ("You're building momentum" / "Focus on one habit…"), Take Action callout (worst time block + one habit suggestion), and "Commit to one habit this week" expandable CTA all match the PRD’s scorecard-to-action bridge (D29) and make the flow from awareness to action clear.

- **Identity design.** 3-step create (statement with auto-prefix + min length, link habits, confirm), consistency bar (votes / (habits × 7)), vote copy ("X votes this week", "+N from yesterday"), and conflicted-by treatment (warning, red tint, reorder when &lt;50%) give a concrete implementation of identity-based habits that the PRD describes at a high level.

- **Visual consistency.** Warm gradient background, `#e87722` accent, rounded cards, same form patterns (inputs, primary/secondary buttons) across dashboard home, display name, forgot password, settings, and auth. Stacked logo (three bars) is reused.

- **Auth and PWA.** Forgot password and Settings (display name + Log out) are present and styled consistently. Add to Home Screen banner is mobile-only, dismissible via localStorage. Manifest is referenced with theme color and start URL. Layout links (Forgot password from login, user block → settings) are correct.

- **Design catalog.** `docs/design/stacked-phase-1-designs.md` clearly maps screens to user stories and file paths. Easy to use during execution and validation.

### Gaps and suggestions (addressed 2026-02-20)

1. **Add to Home Screen banner CTA.** Addressed. Banner now uses instructional copy ("Tap your browser menu (⋮) then 'Add to Home Screen' for quick access") and a "Got it" dismiss button. Design catalog notes no programmatic install in Phase 1; beforeinstallprompt can be added in execution if a service worker is introduced.

2. **Scorecard add form: no pre-selected rating/time.** Addressed. Add form defaults rating to "=" and time to "Anytime"; form state is controlled so the fastest path is name + Save.

3. **Identity edit: no habit re-linking.** Addressed (documented). Design catalog states that edit mode changes statement only and re-linking habits = delete and recreate for Phase 1.

4. **Settings "Save changes" has no feedback.** Addressed. Save shows "Saved" text for 3 seconds after click (design-only); execution will add API and error handling.

5. **Display name "Skip for now" footnote.** Addressed (documented). Design catalog states that execution may gate other flows (e.g. partner features) on display name being set and to document in PRD if so.

6. **Mobile nav: no "Next step" badge.** Addressed. Mobile header now shows the "Next step" badge on the Scorecard link, matching the sidebar.

7. **No loading or error states in design.** Addressed (documented). Design catalog notes for Scorecard and Identities: "Loading/error states to be added in execution."

8. **Accessibility.** Addressed. Focus rings strengthened to `focus:ring-[#e87722]/70 focus:ring-offset-2` across inputs, buttons, and interactive elements (login, signup, forgot-password, display name, settings, scorecard add form and row controls, identities). Keyboard focus remains visible.

### Summary

The Phase 1 designs are strong: they match the PRD’s concept explainers, empty states, scorecard-to-action bridge, and identity model, and they are visually consistent and well documented. The main follow-ups are small UX polish (defaults, feedback, mobile badge), clarifying the Add to Home Screen CTA for execution, and planning for loading/error and (if needed) identity edit habit-linking.

---

## Part 2: Workflow Assessment

The workflow in `.cursor/rules/ai-framework-link.mdc` is in good shape. It clearly separates:

- **Once per product:** research → PRD → reviews (product + technical, parallel) → apply fixes → optional system design.
- **Repeat per phase:** design → **update PRD from designs** → execute → validate → ship → learn.

The addition of step 6b (`/update-prd-from-designs`) closes the loop: the PRD stays the source of truth after design decisions and copy are finalized, so execute and validate run against one spec.

**What works well:**

- Scale guidance (Full / Medium / Light) lets you skip PRD and design for small changes.
- Reviews can run in parallel (3 and 4).
- Step 6b is placed after design approval and before execution, so no one implements from an outdated PRD.
- Loop-back rules are clear: after Learn, next phase starts at Design; if Learn reveals PRD issues, loop back to Create PRD (and optionally re-review).

**Optional refinement:** If you want to force an explicit "design approved" gate, you could add a short checklist in `03-design.md` or the design catalog template: e.g. "Design approved: [ ] All screens reviewed [ ] Catalog updated [ ] Ready for /update-prd-from-designs." Not required for the workflow to function.

---

## Part 3: Workflow Flow (How Steps Connect)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ONCE PER PRODUCT                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   1. /research-idea ──► Research summary                                     │
│            │                                                                 │
│            ▼                                                                 │
│   2. /create-prd ──► PRD in docs/prd/                                       │
│            │                                                                 │
│            ▼                                                                 │
│   ┌────────┴────────┐                                                        │
│   ▼                 ▼                                                        │
│ 3. /review-prd   4. /cto-review   (can run in parallel)                     │
│   ► product         ► technical                                             │
│   review            review                                                   │
│   │                 │                                                        │
│   └────────┬────────┘                                                        │
│            ▼                                                                 │
│   5. Apply fixes ──► Updated PRD                                            │
│            │                                                                 │
│            ├──► [optional] 5b. /system-design ──► System design doc           │
│            │                                                                 │
│            ▼                                                                 │
│   ═══════════════════════════════════════════════════════════════════════   │
│   REPEAT PER PHASE (for each phase: 1, 2, 3, …)                             │
│   ═══════════════════════════════════════════════════════════════════════   │
│            │                                                                 │
│            ▼                                                                 │
│   6. /design ──► Design catalog in docs/design/ + UI in repo                │
│            │                                                                 │
│            ▼                                                                 │
│   6b. /update-prd-from-designs ──► PRD updated (catalog ref, copy, AC)       │
│            │                                                                 │
│            ▼                                                                 │
│   7. /execute-plan ──► Production code (backend, wiring, real data)           │
│            │                                                                 │
│            ▼                                                                 │
│   8. /validate ──► Validation report (PRD + designs)                         │
│            │                                                                 │
│            ▼                                                                 │
│   9. Ship / demo ──► Deployed app                                            │
│            │                                                                 │
│            ▼                                                                 │
│   10. /learn ──► Learning report, metrics, feedback                          │
│            │                                                                 │
│            ├──► Next phase? ──► back to step 6 (/design for Phase N+1)      │
│            │                                                                 │
│            └──► PRD changes needed? ──► back to step 2 (/create-prd)        │
│                                         then optionally 3, 4, 5              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Linear view (repeat-per-phase only)

```
Design (6) → Update PRD from designs (6b) → Execute (7) → Validate (8) → Ship (9) → Learn (10)
      ▲                                                                              │
      └────────────────── next phase ──────────────────────────────────────────────┘
      (If Learn says "update PRD": go back to Create PRD (2), then optionally review again.)
```

### When to use which pipeline

| Pipeline | When | Steps |
|----------|------|--------|
| **Full** | New product, greenfield, major feature | 1 → 2 → 3+4 → 5 → [5b] → 6 → 6b → 7 → 8 → 9 → 10, repeat 6–10 per phase |
| **Medium** | New feature in existing app, multiple stories | 2 → 3+4 → 5 → 7 → 8 (no design phase; PRD is the design reference) |
| **Light** | Bug fix, small UI change, config | 7 only (scope lock + implement) |

Your workflow is coherent and the flow from design to PRD update to execution to validation is clear. The diagram above can live in the rule file or in `docs/` as a reference.
