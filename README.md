<<<<<<< HEAD
# Arc Track

The foundation of an archery performance platform for recurve and compound archers.

The app contains a responsive shell, Dashboard and Sessions pages, agreed round presets, and Supabase email/password authentication code. Account creation, sign-in, confirmation, recovery, and sign-out need your Supabase connection and live verification. Score collection, profile persistence, and session saving are not implemented yet.

Start with [the guided Supabase setup](docs/auth-setup.md). Until connection settings are present, authentication forms stay disabled and protected pages redirect to sign-in. This is intentional.

## Run locally

Use Node.js 22.18 or newer. Open a terminal in this `web` folder:

```powershell
npm.cmd ci
npm.cmd run dev
```

Open http://127.0.0.1:3000/sign-in. Use this address consistently with APP_URL and the Ssigning ase redirect settings; do not switch between localhost and 127.0.0.1 during an email confirmation flow. The development server binds only to this computer. Stop it with Ctrl+C. Changes to source files appear automatically while it runs. Use `npm` instead of `npm.cmd` outside Windows.

## Checks

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
```

The production build does not launch a server. To view it, stop the development server and run `npm.cmd start`.

## Learn the structure

- `src/app/layout.tsx`: document structure and site metadata.
- `src/app/page.tsx`: redirects `/` to the dashboard.
- `src/app/(platform)/layout.tsx`: verifies identity and puts the shared shell around platform pages. Parentheses group routes without changing URLs. Each current protected page also checks identity.
- `src/app/(platform)/dashboard/page.tsx`: dashboard content.
- `src/app/(platform)/sessions/page.tsx`: session preview content.
- `src/components/layout/app-shell.tsx`: header, navigation placement, main content, and footer.
- `src/components/layout/navigation.tsx`: the small client component that highlights the current route.
- `src/features/sessions/round-presets.ts`: agreed round defaults, explicitly separated from future scoring validation.
- `src/styles/globals.css`: shared colour, spacing, and typography tokens.
- Files ending in `.module.css`: styles imported by components without globally exposing their class names.

Pages are Server Components by default. The navigation uses `usePathname`, so it has `"use client"`. This keeps browser JavaScript focused on the part that needs it. Native `<details>` provides the expandable round explanation without additional React state.

Auth forms call server actions, which validate input and call Supabase Auth. Cookies retain the session, and protected pages verify identity on the server. No custom PostgreSQL tables exist yet. Later, a scoring component will send input to an authorised server operation, which will validate it and save it to PostgreSQL.

## Guided first exercise

1. Open the dashboard page and find the sentence “A little context for every arrow.”
2. Change the sentence and save the file. The browser should update automatically.
3. Open `src/styles/globals.css` and locate `--color-peach`. This token controls the shared accent colour.
4. Navigate between Dashboard and Sessions. Notice that the surrounding layout stays consistent while the page changes.

## Manual acceptance checks

First complete the account checks in docs/auth-setup.md. The following foundation checks require a signed-in account, except the not-found screen.

1. Open `/` while signed in: expect `/dashboard` and the Dashboard tab highlighted. While signed out, expect `/sign-in`.
2. Select Explore sessions: expect `/sessions` and the Sessions tab highlighted.
3. Check presets: 18 m shows 10 × 3, 30 arrows, 300 points. 30/50/70 m each show 6 × 6, 36 arrows, 360 points.
4. Expand “A different end arrangement?”: expect the 70 m, 3 × 12 example. Collapse it again.
5. Reload `/sessions` directly: expect the page to remain available without visiting the dashboard first.
6. Resize to 390 px and 320 px wide: expect stacked content, readable labels, and no horizontal page scrolling.
7. Reload, then press Tab: the Skip to content link should appear. Press Enter to jump to the main content. Continue using Tab and Enter to navigate. The round explanation supports Enter/Space.
8. Visit a nonexistent URL: expect the custom not-found screen with a working dashboard link.
9. Confirm Sign out is visible while signed in and the unavailable-saving explanation remains clear. Sign out and confirm direct visits to protected pages return to sign-in.

An unavailable localhost page usually means the development server is stopped. A port-in-use message usually means another server is running; check the terminal for the actual address rather than killing unrelated processes. This preview is not accessible from a separate phone while bound to localhost; use browser mobile emulation for this increment.

## Next increment

Finish connecting Supabase and verifying real account/email flows, then discuss the identity/profile relationship before writing database migrations. Follow `docs/project-state.md` for agreed requirements and `docs/decisions.md` for architectural decisions.

Reference: https://nextjs.org/docs/app/getting-started/installation
=======
# archery-website
A web platform for archers to record scores, capture grouping images, understand performance patterns, and prepare for competition.
>>>>>>> 1c02e5c8297f9f01d8d1692ab2b465733bd21149
