#!/usr/bin/env bash
set -euo pipefail

if ! command -v git >/dev/null 2>&1; then
  echo "git not available; skipping test guard"
  exit 0
fi

# Include tracked and untracked paths so new feature files are also gated.
changed_files="$(
  {
    git diff --name-only HEAD || true
    git ls-files --others --exclude-standard || true
  } | sed '/^$/d' | sort -u
)"
if [[ -z "${changed_files}" ]]; then
  echo "No changes detected; test guard passed."
  exit 0
fi

feature_touched=0
tests_touched=0

while IFS= read -r file; do
  [[ -z "$file" ]] && continue

  case "$file" in
    app/*|components/*|lib/*|middleware.ts|supabase/migrations/*)
      feature_touched=1
      ;;
  esac

  case "$file" in
    tests/*|playwright.config.ts)
      tests_touched=1
      ;;
  esac
done <<< "$changed_files"

if [[ "$feature_touched" -eq 1 && "$tests_touched" -eq 0 ]]; then
  echo "Feature files changed but no E2E tests were updated."
  echo "Update tests under tests/e2e/ before marking work as ready."
  exit 1
fi

echo "Test guard passed."
