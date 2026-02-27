# AGENTS instructions for stacked-auth-demo

## Definition of done for feature work
- If a feature changes app behavior, add or update Playwright tests under `tests/e2e/` in the same task.
- Run `npm run verify:e2e` before claiming work is ready.
- If tests fail, fix code and/or tests, rerun, and only report readiness after green results.

## E2E expectations
- Use deterministic tests with unique test data (no hard-coded shared entities).
- Prefer workflow assertions (create/update/persist/delete) over static text checks.
- Keep tests idempotent; clean up created records when feasible.
- Avoid brittle class-based selectors for behavior checks.

## Minimum commands before handoff
1. `npm run guard:tests`
2. `npm run test:e2e:unauth`
3. `npm run test:e2e:auth`
