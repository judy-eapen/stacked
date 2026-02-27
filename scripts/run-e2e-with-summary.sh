#!/usr/bin/env bash
set -euo pipefail

echo ""
echo "=== Stacked E2E Coverage Summary ==="
echo "1. Auth: login form, invalid credentials, protected-route redirects, signup/forgot links"
echo "2. Setup: login session bootstrap, display-name step, onboarding completion"
echo "3. Dashboard: nav across Today, Identities, Habits, Review, Partners"
echo "4. Identities: create, edit, delete, and handoff to habit creation"
echo "5. Habits: create, open detail, save contract, delete"
echo "6. Today: habit visibility and complete/incomplete toggling"
echo "7. Partners: invite link generation/copy and partner metrics cards"
echo "8. Settings: profile save path plus export/logout controls"
echo "9. Review: weekly reflection save/persistence and tool routes (history/reset/monthly)"
echo "10. Habit design: design inputs (implementation intention, two-minute rule, temptation bundling) and Today rendering
11. Partners lifecycle: invite -> accept (second account) -> share habit -> partner can view shared habit
12. API automation: authenticated core API health + latency budgets and unauth/cron authorization checks"
echo "====================================="
echo ""

set +e
npx playwright test "$@"
status=$?
set -e

echo ""
echo "=== E2E Result Summary ==="
if [[ "$status" -eq 0 ]]; then
  echo "Status: PASS"
  echo "Coverage: 12 workflow areas (29 tests total in full suite)"
else
  echo "Status: FAIL"
  echo "Coverage attempted: 12 workflow areas"
fi
echo "=========================="

exit "$status"
