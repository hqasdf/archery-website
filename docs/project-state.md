# Project state

Updated: 2026-09-15

## Sources and collaboration

The supplied Archery_Performance_Platform_Plan_with_NEA_Weather.docx defines the product. Subsequent direct user decisions refine its requirements. Build incrementally: explain, design, implement, explain code, test, review. Discuss database entities and cardinalities before migrations. Do not generate the whole application at once.

## Current increment

Phase 1, increment 1 foundation is implemented. Its build, lint, type checks, desktop/mobile layout, navigation, and automated accessibility checks passed.

Current: increment 2, managed authentication. Supabase connection verified; email signup enabled and confirmation required. The development bypass is removed. Six-digit registration/recovery code-entry pages use Supabase verifyOtp and the existing HttpOnly cookie client. Required hosted expiry is 300 seconds; provider settings/templates still await user confirmation. Normal sign-in remains email/password with no separate code-verification link. The legacy callback remains, but new templates must send codes only. Live email, expiry, cross-browser verification, refresh, sign-out, recovery and two-account testing remain pending. Do not call authentication fully verified until those pass.

No custom database schema, profile persistence, session persistence, score-entry workflow, images, weather, analytics, goals, or AI exist yet. Nothing has been deployed. Session empty states remain unconnected to data. ARC TRACK is the working label from the original design.

## Historical foundation verification on 2026-09-15

- Production build and TypeScript compilation passed; ESLint passed with zero warnings.
- Eight native unit tests passed: auth input, configuration validation, and callback destination safety.
- Production HTTP checks passed for signed-out redirects on Dashboard, Sessions, and update-password; private/no-store headers; invalid callback destination; unknown notice handling.
- Browser checks passed for sign-in, registration and reset-page navigation; mobile registration at 390/320 px had no overflow; axe reported zero violations on the unconfigured registration screen.
- No page errors were reported in those browser checks. Real Supabase identity, confirmation, refresh, recovery, sign-out, and cross-account testing are pending credentials. Disabled forms are deliberate while configuration is absent.
- Development and production servers differ in Cache-Control handling; production headers were explicitly checked. Missing-configuration callbacks use a relative redirect to avoid changing the local host name.

## Agreed scoring requirements

- Bow styles: recurve and compound only.
- Maximum arrow score: 10.
- 18 m: 30 arrows, default 10 ends of 3, maximum 300.
- 30/50/70 m: 36 arrows, default 6 ends of 6, maximum 360.
- Alternative arrangements qualify when the expected round length is fully recorded. Example: 70 m with 3 ends of 12 arrows is a complete round.
- Custom rounds may define a different expected length and arrangement.
- Preserve the expected round definition independently of actual logged ends. Do not retrospectively shorten a preset to make an incomplete round eligible.
- Keep incomplete sessions in history; exclude incomplete rounds from performance indexes. Recorded arrows/duration can count toward training volume.
- A recorded miss is zero and counts as an arrow. Blank/unrecorded is not zero.
- Compare performance within compatible bow styles, distances, scoring definitions, and round lengths.
- End-score consistency requires compatible arrangements. Equal-arrow phase comparisons require enough recorded detail; never invent individual scores from end totals.
- Sessions need immutable equipment and round snapshots. Changes to saved presets/setups must not silently change history.
- A single selected end ID will determine score, heading, and grouping image when entry is implemented.

## Architecture

Implemented: Next.js App Router, TypeScript, CSS Modules, global design tokens, ESLint, Supabase Auth SDK/SSR helpers. Node 22.18+ is required for native TypeScript policy tests. PostgreSQL tables and private Storage are not provisioned. No ORM or global state library has been added.

## Roadmap

1. Foundation: shell, authentication, profile, equipment, venues, rounds, scoring, drafts, session history/editing.
2. Analytics: trends, PBs, consistency, volume, fatigue, training/competition comparisons.
3. Context/media: private images, grouping viewer, NEA observations/forecasts, backend caching, weather context.
4. Goals and competitions.
5. Evidence-grounded AI coaching.

Weather outages must not block scoring. Forecasts and observations remain separate, with source/time labels. Never assign current weather to historical sessions. Data/media export and deletion are required before public launch.

## Open decisions at relevant stages

- Authentication: finish Supabase project/URL setup with the user and run live account tests. Email/password chosen for this increment. Custom SMTP before non-team users; provider limits apply during development.
- Scoring: X/tie-breaking and target-face rules, bounds for custom rounds, mixed arrangements, multiple rounds per session.
- Context: fatigue scale, duration fields, historical correction policy, privacy-preserving local draft cleanup.
- Analytics: sample sizes and exact metric definitions.
- Deployment: hosting, backups, recovery, deletion retention semantics.

## Next task

Help the user complete Supabase setup, enter project URL/publishable key locally, configure redirect URLs, and test real account flows. Then discuss ArcherProfile fields and its one-to-one identity relationship before migrations. Do not skip verification and proceed to scoring.

## Signup email carry-forward

Signup remembers the submitted email in an HttpOnly, SameSite=Lax UI-context cookie for up to one hour, cleared after successful email-code verification. This is not a session or OTP and grants no access; Supabase still verifies the email/code and enforces the separate 300-second code expiry. The verification page shows only a code input and the recipient email. It has no Already confirmed link. Without signup context, it returns to registration. Read the email on any device, then enter the code in the signup browser; this convenience step does not require the old PKCE verifier. Hosted code-only email templates and expiry still need confirmation and live testing.
