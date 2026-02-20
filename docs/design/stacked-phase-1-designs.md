# Stacked — Phase 1 Design Catalog

**PRD:** `docs/prd/atomic-habits-companion-prd.md`  
**Generated:** 2026-02-20  
**Tech stack:** Next.js App Router, Tailwind CSS (no shadcn in repo yet)  
**Target:** `stacked-auth-demo`

## Screens

### App layout (dashboard shell)
- **User story:** Phase 1 frontend (layout)
- **Location:** `app/dashboard/layout.tsx`
- **Status:** Approved
- **Notes:** Sidebar with Scorecard (Next step badge), Identities; mobile header with same nav and "Next step" badge on Scorecard. User block and Log out. Warm gradient background; main content area with max-width container.

### Dashboard home (first-run welcome)
- **User story:** First-run guided flow
- **Location:** `app/dashboard/page.tsx`
- **Status:** Approved
- **Notes:** Centered card: “Start with your Scorecard”, short Atomic Habits copy, primary CTA “Go to Scorecard”, secondary “Learn about Identities”.

### Display name setup
- **User story:** US-1.1b
- **Location:** `app/dashboard/display-name/page.tsx`
- **Status:** Approved
- **Notes:** Single field, “Almost there” heading, one-line why we ask. Continue + “Skip for now” (design only; in execution skip can be gated). Execution may gate other flows (e.g. partner features) on display name being set; document in PRD if so.

### Scorecard page (with entries)
- **User story:** US-1.2, US-1.3, US-1.5, US-1.6
- **Location:** `app/dashboard/scorecard/page.tsx`
- **Status:** Approved
- **Notes:** Concept explainer subtitle. Summary (counts + %). List grouped by time of day (Morning / Afternoon / Evening / Anytime). Per entry: name, rating toggle (+/−/=), edit/delete. “Add habit” reveals inline form: name, rating (default =), time (default Anytime), Save/Cancel. “Take Action” callout when 3+ entries and any (−); “Work on this” per (−) habit. Toggle “View empty state” for design review. Loading/error states to be added in execution.

### Scorecard page (empty state)
- **User story:** Phase 1 empty states
- **Location:** Same page, when no entries or “View empty state” toggled
- **Status:** Approved
- **Notes:** Copy: “Walk through your day. What do you do when you wake up?…” CTA: “Add your first habit”.

### Add/Edit scorecard entry
- **User story:** US-1.2, US-1.3
- **Location:** Inline on `app/dashboard/scorecard/page.tsx`
- **Status:** Approved
- **Notes:** Inline form: habit name, rating (+/−/=) default "=", time of day default "Anytime". Save / Cancel.

### Identities page (with statements)
- **User story:** US-1.4
- **Location:** `app/dashboard/identities/page.tsx`
- **Status:** Approved
- **Notes:** Concept explainer. List of identity statements. “Create identity” reveals inline form. Per item: edit (inline) / delete. “View empty state” for design review. Loading/error states to be added in execution.

### Identities page (empty state)
- **User story:** Phase 1 empty states
- **Location:** Same page when no identities or “View empty state” toggled
- **Status:** Approved
- **Notes:** Copy: “Who do you want to become? Write it down.” CTA: “Create your first identity”.

### Add/Edit identity
- **User story:** US-1.4
- **Location:** Inline on `app/dashboard/identities/page.tsx`
- **Status:** Approved
- **Notes:** Single field “I am a person who…”. Save / Cancel. Edit mode: inline replacement of statement only; re-linking habits = delete and recreate (Phase 1). 3-step create flow: write statement (auto-prefix + min length), link supporting habits, confirm.

### Forgot password
- **User story:** Auth (Phase 1 frontend)
- **Location:** `app/forgot-password/page.tsx`
- **Status:** Approved
- **Notes:** Email field, "Send reset link", back to login. Same visual style as login/signup. Login page links to /forgot-password.

### Settings
- **User story:** US-1.1b (edit display name later)
- **Location:** `app/dashboard/settings/page.tsx`
- **Status:** Approved
- **Notes:** Profile: display name field, Save. Save shows "Saved" feedback (design); execution adds API and error handling. Account: Log out. Sidebar user block links to /dashboard/settings.

### Add to Home Screen banner
- **User story:** Phase 1 frontend (PWA)
- **Location:** `components/add-to-home-banner.tsx`; rendered in `app/dashboard/layout.tsx`
- **Status:** Approved
- **Notes:** Dismissible banner on mobile only; hidden when standalone or after dismiss (localStorage). Instructional copy: "Tap your browser menu (⋮) then 'Add to Home Screen' for quick access." CTA: "Got it" (dismiss). No programmatic install in Phase 1; beforeinstallprompt can be added in execution if a service worker is introduced.

### Web app manifest
- **User story:** Phase 1 frontend (PWA)
- **Location:** `public/manifest.json`; linked from `app/layout.tsx` (metadata.manifest, themeColor, appleWebApp)
- **Status:** Approved
- **Notes:** name "Stacked", theme_color #e87722, background_color #faf8f5, start_url /dashboard. Icons: /icon-192.png, /icon-512.png (add assets to public/ when ready).
