# PRD: Stacked — Build Habits That Compound

## 1. Executive Summary

### Problem

People read Atomic Habits and want to implement its system (habit scorecard, identity-based habits, habit stacking, temptation bundling, implementation intentions, streak tracking). Today they use a combination of pen and paper, messaging apps, and paper calendars. No existing app implements the full methodology. The official Atoms app costs $10/month and skips key concepts (scorecard, stacking, bundling, implementation intentions).

### Target Users

- Primary: People who have read (or are reading) Atomic Habits and want a structured tool to implement the system
- Initial: The builder and their friends (5-20 users)
- Future: Broader audience of Atomic Habits readers and habit-building enthusiasts

### Business Objective

- Personal project and Cursor/development learning
- Validate product-market fit with friends
- Monetize later if the product proves useful

### Success Metrics

| Metric | Target | Timeframe |
|--------|--------|-----------|
| Daily active users (builder + friends) | 5+ | Month 1 |
| Daily habit check-in rate | 70%+ of active users check in daily | Month 2 |
| Scorecard completion | 80%+ of new users complete a scorecard | First week |
| Retention (weekly) | 60%+ return after week 1 | Month 2 |
| Accountability partner adoption | 50%+ of users invite at least one partner | Month 3 |

---

## 2. Scope

### In Scope

- User registration and authentication (email + social login)
- Habit Scorecard: list current habits, tag each as +, -, or =
- Identity Design: create identity statements, link habits to identities
- Habit Design: implementation intentions, habit stacking, temptation bundling, two-minute rule
- Daily Tracker: today view, one-tap completion, "never miss twice" streak logic
- Review & Reflect: weekly review prompts, monthly identity check, habit graduation
- Accountability Partner: invite via link, read-only shared view, habit contract
- Responsive web app (mobile-friendly, desktop-friendly)
- Deployment on Vercel with Supabase backend
- Email reminders: daily check-in reminder emails and habit summary digests (via Resend)
- Push notifications: browser-based push notifications for habit reminders (via OneSignal)
- Google Calendar sync: export habits as calendar events with reminders

### Out of Scope

- Native mobile apps (iOS/Android)
- Gamification (XP, badges, levels, leaderboards)
- Public social feed or community features
- AI coaching or daily lesson content
- Payment/subscription system (deferred to future)
- Offline mode / PWA service worker caching (deferred to future)
- Data import (deferred to future; CSV export included in Phase 4)

---

## 3. Roles & Permissions

### Roles

| Role | Description |
|------|-------------|
| **User** | Registered user who owns their data. Full CRUD on all their own entities. |
| **Accountability Partner** | A user who has been granted read-only access to another user's shared habits and progress. |

A single person can be both a User (for their own data) and an Accountability Partner (for someone else's data).

### Role-Based Visibility

| Data | User (own data) | Accountability Partner |
|------|-----------------|----------------------|
| Scorecard | Full view + edit | No access |
| Identities | Full view + edit | View names only (context for shared habits) |
| Habits (shared) | Full view + edit | View habit name, streak, completion status |
| Habits (not shared) | Full view + edit | No access |
| Daily completions | Full view + mark complete | View only (shared habits) |
| Reviews | Full view + edit | View weekly summaries (shared habits) |
| Habit Contract | Full view + edit | View contract text |
| Partner list | View + manage | View who they're partnered with |

### Role-Based Actions

| Action | User | Accountability Partner |
|--------|------|----------------------|
| Create/edit/delete scorecard entries | Yes | No |
| Create/edit/delete identities | Yes | No |
| Create/edit/delete habits | Yes | No |
| Mark habit complete/incomplete | Yes | No |
| Create/edit reviews | Yes | No |
| Invite partner | Yes | No |
| Accept partner invitation | Yes | N/A |
| View shared progress | N/A | Yes (read-only) |
| Remove partnership | Yes (either side) | Yes (either side) |

### Enforcement Layer

- **Backend (Supabase RLS):** All data access enforced via Row Level Security policies. Users can only read/write their own rows. Partners can only read rows explicitly shared with them via the partnership table.
- **Frontend:** UI hides actions and data the current role cannot access. This is a UX convenience; security is enforced at the database level.

---

## 4. Data Model

### Entity: User (extends Supabase auth.users)

| Field | Type | Required | Default | Validation |
|-------|------|----------|---------|------------|
| id | uuid | Yes | auth.uid() | Supabase-managed |
| email | string | Yes | — | Valid email, unique |
| display_name | string | Yes | — | 1-50 chars |
| avatar_url | string | No | null | Valid URL or null |
| created_at | timestamptz | Yes | now() | Auto-set |
| updated_at | timestamptz | Yes | now() | Auto-set on update |

**Table:** `profiles` (public schema, linked to auth.users via id)
**Indexes:** Primary key on `id`
**Relationships:** 1:many with all other entities
**Notes:** Supabase auth.users handles email/password. `profiles` stores app-specific user data. Created via a database trigger on auth.users insert.

---

### Entity: Scorecard Entry

| Field | Type | Required | Default | Validation |
|-------|------|----------|---------|------------|
| id | uuid | Yes | gen_random_uuid() | — |
| user_id | uuid | Yes | — | FK to profiles.id |
| habit_name | string | Yes | — | 1-200 chars |
| rating | enum | Yes | — | '+', '-', '=' |
| time_of_day | enum | No | null | 'morning', 'afternoon', 'evening', 'anytime' |
| sort_order | integer | Yes | 0 | >= 0 |
| created_at | timestamptz | Yes | now() | Auto-set |
| updated_at | timestamptz | Yes | now() | Auto-set on update |

**Table:** `scorecard_entries`
**Indexes:** `(user_id, sort_order)`, primary key on `id`
**Relationships:** Belongs to User. Can optionally be linked from a Habit (habit references a scorecard entry as its stack anchor).
**RLS:** User can CRUD own rows only.

---

### Entity: Identity

| Field | Type | Required | Default | Validation |
|-------|------|----------|---------|------------|
| id | uuid | Yes | gen_random_uuid() | — |
| user_id | uuid | Yes | — | FK to profiles.id |
| statement | string | Yes | — | 1-500 chars, e.g. "I am a person who writes every day" |
| sort_order | integer | Yes | 0 | >= 0 |
| created_at | timestamptz | Yes | now() | Auto-set |
| updated_at | timestamptz | Yes | now() | Auto-set on update |

**Table:** `identities`
**Indexes:** `(user_id, sort_order)`, primary key on `id`
**Relationships:** Belongs to User. 1:many with Habits.
**RLS:** User can CRUD own rows only.

---

### Entity: Habit

| Field | Type | Required | Default | Validation |
|-------|------|----------|---------|------------|
| id | uuid | Yes | gen_random_uuid() | — |
| user_id | uuid | Yes | — | FK to profiles.id |
| identity_id | uuid | No | null | FK to identities.id (nullable for unlinked habits) |
| name | string | Yes | — | 1-200 chars |
| two_minute_version | string | No | null | 1-200 chars |
| implementation_intention | jsonb | No | null | `{ behavior, time, location }` |
| stack_anchor_scorecard_id | uuid | No | null | FK to scorecard_entries.id ON DELETE SET NULL |
| stack_anchor_habit_id | uuid | No | null | FK to habits.id ON DELETE SET NULL |
| temptation_bundle | string | No | null | 1-500 chars, description of the reward habit |
| frequency | enum | Yes | 'daily' | 'daily', 'weekdays', 'weekends', 'custom' |
| custom_days | jsonb | No | null | Array of day numbers [0-6] when frequency='custom' |
| is_active | boolean | Yes | true | — |
| is_shared | boolean | Yes | false | Whether accountability partners can see this habit |
| sort_order | integer | Yes | 0 | >= 0 |
| current_streak | integer | Yes | 0 | >= 0, denormalized for performance |
| last_completed_date | date | No | null | Last date this habit was completed |
| created_at | timestamptz | Yes | now() | Auto-set |
| updated_at | timestamptz | Yes | now() | Auto-set on update |
| archived_at | timestamptz | No | null | Soft delete / archive |

**Table:** `habits`
**Indexes:** `(user_id, is_active, sort_order)`, `(identity_id)`, primary key on `id`
**Constraints:** CHECK: at most one of `stack_anchor_scorecard_id` and `stack_anchor_habit_id` can be non-null.
**Relationships:** Belongs to User. Belongs to Identity (optional). Has many HabitCompletions. Optional FK to a scorecard entry or another habit as stack anchor (with ON DELETE SET NULL for both).
**RLS:** User can CRUD own rows. Accountability partners can SELECT rows where `is_shared = true` via partnership table join.
**Notes:** `current_streak` and `last_completed_date` are denormalized from habit_completions for fast Today view queries. Updated on each completion/uncompletion via the `/api/habits/:habitId/complete` endpoint. Full recalculation from history only needed when backfilling past dates.

---

### Entity: Habit Completion

| Field | Type | Required | Default | Validation |
|-------|------|----------|---------|------------|
| id | uuid | Yes | gen_random_uuid() | — |
| habit_id | uuid | Yes | — | FK to habits.id |
| user_id | uuid | Yes | — | FK to profiles.id (denormalized for RLS) |
| completed_date | date | Yes | — | Date of completion (not timestamp) |
| completed | boolean | Yes | true | — |
| created_at | timestamptz | Yes | now() | Auto-set |

**Table:** `habit_completions`
**Indexes:** `UNIQUE (habit_id, completed_date)`, `(user_id, completed_date)`, primary key on `id`
**Relationships:** Belongs to Habit. Belongs to User.
**RLS:** User can CRUD own rows. Partners can SELECT completions for shared habits.
**Notes:** One row per habit per day. Use UPSERT (INSERT ... ON CONFLICT (habit_id, completed_date) DO UPDATE) to toggle completions. Always keep the row; toggle the `completed` boolean. This avoids "does the row exist?" checks and keeps data consistent. The unique constraint on `(habit_id, completed_date)` enforces one row per habit per day.

---

### Entity: Review

| Field | Type | Required | Default | Validation |
|-------|------|----------|---------|------------|
| id | uuid | Yes | gen_random_uuid() | — |
| user_id | uuid | Yes | — | FK to profiles.id |
| review_type | enum | Yes | — | 'weekly', 'monthly' |
| review_date | date | Yes | — | Start date of the review period |
| wins | text | No | null | Free text: what went well |
| struggles | text | No | null | Free text: what was hard |
| identity_reflection | text | No | null | Free text: am I becoming who I want to be? |
| adjustments | text | No | null | Free text: what to change |
| created_at | timestamptz | Yes | now() | Auto-set |
| updated_at | timestamptz | Yes | now() | Auto-set on update |

**Table:** `reviews`
**Indexes:** `UNIQUE (user_id, review_type, review_date)`, primary key on `id`
**Relationships:** Belongs to User.
**RLS:** User can CRUD own rows. Partners can SELECT reviews for users they partner with (summary only).

---

### Entity: Partnership

| Field | Type | Required | Default | Validation |
|-------|------|----------|---------|------------|
| id | uuid | Yes | gen_random_uuid() | — |
| user_id | uuid | Yes | — | FK to profiles.id (the person sharing their habits) |
| partner_id | uuid | Yes | — | FK to profiles.id (the person viewing) |
| status | enum | Yes | 'pending' | 'pending', 'accepted', 'declined', 'removed' |
| invite_token | string | Yes | — | Unique token for invite link |
| created_at | timestamptz | Yes | now() | Auto-set |
| accepted_at | timestamptz | No | null | — |

**Table:** `partnerships`
**Indexes:** `UNIQUE (user_id, partner_id)`, `UNIQUE (invite_token)`, primary key on `id`
**Relationships:** References two Users. Governs data access for accountability features.
**RLS:** Either party can SELECT. Only user_id can create. Either party can update status to 'removed'.

---

### Entity: Habit Contract

| Field | Type | Required | Default | Validation |
|-------|------|----------|---------|------------|
| id | uuid | Yes | gen_random_uuid() | — |
| user_id | uuid | Yes | — | FK to profiles.id |
| habit_id | uuid | Yes | — | FK to habits.id |
| commitment | text | Yes | — | 1-1000 chars, the commitment statement |
| consequence | text | No | null | 1-500 chars, what happens if they fail |
| start_date | date | Yes | — | — |
| end_date | date | No | null | Optional end date |
| witness_partner_id | uuid | No | null | FK to profiles.id (the accountability partner) |
| created_at | timestamptz | Yes | now() | Auto-set |

**Table:** `habit_contracts`
**Indexes:** `(user_id)`, `(habit_id)`, primary key on `id`
**Relationships:** Belongs to User. References a Habit. Optionally references a Partner as witness.
**RLS:** User can CRUD own rows. Witness partner can SELECT.

---

### Entity Relationship Summary

```
User (profiles)
├── has many Scorecard Entries
├── has many Identities
│   └── has many Habits
│       ├── has many Habit Completions
│       └── has one Habit Contract (optional)
├── has many Reviews
├── has many Partnerships (as user_id — sharing out)
└── has many Partnerships (as partner_id — viewing in)
```

---

## 5. API Contracts

All endpoints are Next.js API routes under `/api/`. All require authentication via Supabase session token in the `Authorization` header unless noted otherwise.

### Authentication

Handled by Supabase Auth using `@supabase/ssr` (the Next.js server-side package) for secure httpOnly cookie-based session management. This is required instead of the base `@supabase/supabase-js` client, which stores tokens in localStorage (vulnerable to XSS).

Setup: `@supabase/ssr` + `@supabase/supabase-js` together. The SSR package handles cookie storage and middleware for route protection. Auth methods available:
- `supabase.auth.signUp()` — email/password registration
- `supabase.auth.signInWithPassword()` — email login
- `supabase.auth.signInWithOAuth()` — social login (Google)
- `supabase.auth.signOut()` — logout
- `supabase.auth.getSession()` — get current session (reads from httpOnly cookie)

Next.js middleware verifies the session cookie on protected routes. No custom auth endpoints needed.

For data operations, the Supabase client SDK is used directly from the frontend with RLS enforcement. API routes are used only where server-side logic is needed (e.g., invite link generation, complex queries).

---

### POST /api/partnerships/invite

**Purpose:** Generate an invite link for an accountability partner.

**Auth:** Required (user must be logged in).

**Request:**
```json
{
  "message": "Hey, want to be my accountability partner on Atomic Habits?"
}
```

**Response (201):**
```json
{
  "invite_url": "https://app.example.com/invite/abc123token",
  "invite_token": "abc123token",
  "expires_at": "2026-03-05T00:00:00Z"
}
```

**Error cases:**
- 401: Not authenticated
- 429: Rate limit (max 10 invites per day)

---

### POST /api/partnerships/accept

**Purpose:** Accept a partnership invitation via token.

**Auth:** Required (partner must be logged in or will be prompted to sign up).

**Request:**
```json
{
  "invite_token": "abc123token"
}
```

**Response (200):**
```json
{
  "partnership_id": "uuid",
  "user_display_name": "Judy",
  "status": "accepted"
}
```

**Error cases:**
- 401: Not authenticated
- 404: Token not found or expired
- 409: Partnership already exists
- 422: Cannot partner with yourself

---

### GET /api/partners/:partnerId/shared

**Purpose:** Get a partner's shared habits, streaks, and recent completions (read-only view for accountability partner).

**Auth:** Required. Caller must have an accepted partnership with the target user.

**Response (200):**
```json
{
  "partner": {
    "display_name": "Judy",
    "avatar_url": "https://..."
  },
  "habits": [
    {
      "id": "uuid",
      "name": "Write for 2 minutes",
      "identity": "I am a writer",
      "current_streak": 5,
      "longest_streak": 12,
      "completed_today": true,
      "completions_this_week": 5,
      "contract": {
        "commitment": "I will write every day for 30 days",
        "consequence": "I buy my partner coffee",
        "start_date": "2026-02-01",
        "end_date": "2026-03-03"
      }
    }
  ],
  "latest_review": {
    "review_type": "weekly",
    "review_date": "2026-02-17",
    "wins": "Hit 5-day streak on writing",
    "struggles": "Missed meditation twice"
  }
}
```

**Error cases:**
- 401: Not authenticated
- 403: No active partnership with this user
- 404: Partner not found

---

### GET /api/habits/today

**Purpose:** Get today's habit checklist with completion status and streak data. This is the primary daily-use endpoint.

**Auth:** Required.

**Response (200):**
```json
{
  "date": "2026-02-19",
  "days_since_last_visit": 0,
  "habits": [
    {
      "id": "uuid",
      "name": "Journal for 2 minutes",
      "identity": "I am a reflective person",
      "identity_id": "uuid",
      "two_minute_version": "Open journal and write one sentence",
      "implementation_intention": {
        "behavior": "Journal",
        "time": "7:00 AM",
        "location": "Kitchen table"
      },
      "stack_context": "After morning coffee",
      "temptation_bundle": "Then I get to check social media for 5 minutes",
      "time_of_day": "morning",
      "completed_today": false,
      "current_streak": 3,
      "consecutive_misses": 0,
      "total_completions": 45,
      "missed_yesterday": false
    }
  ]
}
```

**Notes:**
- Streak logic uses "never miss twice" rule. `current_streak` counts consecutive days where the user did not miss two days in a row. A single missed day does not reset the streak; two consecutive misses do.
- `days_since_last_visit`: number of days since the user's last habit completion (or last login). Used by the frontend to trigger the welcome-back banner when >= 7.
- `consecutive_misses`: number of consecutive days this habit was missed (0 = completed yesterday or today, 1 = missed yesterday only, 2+ = streak was reset). Used by the frontend for missed-day messaging.
- `total_completions`: lifetime completion count for this habit. Shown in missed-day messaging to reassure the user ("you've completed this 45 times total").
- `identity` and `identity_id`: used by the frontend for identity vote feedback on completion.
- `time_of_day`: from the habit's implementation intention or scorecard anchor. Used for grouping habits in the Today view when user has 10+ habits.

---

### POST /api/habits/:habitId/complete

**Purpose:** Mark a habit as complete for today (or uncomplete it).

**Auth:** Required. User must own the habit.

**Request:**
```json
{
  "date": "2026-02-19",
  "completed": true
}
```

**Response (200):**
```json
{
  "habit_id": "uuid",
  "date": "2026-02-19",
  "completed": true,
  "current_streak": 4,
  "identity": "I am a reflective person",
  "identity_id": "uuid",
  "all_completed_today": false,
  "remaining_count": 2
}
```

**Notes:**
- `identity` and `identity_id`: returned so the frontend can display the identity vote feedback ("1 vote for [identity]") without a second request. Null if the habit has no linked identity.
- `all_completed_today`: true when this completion was the last remaining habit for the day. Used to trigger the daily completion celebration.
- `remaining_count`: number of habits still incomplete for today. Used to update the browser tab title ("Stacked (N remaining)").

**Error cases:**
- 401: Not authenticated
- 403: Not the habit owner
- 404: Habit not found
- 422: Invalid date (future dates not allowed; past dates allowed up to 7 days back for corrections)

---

### GET /api/habits/:habitId/streaks

**Purpose:** Get streak history and completion data for a single habit.

**Auth:** Required. User must own the habit (or be a partner for shared habits).

**Query params:**
- `from` (date, optional): Start of date range. Default: 30 days ago.
- `to` (date, optional): End of date range. Default: today.

**Response (200):**
```json
{
  "habit_id": "uuid",
  "habit_name": "Journal for 2 minutes",
  "current_streak": 4,
  "longest_streak": 12,
  "total_completions": 45,
  "completion_rate": 0.75,
  "completions": [
    { "date": "2026-02-19", "completed": true },
    { "date": "2026-02-18", "completed": true },
    { "date": "2026-02-17", "completed": false },
    { "date": "2026-02-16", "completed": true }
  ]
}
```

**Pagination:** Not paginated. Date range limits the result set. Max range: 365 days.

---

### Standard CRUD Endpoints

The following entities use Supabase client SDK directly (no custom API route needed). RLS policies enforce access.

| Entity | Operations | Notes |
|--------|-----------|-------|
| Scorecard Entries | SELECT, INSERT, UPDATE, DELETE | Filtered by user_id via RLS |
| Identities | SELECT, INSERT, UPDATE, DELETE | Filtered by user_id via RLS |
| Habits | SELECT, INSERT, UPDATE, DELETE | Filtered by user_id via RLS. Partners can SELECT shared habits. |
| Reviews | SELECT, INSERT, UPDATE, DELETE | Filtered by user_id via RLS |
| Habit Contracts | SELECT, INSERT, UPDATE, DELETE | Filtered by user_id via RLS. Witness can SELECT. |

---

## 6. State Management (Frontend)

### Global State (React Context / Zustand)

| State | Source | Update trigger |
|-------|--------|---------------|
| Current user session | Supabase auth listener | Login, logout, page load |
| User profile | Supabase query on auth | Login, profile edit |
| Today's habits | `/api/habits/today` | Page load, habit completion, habit CRUD |
| Partnerships | Supabase query | Page load, invite accept/decline |

### Local Component State

| Component | State | Notes |
|-----------|-------|-------|
| Scorecard editor | Entry list, draft entry | Local until save |
| Identity editor | Identity list, draft identity | Local until save |
| Habit design form | Form fields (name, intention, stack, bundle, 2-min) | Multi-step form, local until submit |
| Review form | Form fields (wins, struggles, reflection, adjustments) | Local until save |
| Today view | Optimistic completion toggles | Optimistic update, revert on error |
| Partner invite modal | Invite URL, copy state | Local |

### Loading States

- Skeleton loaders for today view, scorecard, habits list
- Inline spinners for save/update actions
- Full-page loader only on initial auth check

### Error States

- Toast notifications for failed saves/updates with retry option
- Inline error messages on form validation failures
- Full-page error boundary for unexpected crashes with "Reload" button
- "No connection" banner if Supabase is unreachable

### Optimistic Updates

- Habit completion toggle: immediately update UI, revert if server call fails
- Scorecard rating change: immediately update UI, revert on failure

### Cache Strategy

- Use React Query (TanStack Query) for server state caching
- `staleTime: 5 minutes` for habits list, scorecard, identities
- `staleTime: 1 minute` for today's completions
- Invalidate relevant queries on mutation success
- No offline cache in v1

---

## 7. Phased Plan

### Phase 1 — Foundation: Auth + Scorecard + Identities

**Design catalog:** docs/design/stacked-phase-1-designs.md

**Goal:** User can sign up, log in, create a Habit Scorecard, define identities, and link them together. Delivers the first two steps of the Atomic Habits methodology.

**User Stories:**

- US-1.1: As a new user, I want to sign up with email/password or Google so I can create an account.
  - AC: User can register, receives confirmation email, can log in. Google OAuth works.
- US-1.1b: As a new user, I want to set my display name after signing up so my accountability partner can identify me.
  - AC: After first login, user is prompted to set a display name (pre-filled from Google profile if available). Required before accessing the app. Editable later in settings.
- US-1.2: As a user, I want to list my current daily habits and mark each as +, -, or = so I can see my habits clearly.
  - AC: User can add habits to scorecard, assign rating, reorder them, edit, and delete.
- US-1.3: As a user, I want to group scorecard entries by time of day (morning/afternoon/evening) so my scorecard mirrors my actual routine.
  - AC: Entries can be tagged with time_of_day. View groups by time.
- US-1.4: As a user, I want to write identity statements ("I am a person who...") so I can define who I want to become.
  - AC: User can create, edit, delete, and reorder identity statements.
- US-1.5: As a user, I want to see a summary of my scorecard (count of +, -, =) so I can assess my current habits at a glance.
  - AC: Summary shows counts and percentages.
- US-1.6: As a user, after completing my scorecard, I want the app to highlight my (-) habits and prompt me to take action so I can turn awareness into behavior change.
  - AC: After adding 3+ scorecard entries, the summary page shows a "Take Action" callout listing (-) rated habits. Each (-) habit has a "Work on this" action that navigates to habit creation with the scorecard entry pre-filled as the stack anchor. Callout is dismissible and reappears when new (-) entries are added.

**Backend Tasks:**
- Set up Supabase project (database, auth, RLS)
- Create `profiles` table + trigger from auth.users
- Create `scorecard_entries` table with RLS policies
- Create `identities` table with RLS policies
- Configure Supabase Auth (email + Google OAuth)

**Frontend Tasks:**
- Set up Next.js project with Tailwind CSS + shadcn/ui
- Auth pages (sign up, login, forgot password)
- Layout: sidebar nav + main content area
- Scorecard page: list, add, edit, delete, reorder, rating toggle
- Identities page: list, add, edit, delete, reorder
- Scorecard summary component with "Take Action" callout for (-) habits
- First-run guided flow: after display name is set, direct user to Scorecard with a welcome message explaining the first step. Sidebar highlights the recommended next page (Scorecard -> Identities -> Habits). Flow is suggestive, not blocking.
- Empty states for all Phase 1 pages (see UX Design Guidelines in Section 8)
- Concept explainer subtitles on all methodology terms (see UX Design Guidelines in Section 8)
- "Add to Home Screen" dismissible banner on mobile browsers (PWA manifest meta tags for icon and app name, no service worker). Banner shows instructional copy (e.g. "Tap your browser menu (⋮) then Add to Home Screen"); primary CTA is "Got it" (dismiss). No programmatic install in Phase 1.
- Web app manifest (`manifest.json`) with app name "Stacked", theme color, and icons for home screen install
- Sidebar and mobile header both show "Next step" badge on Scorecard link
- Scorecard add form: default rating "=", default time "Anytime"
- Settings: Save display name shows "Saved" feedback (execution adds API and error handling)
- Identity edit: statement only; re-linking habits to an identity = delete and recreate in Phase 1
- Display name: "Skip for now" allowed; execution may gate other flows (e.g. partner features) on display name being set
- Loading and error states for Scorecard and Identities to be added in execution

**Acceptance Criteria:**
- User can register, log in, and log out
- Scorecard CRUD works with real-time UI updates
- Identities CRUD works
- RLS prevents users from seeing other users' data
- Responsive on mobile and desktop
- First-time user sees guided flow pointing them to the Scorecard
- Every page has a meaningful empty state with guidance text and a clear next action
- All methodology terms display a one-line explainer subtitle
- "Add to Home Screen" banner appears on mobile (dismissible, does not reappear after dismissal)

**Definition of Done:**
- All user stories pass acceptance criteria
- RLS policies tested (cannot access other user's data)
- Deployed to Vercel, connected to Supabase
- Basic error handling (toast on failure, form validation)
- Empty states verified on all pages
- Web app manifest validated (icon appears on home screen when installed)

---

### Phase 2 — Habit Design: Implementation Intentions, Stacking, Bundling

**Goal:** User can create habits under identities with full Atomic Habits methodology: implementation intention, habit stacking, temptation bundling, and two-minute rule. This is the "design your habits" step.

**User Stories:**

- US-2.1: As a user, I want to quickly add a new habit so I can start tracking it without friction, and optionally design it with the full methodology later.
  - AC: **Quick-add mode (default):** Only habit name is required. Identity selector is optional. One screen, one tap to create. **Full design mode:** Expandable "Design this habit" section reveals all methodology fields (intention, stack, bundle, two-minute version). Available during creation or later via a "Design this habit" action on any habit card. Habit appears under the chosen identity (or in an "Unlinked" group if no identity is selected).
- US-2.2: As a user, I want to set an implementation intention ("I will [X] at [time] in [location]") for each habit so I have a concrete plan.
  - AC: Structured form with behavior, time, location fields. Stored and displayed on the habit card.
- US-2.3: As a user, I want to stack a new habit on an existing habit or scorecard entry ("After [X], I will [Y]") so I can leverage existing routines.
  - AC: Habit creation shows existing habits/scorecard entries as anchor options. Stack chain is visible.
- US-2.4: As a user, I want to set a temptation bundle ("After [new habit], I get to [reward]") so the habit is more attractive.
  - AC: Optional text field for the reward. Displayed alongside the habit.
- US-2.5: As a user, I want to define the two-minute version of my habit so I start small.
  - AC: Text field for the two-minute version. Displayed on the daily tracker as the actionable version.
- US-2.6: As a user, I want to see all my habits organized by identity with their design details (intention, stack, bundle, 2-min) so I can review my full habit system.
  - AC: Habits page shows habits grouped under identities with all metadata visible. Habits without an identity appear in an "Unlinked Habits" group. Each habit card shows a "Design this habit" prompt if methodology fields are empty.
- US-2.7: As a user, I want to archive a habit I no longer need and restore it later if I change my mind.
  - AC: Habit card has an "Archive" action. Archived habits disappear from the Habits list and Today view. An "Archived" section (collapsed by default) appears on the Habits page showing archived habits with a "Restore" action. Restoring un-archives the habit (sets `archived_at` to null). Streak restarts from 0 on restore; completion history is preserved.

**Backend Tasks:**
- Create `habits` table with RLS policies
- Support JSONB field for implementation_intention
- Polymorphic reference for stack_anchor (scorecard_entry or habit)

**Frontend Tasks:**
- Habit creation form with quick-add mode (name + optional identity) and expandable "Design this habit" section for methodology fields
- "Design this habit" action on habit cards with empty methodology fields
- Habits list page grouped by identity (plus "Unlinked Habits" group)
- Habit detail card showing all design metadata
- Habit edit, delete, archive, and restore
- Archived habits section (collapsed by default) on Habits page
- Visual habit stack chain view
- Empty states for Habits page (no habits, no identities)

**Acceptance Criteria:**
- Quick-add habit creation works with just a name (one screen, one tap)
- Full methodology fields are accessible via expandable section during creation or via "Design this habit" on existing habits
- All methodology fields are stored and displayed correctly
- Habits can be stacked on scorecard entries or other habits
- Habits can be edited, deleted, archived, and restored
- Habits page shows organized view by identity with "Unlinked Habits" group
- Archived habits section shows archived habits and supports restore

**Definition of Done:**
- All user stories pass
- Habit data persists correctly in Supabase
- Edit/delete/archive/restore works without orphaning data
- Responsive on mobile

---

### Phase 3 — Daily Tracker: Completion, Streaks, Today View

**Goal:** User has a daily "Today" view where they check off habits, see streaks with "never miss twice" logic, and have a fast daily check-in experience.

**User Stories:**

- US-3.1: As a user, I want to see my habits for today in a single view so I can check them off quickly, with identity reinforcement on each completion.
  - AC: Today page shows active habits for the current day (respecting frequency). One-tap toggle to complete. When a habit linked to an identity is completed, a subtle inline message appears: "1 vote for '[identity statement]'." When all habits for the day are completed, a daily summary appears: "Today you cast X votes for '[identity A]', Y votes for '[identity B]'." Habits are grouped by time of day (morning / afternoon / evening / anytime) if the user has 10+ habits, or shown as a flat list for fewer habits. Browser tab title updates dynamically: "Stacked (N remaining)" where N is the count of incomplete habits for today.
- US-3.2: As a user, I want to see my current streak for each habit with encouraging messaging when I miss days so I stay motivated instead of feeling guilty.
  - AC: Streak count displayed per habit. Uses "never miss twice" logic (single miss doesn't reset; two consecutive misses reset to 0). Three messaging states based on streak status:
    - **Missed 1 day:** Habit card shows: "You missed yesterday. Do it today and your streak continues. Never miss twice." (encouraging tone, references the book's rule)
    - **Missed 2+ consecutive days (streak reset):** Habit card shows: "Fresh start. Your history isn't gone — you've completed this habit N times total. Pick up where you left off." (non-punitive, surfaces lifetime completions alongside the reset streak)
    - **Returned after 7+ days of inactivity (any habit):** Today view shows a "Welcome back" banner at the top before the habit list: "Welcome back. Here's where things stand." Below the banner: summary of current streaks (preserved and reset), total lifetime completions, and a single call to action: "Check in today." Banner is dismissible.
- US-3.3: As a user, I want to see contextual info (stack anchor, implementation intention) on the today view so I remember my plan.
  - AC: Each habit card shows the stack context ("After morning coffee") and time/location if set.
- US-3.4: As a user, I want to mark habits complete for past days (up to 7 days back) so I can backfill if I forgot to check in.
  - AC: Calendar/date picker allows selecting past 7 days. Can mark complete or incomplete for those dates.
- US-3.5: As a user, I want to see a visual completion calendar (heatmap or dot grid) for each habit so I can see patterns over time.
  - AC: Habit detail shows last 30 days as a grid. Completed days are filled, missed days are empty.
- US-3.6: As a user, I want to see a celebration moment when I complete all my habits for the day so I feel accomplished.
  - AC: When the last habit for the day is marked complete, the Today view shows a completion summary: "All done for today!" with identity vote totals for the day (e.g., "5 votes for 'I am a writer', 3 votes for 'I am healthy'"). The celebration is subtle (no confetti or animation), just a clear, warm acknowledgment. Dismissible; Today view returns to showing the completed list.

**Backend Tasks:**
- Create `habit_completions` table with RLS policies and unique constraint
- Implement `/api/habits/today` endpoint with streak calculation and identity vote data
- Implement `/api/habits/:habitId/complete` endpoint (returns updated streak + identity info for vote feedback)
- Implement `/api/habits/:habitId/streaks` endpoint
- "Never miss twice" streak algorithm
- Return `total_completions` (lifetime) per habit in the today endpoint for missed-day messaging
- Return `days_since_last_visit` in the today endpoint (derived from last completion or last login) for welcome-back detection

**Frontend Tasks:**
- Today page with habit list and completion toggles
- Identity vote inline feedback on habit completion ("1 vote for [identity]")
- Daily completion celebration with identity vote summary
- Streak badge per habit with contextual missed-day messaging (3 states)
- Welcome-back banner for users returning after 7+ days of inactivity
- Dynamic browser tab title: "Stacked (N remaining)"
- Today view grouping by time of day for users with 10+ habits
- Optimistic toggle (instant UI feedback)
- Past-day completion editor (date picker + habit list)
- Habit detail page with completion calendar/heatmap
- Habit frequency filtering (show only habits scheduled for today)
- Empty state for Today view (no habits yet)

**Acceptance Criteria:**
- Today view loads in under 1 second
- Completion toggle responds instantly (optimistic update)
- Identity vote feedback appears on each completion for identity-linked habits
- Completion celebration appears when all today's habits are done
- Streak logic correctly implements "never miss twice"
- Missed-day messaging shows correct state (1 miss, 2+ misses, 7+ day absence)
- Welcome-back banner appears after 7+ days of inactivity with summary and is dismissible
- Browser tab title reflects remaining habit count
- Today view groups habits by time of day when user has 10+ habits
- Past-day backfill works for last 7 days
- Completion calendar shows accurate data

**Definition of Done:**
- All user stories pass
- Streak algorithm tested with edge cases (gaps, backfills, new habits)
- Missed-day messaging tested for all three states
- Welcome-back flow tested (7+ days absence)
- Performance: today view < 1s, completion toggle < 300ms
- Deployed and functional

**Dependencies:** Phase 2 (habits must exist to track them)

---

### Phase 4 — Review & Reflect

**Goal:** User receives weekly and monthly review prompts and can reflect on habit performance and identity alignment. Habits can be "graduated" from their two-minute version.

**User Stories:**

- US-4.1: As a user, I want to be prompted for a weekly review so I regularly reflect on my habits, and I want to be able to create a review manually at any time.
  - AC: Banner or prompt shown once per week (e.g., Sunday) if no review exists for the current week. Additionally, a "Write a review" button is always available on the Reviews page so the user can create a review at any time (not gated to the weekly cadence). The prompt suggests a weekly cadence but does not enforce it.
- US-4.2: As a user, I want my weekly review to show my actual habit data from the period so my reflection is informed by real numbers, not memory.
  - AC: The review page displays a read-only data summary above the reflection form, including: completion rate per habit for the review period, current streak per habit (with change from prior week: +N or -N), habits that were missed 2+ days during the period (flagged as "needs attention"), and identity vote totals for the period (e.g., "12 votes for 'I am a writer'"). Below the data summary, the review form has structured fields (wins, struggles, adjustments). Saved and viewable in review history.
- US-4.3: As a user, I want to do a monthly identity reflection so I check whether my habits still align with who I want to become.
  - AC: Monthly prompt shows identity statements and asks for reflection. Saved with review.
- US-4.4: As a user, I want to be prompted to graduate a habit (expand the two-minute version) after consistent completion so I can level up.
  - AC: After 21+ days of completion (non-consecutive, using "never miss twice" counting), a suggestion appears to upgrade the habit.
- US-4.5: As a user, I want to see my review history over time so I can track my growth.
  - AC: Reviews page shows chronological list of past reviews with key stats from that period.
- US-4.6: As a user, I want to export my habit data as a CSV file so I own my data and can analyze it outside the app.
  - AC: Settings page has an "Export my data" button. Clicking it downloads a CSV file containing all habit completions with columns: `habit_name`, `identity`, `date`, `completed` (true/false), `streak_at_time` (current streak on that date). File is named `stacked-export-YYYY-MM-DD.csv`. Export includes all habits (active and archived).

**Backend Tasks:**
- Create `reviews` table with RLS policies
- Review prompt logic (check if current week/month has a review)
- Habit graduation eligibility query (21+ days completed)
- Review data summary query: completion rates, streak changes, identity vote counts for a given date range
- `/api/export` endpoint: generates CSV of all user's habit completions (authenticated, user's own data only)

**Frontend Tasks:**
- Review prompt banner/modal
- Weekly review form with read-only data summary above the reflection fields (completion rates, streaks, identity votes, habits needing attention)
- "Write a review" button on Reviews page (available anytime, not only on prompt)
- Monthly identity reflection form
- Review history page
- Habit graduation prompt component
- Settings page: "Export my data" button triggering CSV download
- Empty states for Reviews page (no reviews yet)

**Acceptance Criteria:**
- Review prompts appear at correct cadence
- Manual review creation works at any time via "Write a review" button
- Review page shows accurate data summary (completion rates, streaks, identity votes) for the review period
- Reviews are persisted and editable
- Graduation prompt appears for eligible habits
- Review history is chronological and scannable
- CSV export downloads a valid file with all habit completion data

**Definition of Done:**
- All user stories pass
- Reviews cannot be created for future periods
- Graduation logic tested with edge cases
- Review data summary verified against actual completion records
- CSV export tested with active and archived habits

**Dependencies:** Phase 3 (completions data needed for graduation logic)

---

### Phase 5 — Accountability Partner & Sharing

**Goal:** User can invite a friend as an accountability partner. Partner gets a read-only view of shared habits, streaks, and reviews. Optional habit contract feature.

**User Stories:**

- US-5.1: As a user, I want to invite a friend via link to be my accountability partner so they can see my progress.
  - AC: Generate invite link. Friend clicks link, signs up (or logs in), partnership is created.
- US-5.2: As a user, I want to choose which habits are shared with my partner so I control my privacy.
  - AC: Per-habit toggle for `is_shared`. Only shared habits visible to partner.
- US-5.3: As an accountability partner, I want to see my partner's shared habits, streaks, and today's completion status so I can encourage them.
  - AC: Partner dashboard shows shared habits with streak, completion status, and basic stats. Dashboard displays a "last active" timestamp showing when the partner last checked in (last habit completion date). If the partner hasn't checked in for 3+ days, a subtle "hasn't checked in recently" indicator appears.
- US-5.3b: As a user, I want to share a check-in summary with my accountability partner via messaging so they stay engaged without needing to open the app.
  - AC: When all habits for the day are completed (or manually via a "Share check-in" button on the Today view), the user can generate a shareable text summary. The summary includes: date, habits completed (with streaks), identity votes for the day, and a link to the app. The summary is formatted as plain text suitable for pasting into any messaging app (iMessage, WhatsApp, etc.). "Copy to clipboard" action with confirmation toast.
- US-5.4: As a user, I want to create a habit contract ("I will X for Y days, or else Z") with my partner as witness so I have extra commitment.
  - AC: Contract form with commitment, consequence, dates. Visible to both user and witness partner.
- US-5.5: As a user, I want to remove a partnership so I can revoke access if needed.
  - AC: Either party can remove the partnership. Removes all shared data access immediately.

**Backend Tasks:**
- Create `partnerships` table with RLS policies
- Create `habit_contracts` table with RLS policies
- `/api/partnerships/invite` endpoint (token generation)
- `/api/partnerships/accept` endpoint
- `/api/partners/:partnerId/shared` endpoint
- Update habit RLS to allow partner reads on shared habits
- Update completion RLS to allow partner reads on shared habit completions
- Update review RLS to allow partner reads

**Frontend Tasks:**
- Invite partner flow (generate link, copy to clipboard)
- Accept invite page (landing page from invite link)
- Partner dashboard (read-only view of partner's shared data) with "last active" timestamp and inactivity indicator
- Per-habit sharing toggle
- Habit contract form
- Partnership management (view partners, remove partnership)
- "Share check-in" button on Today view: generates plain-text summary, copies to clipboard
- Share check-in auto-prompt when all daily habits are completed (dismissible)
- Empty state for Partner dashboard (no partners yet)

**Acceptance Criteria:**
- Full invite flow works (generate link -> friend opens -> signs up -> partnership active)
- Partner sees only shared habits (not all habits)
- Partner cannot edit any data
- Partner dashboard shows "last active" timestamp and inactivity indicator (3+ days)
- "Share check-in" generates a correct text summary and copies to clipboard
- Partnership removal immediately revokes access
- Habit contract visible to both parties

**Definition of Done:**
- All user stories pass
- RLS thoroughly tested (partner cannot see unshared habits, cannot write)
- Invite tokens expire after 7 days
- Edge cases: self-invite blocked, duplicate partnership blocked
- Share check-in text tested for formatting in common messaging apps

**Dependencies:** Phase 3 (streak data), Phase 4 (reviews for partner view)

---

### Phase 6a — Email Reminders (Resend)

**Goal:** User receives daily email reminders and weekly summary digests for habit check-ins. Can configure preferences.

**External Service:** Resend — 3,000 emails/month, 100 emails/day (free tier).

**User Stories:**

- US-6a.1: As a user, I want to receive a daily email reminder to check in on my habits so I don't forget.
  - AC: User receives one email per day at their preferred time (default: 8:00 AM in their timezone). Email lists today's habits with completion status. Includes a link to the Today view.
- US-6a.2: As a user, I want to configure my email reminder time and opt out if I prefer so I have control.
  - AC: Settings page has email reminder toggle (on/off) and time picker. Changes take effect the next day. Unsubscribe link in every email.
- US-6a.3: As a user, I want to receive a weekly summary email showing my streaks and completion rate so I can see my progress without opening the app.
  - AC: Weekly email sent on Monday morning. Shows: habits with current streaks, overall completion rate for the past week, habits that need attention (missed 2+ days).

**Backend Tasks:**
- Integrate Resend SDK for transactional emails
- Create email templates (React Email): daily reminder, weekly summary
- Build cron jobs (Vercel Cron or Supabase pg_cron) for daily and weekly email dispatch
- Create `notification_preferences` table:

| Field | Type | Required | Default | Validation |
|-------|------|----------|---------|------------|
| id | uuid | Yes | gen_random_uuid() | — |
| user_id | uuid | Yes | — | FK to profiles.id, UNIQUE |
| email_reminders_enabled | boolean | Yes | true | — |
| email_reminder_time | time | Yes | '08:00' | Valid time |
| email_weekly_summary | boolean | Yes | true | — |
| timezone | string | Yes | 'America/New_York' | Valid IANA timezone |
| created_at | timestamptz | Yes | now() | — |
| updated_at | timestamptz | Yes | now() | — |

**Frontend Tasks:**
- Settings page: email preferences section
  - Email reminder toggle + time picker + timezone selector
  - Weekly summary toggle

**Acceptance Criteria:**
- Daily reminder email arrives at configured time with correct habit list
- Weekly summary email arrives on Monday with accurate stats
- Unsubscribe link works in all emails
- Notification preferences persist across sessions

**Definition of Done:**
- All user stories pass
- Resend integration tested (daily + weekly emails, unsubscribe)
- Notification preferences table has RLS (user can only access own preferences)
- Scheduled functions (cron) run reliably

**Dependencies:** Phase 3 (habits and completions must exist for email content)

---

### Phase 6b — Push Notifications (OneSignal)

**Goal:** User receives browser push notifications at habit-scheduled times. Can configure globally and per-habit.

**External Service:** OneSignal — unlimited mobile subscribers, 10k email subscribers (free tier).

**User Stories:**

- US-6b.1: As a user, I want to receive browser push notifications at my habit's scheduled time so I get a real-time nudge.
  - AC: User opts in to push notifications (browser permission prompt). Notification shows habit name and stack context (e.g., "After morning coffee: Journal for 2 minutes"). Tapping the notification opens the Today view.
- US-6b.2: As a user, I want to configure which habits send push notifications so I'm not overwhelmed.
  - AC: Per-habit toggle for push notifications. Global push notification toggle in settings.

**Backend Tasks:**
- Add `push_enabled` boolean field to `notification_preferences` table (default: false)
- Add `push_notification_enabled` boolean field to `habits` table (default: false)
- Integrate OneSignal REST API for sending push notifications
- Add `onesignal_player_id` to `profiles` table for device targeting

**Frontend Tasks:**
- Settings page: push notification toggle + browser permission request
- Per-habit push notification toggle (in habit edit form)
- OneSignal Web SDK integration (service worker for push)

**Acceptance Criteria:**
- Push notifications fire at correct times for enabled habits
- Push notification tapping opens the app to Today view
- Per-habit and global toggles work correctly
- Browser permission prompt appears on opt-in

**Definition of Done:**
- All user stories pass
- OneSignal integration tested (opt-in, per-habit, global toggle)
- Service worker registered and functional

**Dependencies:** Phase 3 (habits must exist), Phase 6a (notification_preferences table)

---

### Phase 6c — Google Calendar Sync

**Goal:** User can connect Google Calendar and have habits appear as recurring events. Events stay in sync on habit create/edit/archive.

**External Service:** Google Calendar API — free (standard API quota: 1M queries/day).

**User Stories:**

- US-6c.1: As a user, I want to sync my habits to Google Calendar so they appear as recurring events with reminders.
  - AC: "Connect Google Calendar" button in settings. OAuth flow to authorize calendar access. Each active habit creates a recurring calendar event at the time specified in its implementation intention. Calendar event includes habit name, two-minute version, and stack context in the description.
- US-6c.2: As a user, I want calendar events to stay in sync when I add, edit, or archive habits so my calendar is always accurate.
  - AC: Creating a new habit adds a calendar event. Editing a habit updates the event. Archiving a habit deletes the event. User can disconnect Google Calendar at any time.

**Backend Tasks:**
- Integrate Google Calendar API (OAuth 2.0 flow)
- Create `calendar_connections` table:

| Field | Type | Required | Default | Validation |
|-------|------|----------|---------|------------|
| id | uuid | Yes | gen_random_uuid() | — |
| user_id | uuid | Yes | — | FK to profiles.id, UNIQUE |
| google_refresh_token | text | Yes | — | Encrypted via AES-256-GCM before storage |
| google_calendar_id | string | No | null | Target calendar ID (default: primary) |
| is_active | boolean | Yes | true | — |
| created_at | timestamptz | Yes | now() | — |

- Add `google_event_id` string field to `habits` table (nullable, for sync tracking)
- Create `/api/calendar/connect` endpoint (OAuth redirect)
- Create `/api/calendar/callback` endpoint (token exchange, encrypt and store refresh token)
- Create `/api/calendar/disconnect` endpoint (revoke token, delete calendar_connections row, clear google_event_id on habits)
- Calendar sync logic: create/update/delete Google Calendar events on habit CRUD
- Encryption utility: AES-256-GCM encrypt/decrypt using `ENCRYPTION_KEY` env var

**Frontend Tasks:**
- Settings page: Google Calendar connect/disconnect button
- Google Calendar OAuth flow (redirect + callback handling)
- Calendar connection status indicator in settings

**Acceptance Criteria:**
- Google Calendar OAuth connects successfully
- Habits appear as recurring calendar events with correct details
- Editing/archiving a habit updates/removes the calendar event
- Disconnecting Google Calendar removes all synced events
- Refresh tokens are stored encrypted

**Definition of Done:**
- All user stories pass
- Google Calendar integration tested (connect, sync, edit, archive, disconnect)
- Calendar tokens stored securely (encrypted refresh tokens verified)
- Encryption key rotation documented

**Dependencies:** Phase 2 (habits with implementation intentions must exist for calendar event times)

---

## 8. Observability & Non-Functional Requirements

### Logging

- Supabase provides built-in logging for database queries and auth events
- Next.js API routes: log errors to console (Vercel captures these)
- Client-side: log errors to console; consider adding Sentry in future for production error tracking

### Monitoring

- Vercel analytics (free tier): page load times, Web Vitals
- Supabase dashboard: database size, active connections, auth events
- No custom monitoring in v1. Add if user base grows beyond friends.

### Performance Thresholds

| Metric | Target |
|--------|--------|
| Page load (initial) | < 2 seconds |
| Page load (subsequent / client nav) | < 500ms |
| Habit completion toggle | < 300ms (perceived, via optimistic update) |
| API response (any endpoint) | < 500ms |
| Database query | < 100ms |

### Reliability

- Supabase free tier: 99.9% uptime SLA (managed by Supabase)
- Vercel free tier: 99.99% uptime for static/serverless
- No custom redundancy needed at this scale
- Supabase daily backups (free tier: 7 days retention)
- **Supabase free tier auto-pause risk:** Projects pause after 1 week of inactivity (no requests). When paused, the database is offline and auth stops working. Mitigation: set up a Vercel Cron job that pings Supabase daily (e.g., a lightweight `/api/health` endpoint that runs a simple SELECT query). If monetizing, upgrade to Supabase Pro ($25/month) which has no auto-pause.

### Browser Support

- All modern browsers: Chrome, Firefox, Safari, Edge (latest 2 versions)
- No IE support required

### Design

- Mobile-first responsive design (primary breakpoint: 375px)
- Dark mode supported from v1 (shadcn/ui theme toggle)
- Desktop layout adapts at 768px and 1024px breakpoints

### Accessibility

- Use semantic HTML and shadcn/ui component defaults (keyboard navigation, focus management, ARIA labels)
- Full WCAG 2.1 AA compliance deferred to pre-public-launch milestone
- Minimum: all interactive elements keyboard-accessible, sufficient color contrast in both light and dark modes

### UX Design Guidelines

These guidelines apply across all phases. They are cross-cutting UX patterns, not features.

**Concept Explainer Subtitles:** Every methodology-specific term in the UI includes a one-line inline subtitle (not hidden behind a tooltip or help icon). These teach as the user interacts:

| Term | Inline Explainer |
|------|-----------------|
| Habit Scorecard | "List your current habits. Rate each one: positive (+), negative (-), or neutral (=)." |
| Identity Statement | "Who do you want to become? Example: 'I am a person who moves every day.'" |
| Implementation Intention | "Be specific: I will [behavior] at [time] in [location]." |
| Habit Stacking | "Attach a new habit to something you already do. After [current habit], I will [new habit]." |
| Temptation Bundling | "Pair something you need to do with something you want to do." |
| Two-Minute Rule | "Scale it down. What's the two-minute version of this habit?" |
| Habit Contract | "Write your commitment and what happens if you don't follow through." |

**Empty States:** Every major page has a designed empty state that teaches and guides. Empty states are not blank pages — they explain what the page is for and provide a clear next action:

| Page | Empty State Message | Action |
|------|-------------------|--------|
| Today (no habits) | "You don't have any habits to track yet." | "Start with your Scorecard" / "Add your first habit" |
| Scorecard (empty) | "Walk through your day. What do you do when you wake up? After breakfast? Before bed? List each habit and rate it." | "Add your first habit" |
| Identities (empty) | "Who do you want to become? Write it down." | "Create your first identity" |
| Habits (empty) | "Design habits that stick. Start with just a name — you can add the full methodology later." | "Add your first habit" |
| Reviews (empty) | "Your first review will be available after your first week of tracking." | (no action, informational) |
| Partners (empty) | "Accountability partners can see your shared habits and cheer you on." | "Invite a partner" |

**Emotional Messaging (Missed Days & Streaks):** The app's tone around missed days is encouraging, not punitive. This is the single most important UX writing decision for retention. See US-3.2 for the three messaging states.

**First-Run Guided Flow:** After account creation and display name setup, the app guides (but does not force) the user through the Atomic Habits progression: Scorecard first, then Identities, then Habits. The sidebar highlights the recommended next step. Each step can be skipped. See Phase 1 Frontend Tasks.

### Security

- All data access enforced via Supabase RLS (no trust on client)
- HTTPS enforced by Vercel
- Auth tokens managed by `@supabase/ssr` in httpOnly cookies (not localStorage)
- No sensitive data stored beyond email and display name
- Invite tokens: random UUID, expire after 7 days, single-use
- Google Calendar refresh tokens: encrypted at application level (AES-256-GCM via Node.js `crypto`, key in `ENCRYPTION_KEY` env var) before storage in Supabase

---

## 9. Decision Log

| # | Topic | Chosen Option | Rationale | Date |
|---|-------|---------------|-----------|------|
| D1 | Frontend framework | Next.js (React) | SSR, API routes, one codebase, Vercel-native | 2026-02-19 |
| D2 | Backend | Next.js API Routes + Supabase SDK | No separate server. Supabase handles data layer. API routes for server-side logic only. | 2026-02-19 |
| D3 | Database | Supabase (PostgreSQL) | Free tier, built-in auth, RLS, real-time. Generous limits for small user base. | 2026-02-19 |
| D4 | Auth | Supabase Auth (email + Google) | Bundled with database. No extra service. | 2026-02-19 |
| D5 | Hosting | Vercel | Free tier, native Next.js, auto-deploy from GitHub | 2026-02-19 |
| D6 | Styling | Tailwind CSS + shadcn/ui | Fast development, modern aesthetic, accessible components | 2026-02-19 |
| D7 | Streak logic | "Never miss twice" | Matches book's philosophy. Forgiving design reduces churn from single bad days. | 2026-02-19 |
| D8 | Data access pattern | Supabase client SDK + RLS (not REST API for most operations) | Simpler. RLS enforces security at DB level. Custom API routes only where server logic is needed. | 2026-02-19 |
| D9 | Gamification | Not included | Contradicts Atomic Habits' emphasis on intrinsic/identity-based motivation | 2026-02-19 |
| D10 | Social features | Private 1:1 accountability only | No public feed. Reduces scope, moderation burden, and distraction. Matches book's accountability partner concept. | 2026-02-19 |
| D11 | Email service | Resend | Generous free tier (3k emails/month). Simple API. Good DX with React Email for templates. | 2026-02-19 |
| D12 | Push notifications | OneSignal | Industry standard for web push. Free tier sufficient. Handles service worker complexity. | 2026-02-19 |
| D13 | Calendar sync | Google Calendar API | Most widely used calendar. Free API. OAuth 2.0 is well-documented. Covers the majority of users. | 2026-02-19 |
| D14 | Notification phasing | Phase 6 (after core app) | Email, push, and calendar add external dependencies and complexity. Core habit workflow should work without them. | 2026-02-19 |
| D15 | Design priority | Mobile-first | User plans to build a native mobile app eventually. Mobile-first web ensures the core UX works on small screens from day one. | 2026-02-19 |
| D16 | Accessibility | Defer WCAG 2.1 AA | Not required for v1 (friends only). Add as a future requirement before public launch. Use semantic HTML and shadcn/ui defaults for baseline accessibility. | 2026-02-19 |
| D17 | Dark mode | Include in v1 | shadcn/ui supports it natively. Low effort, high UX value. | 2026-02-19 |
| D18 | Development pace | Fast, no quality compromise | Solo developer. Build as fast as possible while maintaining code quality and test coverage. | 2026-02-19 |
| D19 | Onboarding flow | Guided first-run flow, skippable | After display name setup, guide user through Scorecard -> Identities -> Habits progression. Sidebar highlights recommended next step. Each step skippable. Empty states teach at every page. "Add to Home Screen" banner on mobile. | 2026-02-19 |
| D20 | Archived habits | Keep history, hide from Today, allow restore | Completions and streaks preserved. Habit hidden from daily view. Viewable in Archived section with "Restore" action. Restoring un-archives the habit; streak restarts from 0, completion history preserved. | 2026-02-19 |
| D21 | App name | **Stacked** | References habit stacking (the app's core differentiator). Short, memorable, brandable. Tagline: "Build habits that compound." | 2026-02-19 |
| D22 | Apple Calendar | Deferred (post-launch) | Google Calendar covers the majority of users. CalDAV integration adds complexity. Add after validating Google Calendar sync adoption. | 2026-02-19 |
| D23 | Auth email branding | Supabase for Phases 1-5, Resend in Phase 6 | Supabase handles auth emails out of the box. Migrate to Resend templates in Phase 6 for consistent "Stacked" branding across all emails. | 2026-02-19 |
| D24 | Partner messaging | Not included | Read-only accountability view is sufficient for v1. Messaging adds significant scope (real-time, notifications, moderation). Revisit post-launch based on user feedback. | 2026-02-19 |
| D25 | Habit frequency | Daily / Weekdays / Weekends / Pick-days | Covers the most common patterns. "Every N days" deferred as future enhancement if users request it. | 2026-02-19 |
| D26 | Habit creation flow | Quick-add (name only) + expandable full design | Reduces friction for casual habit additions. Full Atomic Habits methodology fields (intention, stack, bundle, 2-min) available via "Design this habit" expander. Most users want to add a habit fast and design it later. | 2026-02-19 |
| D27 | Identity vote feedback | Inline on completion | Every habit completion shows "1 vote for [identity]" — the book's central insight surfaced at the moment it matters most. Daily summary on all-complete. Low effort, high emotional impact. | 2026-02-19 |
| D28 | Missed-day messaging | 3 states: encouraging, not punitive | 1 miss = "never miss twice" encouragement. 2+ misses = "fresh start" with lifetime stats. 7+ day absence = "welcome back" banner. Prevents guilt-driven churn. | 2026-02-19 |
| D29 | Scorecard-to-action bridge | Prompt after scorecard summary | Surfaces (-) habits and suggests taking action (create replacement habit). Bridges the gap between awareness and behavior change that the book assumes but the app needs to make explicit. | 2026-02-19 |
| D30 | Empty states | Designed for every page | Each page has a teaching empty state with guidance text and a next action. Empty states are the first impression of every feature, especially for onboarding. | 2026-02-19 |
| D31 | Concept explainers | Inline subtitles, always visible | Every methodology term shows a one-line explainer in the UI. Not hidden behind tooltips. Supports users who read the book long ago or were referred by a friend. | 2026-02-19 |
| D32 | Add to Home Screen | PWA manifest + dismissible banner (Phase 1) | Mobile-first app needs a home screen presence before Phase 6 notifications exist. Lightweight: web app manifest + banner prompt. No service worker in v1. | 2026-02-19 |
| D33 | Shareable check-in | Plain text summary, copy to clipboard (Phase 5) | Makes accountability work without building a notification system. User generates a text summary of their daily check-in and pastes it into any messaging app. Leverages existing channels. | 2026-02-19 |
| D34 | Data-informed reviews | Show habit data above review form | Weekly review displays completion rates, streak changes, identity votes, and habits needing attention. Data informs reflection instead of relying on memory. | 2026-02-19 |
| D35 | CSV data export | Include in Phase 4 | Simple CSV export of habit completions. Builds user trust ("my data is mine"). Low effort, significant signal. Data import deferred. | 2026-02-19 |
| D36 | Manual review creation | Available anytime, prompted weekly | Users can write a review whenever they want, not only when the weekly prompt appears. Prompted cadence is suggestive, not enforced. Don't gate reflection to a schedule. | 2026-02-19 |
| D37 | Phase 1 design | Finalized; design catalog docs/design/stacked-phase-1-designs.md | PRD updated to match. Add to Home Screen = instructional banner + "Got it"; Scorecard add defaults = and Anytime; Settings "Saved" feedback; identity edit = statement only, re-link = delete/recreate; mobile "Next step" badge; loading/error in execution. | 2026-02-20 |

---

## 10. Open Questions

| # | Question | Impact | Status |
|---|----------|--------|--------|
| OQ1 | ~~Should the app support a dark mode in v1, or defer?~~ | ~~UX preference.~~ | **Resolved** — include dark mode. shadcn/ui supports it natively. |
| OQ2 | ~~Should habit frequency support fully custom schedules?~~ | ~~Data model and UI complexity.~~ | **Resolved** — start with daily/weekdays/weekends/pick-days. Add "every N days" later. |
| OQ3 | ~~Should the onboarding flow force scorecard completion before allowing habit creation?~~ | ~~Methodology purity vs user freedom.~~ | **Resolved** — guided but skippable. Show scorecard first, don't block habit creation. |
| OQ4 | ~~What happens to habit completions and streaks when a habit is archived?~~ | ~~Data retention.~~ | **Resolved** — keep history, hide from Today view, show in Archived section. |
| OQ5 | ~~Should partners be able to send messages/encouragement?~~ | ~~Scope and complexity.~~ | **Resolved** — read-only for v1. No messaging system. |
| OQ6 | ~~Custom domain or Vercel default URL for v1?~~ | ~~Branding vs effort.~~ | **Resolved** — Vercel default URL for now. Custom domain when ready to go public. |
| OQ7 | ~~Email reminders: should v1 include a daily check-in email, or defer?~~ | ~~Retention impact vs added dependency.~~ | **Resolved** — included in Phase 6 via Resend. |
| OQ8 | ~~Should calendar sync support Apple Calendar (CalDAV) in addition to Google Calendar?~~ | ~~Broader user reach vs added integration complexity.~~ | **Resolved** — Google Calendar only for Phase 6. Apple Calendar (CalDAV) deferred as future enhancement post-launch. |
| OQ9 | ~~Should Resend also replace Supabase's built-in auth emails?~~ | ~~Email consistency vs effort.~~ | **Resolved** — keep Supabase auth emails for Phases 1-5. Migrate to Resend in Phase 6 for consistent branding (welcome email, password reset, verification all through Resend templates). |
| OQ10 | ~~Final app name?~~ | ~~Branding.~~ | **Resolved** — **Stacked**. Tagline: "Build habits that compound." |

All open questions resolved. No remaining open items.
