# Product Review: Stacked (Phases 1–6c)

**Review date:** February 2026  
**Scope:** Full app per PRD `docs/prd/atomic-habits-companion-prd.md` through Phase 6c (Google Calendar sync).  
**Lens:** Document alignment, product/UX quality, blind spots, edge cases.

---

## 1. Executive Summary

**Verdict:** The product matches the PRD scope and is suitable for friends/solo use. Core Atomic Habits flows (identity → habits → today → review, accountability, notifications, calendar) are implemented. The main gaps are UX polish (feedback, errors, teaching copy), a few edge cases, and one PRD doc gap.

**Strengths**
- Identity-based habits, habit stacking, implementation intentions, and “never miss twice” are implemented and traceable to the PRD.
- Phase 6 (email, push, calendar) is integrated without blocking the core loop; notifications and calendar are opt-in.
- Settings clearly separate Email, Push, and Google Calendar and explain “once per day” / sync behavior.

**Risks**
- Calendar/notification failures are silent or generic; users may not know why sync or reminders failed.
- No in-app guidance that Google Calendar requires adding test users while the app is in Testing mode.
- Encryption key rotation is called out in the PRD Definition of Done but is not documented in-repo.

---

## 2. PRD Alignment

| Area | Status | Notes |
|------|--------|--------|
| Phase 6c user stories | Met | Connect/disconnect, OAuth, recurring events, sync on add/edit/archive, encrypted tokens. |
| Phase 6c AC | Met | Connect, sync, edit/archive/disconnect, encryption implemented. |
| Phase 6 (email/push) | Met | Daily/weekly email, push, once-per-day constraint and copy in place. |
| UX guidelines (PRD §8) | Partial | Empty states and concept explainers exist in PRD; not all pages have been audited for consistent inline explainers. |
| Definition of Done 6c | Partial | “Encryption key rotation documented” not yet done. |

---

## 3. Flow-by-Flow Notes

### 3.1 Settings (Email, Push, Calendar)

- **Email:** “Preferred time (saved for when we support more frequent delivery)” and “Reminders are sent once per day” set correct expectations.
- **Push:** “Browser push once per day” is clear.
- **Calendar:** Copy explains sync behavior. Success/error use query params (`?calendar=connected`, `?calendar=error&reason=...`). If the user refreshes or loses the query string, the success/error message disappears; consider a short-lived toast or persistent “Last connected …” so feedback isn’t lost.
- **Blind spot:** If Connect redirects to Google and the user hits “Access blocked” (app in Testing), the app never shows that state; they only see Google’s page. Adding a line in Settings such as “If Google says ‘Access blocked,’ add your email as a test user in the Google Cloud project” would reduce support load.

### 3.2 Google Calendar (Phase 6c)

- **Connect:** OAuth flow and redirect back to settings work; initial sync of habits to calendar is implemented.
- **Sync:** Create/update/archive/delete habits trigger sync-habit; no user-visible confirmation that “this habit is now on your calendar.” Acceptable for v1; later, a small “Synced to Google Calendar” or calendar icon on the habit could reinforce the feature.
- **Disconnect:** Removes connection and clears `google_event_id`; events are deleted from Google. Clear behavior.
- **Edge case:** If the user revokes access in their Google account (revoke app in Google account security), the next sync will fail. The app does not detect “invalid/revoked token” and surface “Reconnect Google Calendar” in Settings. Recommendation: on sync failure due to 401/403, mark connection as inactive or prompt reconnection.
- **Edge case:** Habits with no implementation intention time get a default (e.g. 8:00). PRD says “at the time specified in its implementation intention”; the default is reasonable but could be called out in Settings (“Habits without a time use 8:00 AM”).

### 3.3 Habits Page

- Calendar sync is triggered in the background after create/update/archive/delete. No loading state or error toast for sync. If sync fails (e.g. network, revoked token), the habit still saves but the calendar event may be missing. Consider: optional “Synced” indicator or a single retry on failure.

### 3.4 Other Flows

- **Onboarding / Today / Review / Partners:** Not re-audited in this pass; PRD and implementation were assumed consistent from prior work. A full pass would check empty states, explainers, and missed-day messaging per PRD §8.

---

## 4. Blind Spots & Edge Cases

| Issue | Severity | Suggestion |
|-------|----------|------------|
| Google “Access blocked” (Testing mode) | Medium | One line in Settings under Calendar: “If Google blocks access, add your email as a test user in your Google Cloud project.” |
| Revoked Google token | Medium | On calendar API 401/403, clear or flag the connection and show “Reconnect” in Settings. |
| Sync-habit fails silently | Low | Optional: toast on sync failure or “Synced to calendar” on success for the last action. |
| Success/error message lost on refresh | Low | Consider toast or brief “Last connected …” so callback feedback survives refresh. |
| Encryption key rotation | Low | Add a short doc (e.g. `docs/ops/encryption-key-rotation.md`) or a PRD implementation note: how to rotate ENCRYPTION_KEY and that users must reconnect Google after rotation. |

---

## 5. High-Impact, Low-Effort Improvements

1. **Settings – Calendar:** Add one sentence for Testing mode: “If Google says ‘Access blocked,’ add your email as a test user in the Google Cloud Console for this app.”
2. **PRD / Implementation note:** Document that encryption key rotation requires users to reconnect Google Calendar (tokens can’t be re-decrypted with a new key).
3. **Callback feedback:** After redirect from Google, show success/error in a way that persists for a few seconds (e.g. toast) so it’s not lost on refresh.
4. **Optional:** On calendar sync 401/403, set `is_active: false` or clear the connection and show “Reconnect Google Calendar” in Settings.

---

## 6. What’s Working Well

- Single source of truth: PRD clearly drives scope; Phase 6c AC and user stories are satisfied.
- Notifications and calendar are additive; the app is usable without them.
- Hobby cron limit is handled with “once per day” copy and behavior; no misleading promises.
- Settings layout (Profile → Email → Push → Calendar → Data → Account) is clear and scannable.

---

## 7. Recommendation

- **Ship as-is** for friends/solo use, with the understanding that Google Testing mode and revoked tokens are the main support pitfalls.
- **Apply the quick wins** above (Settings copy for Testing mode, encryption note, optional callback toast) when convenient.
- **Next validation:** Run `/validate` against the PRD to confirm all AC and then update the PRD from build (step 8b) if anything diverged.
