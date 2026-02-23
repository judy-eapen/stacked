# Validation Report: Stacked — Phase 6c (Google Calendar Sync)

**Validated:** February 2026  
**PRD:** `stacked-auth-demo/docs/prd/atomic-habits-companion-prd.md`  
**Design Catalog:** N/A (no Phase 6c design catalog)  
**Overall:** Pass with notes

---

## Acceptance Criteria

| User Story | AC | Status | Notes |
|------------|-----|--------|-------|
| US-6c.1 | "Connect Google Calendar" button in settings | Pass | Settings has link/button to `/api/calendar/connect`. |
| US-6c.1 | OAuth flow to authorize calendar access | Pass | GET connect → Google; GET callback exchanges code, encrypts and stores refresh token. |
| US-6c.1 | Each active habit creates a recurring calendar event at time in implementation intention | Pass | `habitToEventPayload` parses time from `implementation_intention`; default 8:00; RRULE:FREQ=DAILY. Callback and sync-habit create events. |
| US-6c.1 | Event includes habit name, two-minute version, and stack context in description | Pass | Summary = name; description includes two-minute version, "After: [behavior]", "Where: [location]" (stack context). |
| US-6c.2 | Creating a new habit adds a calendar event | Pass | Habits page after insert calls POST `/api/calendar/sync-habit` with new habit id. |
| US-6c.2 | Editing a habit updates the event | Pass | `updateHabit` calls sync-habit; API updates existing event by `google_event_id`. |
| US-6c.2 | Archiving a habit deletes the event | Pass | sync-habit sees `archived_at`, deletes event in Google, clears `google_event_id`. |
| US-6c.2 | User can disconnect Google Calendar at any time | Pass | Settings Disconnect button calls POST `/api/calendar/disconnect`; removes connection and deletes events. |

---

## Backend Tasks (PRD)

| Task | Status | Notes |
|------|--------|-------|
| calendar_connections table (id, user_id, google_refresh_token, google_calendar_id, is_active, created_at) | Pass | Migration `20260227100000_phase6c_calendar.sql`. |
| habits.google_event_id | Pass | Migration adds column. |
| /api/calendar/connect | Pass | Redirects to Google OAuth with state cookie. |
| /api/calendar/callback | Pass | Token exchange, encrypt, upsert connection, initial sync of habits. |
| /api/calendar/disconnect | Pass | Deletes events, deletes connection, clears google_event_id. PRD says "revoke token"; implementation does not call Google revoke endpoint (removes from our DB only). |
| Calendar sync on habit CRUD | Pass | sync-habit called from habits page on create, update, archive, restore; disconnect clears events. Delete habit calls sync-habit with remove: true then deletes row. |
| Encryption AES-256-GCM, ENCRYPTION_KEY | Pass | `lib/encrypt.ts`; callback uses encrypt() before store. |

---

## Frontend Tasks (PRD)

| Task | Status | Notes |
|------|--------|-------|
| Settings: Google Calendar connect/disconnect button | Pass | Connect link, Disconnect button when connected. |
| OAuth flow (redirect + callback handling) | Pass | Redirect to connect; callback redirects to settings with ?calendar=connected or ?calendar=error&reason=... |
| Calendar connection status indicator | Pass | "Connected" + Disconnect when calendar_connections row exists; otherwise "Connect Google Calendar". |

---

## Definition of Done

| Item | Status | Notes |
|------|--------|-------|
| All user stories pass | Pass | Verified above. |
| Google Calendar integration tested (connect, sync, edit, archive, disconnect) | Pass | Manual testing; no automated E2E (OAuth requires secrets). |
| Calendar tokens stored securely (encrypted) | Pass | Encrypted at rest via lib/encrypt. |
| Encryption key rotation documented | **Fail** | PRD requires this; no in-repo doc or PRD implementation note yet. |

---

## Design Comparison

No design catalog provided for Phase 6c. Not applicable.

---

## Non-Functional Checks

- [x] Auth: connect/callback/disconnect and sync-habit require authenticated user; RLS on calendar_connections.
- [x] Loading/error: Settings shows connection status; callback redirects with error query params on failure.
- [ ] Encryption key rotation: Not documented (see DoD).
- [x] Redirect URI and env: GOOGLE_REDIRECT_URI used in connect/callback; production and local both supported with correct env.

---

## Issues Found

1. **Encryption key rotation not documented (DoD).** Severity: Low. Add a short note in PRD or `docs/ops/` that rotating ENCRYPTION_KEY requires users to reconnect Google (tokens cannot be re-decrypted).
2. **Disconnect does not revoke token at Google.** Severity: Low. PRD backend task says "revoke token"; code only deletes our row and removes events. Google token remains valid until expiry or user revokes in Google account. Optional: call Google OAuth2 revoke endpoint in disconnect.
3. **Callback success/error only in URL.** Severity: Low. Message lost on refresh; consider toast or brief persistent message (product review already suggested this).

---

## Verdict

**Ready to ship** for friends/solo use. One Definition of Done item missing (encryption key rotation doc); others are optional improvements. Recommend updating PRD from build (step 8b) to add implementation notes (e.g. disconnect does not call Google revoke; key rotation requires re-connect) and to document or defer the key-rotation note.
