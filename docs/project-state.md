# Project state

Updated: 2026-09-18

## Sources and collaboration

The supplied Archery_Performance_Platform_Plan_with_NEA_Weather.docx defines the product. Subsequent direct user decisions refine its requirements. Build incrementally: explain, design, implement, explain code, test, review. Discuss database entities and cardinalities before migrations. Do not generate the whole application at once.

## Current increment

Phase 1, increment 1 foundation is implemented. Its build, lint, type checks, desktop/mobile layout, navigation, and automated accessibility checks passed.

Stage 1 authentication and Stage 2 profile creation, editing, RLS, and signup/OTP/recovery regressions are confirmed working by the user. Stage 2.1 added optional archer details and display-name personalization. Stage 2.2 removes bio, adds a profile display/edit card and an authenticated Supabase email-change request, and reserves an empty desktop column for future analysis. Existing authentication logic, proxy, cookies, templates, and settings remain unchanged. Fresh live credential/email regressions for this increment remain distinct from that confirmed baseline.

The `public.profiles` table and `/profile` page are implemented. Profiles contain optional display name, club/team, division, shooting hand, experience level, and timestamps; email is displayed from Auth and changed only through its own request flow. Dashboard and Sessions personalize their headings from the user's own display name. Session persistence, score entry, equipment, images, weather, analytics, goals, and AI remain unimplemented. The database migrations are applied to the existing Supabase project; the website has not been deployed. Session empty states remain unconnected to data.

## Stage 2.2 verification on 2026-09-18

- Applied `20260918020718_remove_profile_bio.sql`. One existing non-null bio value was permanently deleted with user approval. A post-migration query confirmed the column is absent and RLS plus both ownership policies remain enabled.
- Profile source code stopped selecting/saving bio before migration. Display and Account cards loaded afterward. Browser checks passed for Edit, Cancel discarding draft, Save returning to display, persistence after refresh, updated Dashboard/Sessions personalization, and blank-name fallback on all three pages. The original saved display name was restored after testing.
- Change email opens a dedicated form. Same-email submission returns a clean error without requesting an update; malformed email is blocked by the browser and server validation is covered by unit tests. A live new-email request and both confirmation links still require user-owned inbox interaction. Secure Email Change was observed enabled, and its two-address link template and existing callback were left unchanged.
- Change password opened the existing protected `/update-password` route. Passwords are not part of profiles.
- Expanded SQL ownership tests passed against the live database in a rolled-back transaction: own read/save/clear, anonymous denial, cross-user SELECT/UPDATE denial, column restrictions, constraints, trigger/cascade, and bio absence.
- At 320px and 390px, all three navigation links are visible at 44px height; Profile is not clipped, page width is below viewport width, and both Profile cards fit. Desktop navigation retains its original 17px horizontal padding, 14.4px font size, and 6px gap; the right Profile column remains empty.
- Lint, typecheck, 22 unit tests, and production build passed. New live signup/OTP, sign-in/out, password recovery/update, and completed email change remain dependent on user-owned credentials/inboxes and are not claimed as retested in Stage 2.2.
- Configuration discrepancy for later review: the live Supabase dashboard showed email OTP expiry of 3600 seconds, while the prior requirement was 300 seconds. Stage 2.2 did not change the setting.

## Stage 2.1 verification on 2026-09-18

- Applied `20260917150016_extend_profile_details.sql` through the existing connector. No tooling/dependencies installed. Existing RLS policies and triggers were not changed.
- Immediate rolled-back Auth-row insertion confirmed the existing trigger creates the profile with all new columns null. This is not a real signup/email test.
- Expanded SQL ownership tests passed: save/read/clear all fields, anonymous denial, cross-user SELECT/UPDATE denial, protected ownership/timestamps, choice/length constraints, Unicode bio trimming, creation, and cascading deletion. Fixture changes rolled back.
- Browser save and refresh passed for display name, club/team, all three dropdowns, and multiline bio. Outer bio whitespace was removed; internal blank lines and indentation persisted. Clearing optional fields also passed.
- Dashboard and Sessions displayed the saved test name. Dashboard blank-name fallback passed in the browser; the shared fallback helper passed unit tests. Sessions was later checked with the user's current name; its empty-name case was not separately repeated in the browser.
- Email remained read-only. Change password navigated to the existing protected `/update-password` form. No credentials are stored in profiles.
- Browser sign-out passed. Direct navigation to `/profile`, `/dashboard`, and `/sessions` afterward redirected to sign-in.
- Lint, typecheck, all 19 tests, and production build passed. Source-file hashes confirmed existing authentication files and proxy remained unchanged.
- User-entered values observed after the interruption were preserved rather than overwritten with earlier test values.
- Fresh live signup/OTP, sign-in, and completed password recovery/update require user input and are not claimed as reverified by this increment. Mobile viewport visual testing has not been completed.

## Stage 2 verification on 2026-09-17

- Migration `20260917143411_create_profiles.sql` applied through the existing Supabase connector. No CLI or dependencies installed.
- Immediate transaction test confirmed a new Auth row creates an empty profile; rolled back afterward. This checks the trigger, not the real signup API/email flow. The connector could not impersonate `supabase_auth_admin`; no permissions were changed to bypass that limitation.
- Existing account backfill verified: one Auth user, one profile, zero missing profiles.
- `supabase/tests/profile-ownership.sql` passed against the live database within a rolled-back transaction: own-profile SELECT/save/clear, anonymous denial, cross-user SELECT/UPDATE denial, column restrictions, client INSERT/DELETE denial, name-length constraint, uniqueness, and cascading deletion.
- Browser direct navigation to `/profile` while signed out redirected to `/sign-in`.
- Lint, typecheck, all 15 unit tests, and production build passed.
- At the original report, live account tests were pending. The user subsequently confirmed Stage 2 profile creation/editing/RLS and signup/OTP/auth/recovery tests passed before approving Stage 2.1.

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

Implemented: Next.js App Router, TypeScript, CSS Modules, global design tokens, ESLint, Supabase Auth SDK/SSR helpers, and the RLS-protected profiles table. Node 22.18+ is required for native TypeScript policy tests. Private Storage is not provisioned. No ORM or global state library has been added.

## Roadmap

1. Foundation: shell, authentication, profile, equipment, venues, rounds, scoring, drafts, session history/editing.
2. Analytics: trends, PBs, consistency, volume, fatigue, training/competition comparisons.
3. Context/media: private images, grouping viewer, NEA observations/forecasts, backend caching, weather context.
4. Goals and competitions.
5. Evidence-grounded AI coaching.

Weather outages must not block scoring. Forecasts and observations remain separate, with source/time labels. Never assign current weather to historical sessions. Data/media export and deletion are required before public launch.

## Open decisions at relevant stages

- Authentication: finish the post-migration live regression checklist with the user. Preserve the existing email/password and six-digit OTP setup.
- Scoring: X/tie-breaking and target-face rules, bounds for custom rounds, mixed arrangements, multiple rounds per session.
- Context: fatigue scale, duration fields, historical correction policy, privacy-preserving local draft cleanup.
- Analytics: sample sizes and exact metric definitions.
- Deployment: hosting, backups, recovery, deletion retention semantics.

## Next task

Complete the pending live Stage 2 checks, then report for review. Do not proceed to further data tables or scoring without approval.

## Signup email carry-forward

Signup remembers the submitted email in an HttpOnly, SameSite=Lax UI-context cookie for up to one hour, cleared after successful email-code verification. This is not a session or OTP and grants no access; Supabase still verifies the email/code and enforces the separate 300-second code expiry. The verification page shows only a code input and the recipient email. It has no Already confirmed link. Without signup context, it returns to registration. Read the email on any device, then enter the code in the signup browser; this convenience step does not require the old PKCE verifier. Hosted code-only email templates and expiry still need confirmation and live testing.
