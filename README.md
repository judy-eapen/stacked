# Stacked auth demo — ghosted preview

Minimal Next.js app that shows the sign-up screen **with the ghosted product preview visible** behind the auth card.

## Run it

```bash
cd stacked-auth-demo
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You should see:

1. **Background:** Warm cream/beige gradient  
2. **Behind the card:** A soft, blurred “Today” mock (habits list, 14 day streak, progress ring) at ~42% opacity — **that’s the ghosted preview**  
3. **On top:** The white auth card (Stacked logo, form, CTA)

The ghosted preview is the faint dashboard-shaped area in the center, behind the white card. If you don’t see it, the layer order and styles are in `app/page.tsx` (Layer 2).

## Stack

- Next.js 14 (App Router)
- Tailwind CSS
- TypeScript

Presentational only; no auth logic.
