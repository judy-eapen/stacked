# E2E test suite (Playwright)

Automation tests for Stacked that cover real functional workflows across auth, dashboard, identities, habits, today, partners, settings, and review.

## Prerequisites

- App runs at `http://localhost:3000`, or set `PLAYWRIGHT_BASE_URL`.
- **Authenticated tests** need a real Supabase user. Set in `.env.test` or in the shell:
  - `TEST_USER_EMAIL` — email of the test user
  - `TEST_USER_PASSWORD` — password

Use a dedicated test account in your Supabase project (or a separate test project). The setup run will log in once and reuse the session for all authenticated specs.

## Run tests

```bash
# Install browsers (first time only)
npx playwright install chromium

# Run all E2E tests (runs unauthenticated + setup + authenticated)
# This command now prints a workflow coverage summary before execution
# and a concise pass/fail summary at the end.
npm run test:e2e

# Run only unauthenticated auth tests (no TEST_USER_* needed)
npx playwright test auth.spec.ts --project=unauthenticated

# Run only authenticated tests (requires TEST_USER_* and successful setup)
npx playwright test --project=authenticated

# Enforce "feature changes must include test updates"
npm run guard:tests

# Recommended quality gate before saying work is ready
npm run verify:e2e

# Run with UI
npx playwright test --ui
```

## What’s covered

| Area | Flows |
|------|--------|
| **Auth** | Login form, invalid credentials, protected-route redirects, signup/forgot links |
| **Setup** | One-time login, display-name handling, onboarding completion, session reuse |
| **Dashboard** | Main navigation to Today / Identities / Habits / Review / Partners |
| **Identities** | Create, edit, delete identity; habit-prompt handoff |
| **Habits** | Create habit, open detail, save contract, delete habit |
| **Today** | Habit appears on Today, toggle complete/incomplete |
| **Partners** | Generate invite/copy flow, metrics cards, and full lifecycle (invite acceptance, habit sharing, partner-side visibility) |
| **API** | Authenticated API health + latency checks (habits/today, review summary, partners, export, habit-specific endpoints) and unauth/cron authorization checks |
| **Settings** | Save/persist display name; export/logout controls |
| **Review** | Save weekly reflection + persistence; history/reset/monthly routes |
| **Habit Design** | Fill design inputs (implementation intention, two-minute rule, temptation bundling) and verify rendering in Today |

## CI

In CI, set `CI=true`, `TEST_USER_EMAIL`, and `TEST_USER_PASSWORD`. Do not start the dev server in CI; Playwright `webServer` is disabled when `CI` is set, so point `PLAYWRIGHT_BASE_URL` at a running environment.
