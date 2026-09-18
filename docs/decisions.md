# Architectural decisions

## One Next.js application

Use the App Router and TypeScript. Keep routes thin, feature code together, and browser interactivity scoped to components that need it. No separate backend service is necessary at this stage.

## Preserve planning assets

Place the app under `web/` beside the existing proposal documents and their generation scripts. Do not move or overwrite those assets. This app belongs to the existing repository; do not initialise a nested Git repository.

## Server rendering first

The root and platform layouts and page content are Server Components. Navigation and auth forms use focused client boundaries. Explicit server identity checks protect the platform layout and each current platform page. The route group itself is not access control.

## Styling

Use shared CSS variables for peach, greige, deep brown, spacing, and radii. CSS Modules scope component styles. Use system fonts to avoid font downloads during local setup/build. Preserve original target colours when media is implemented. Icon SVGs are interface symbols, not recoloured user images.

## Dependencies

Use Next.js, React, React DOM, and Supabase Auth/SSR helpers at runtime. Use TypeScript, the native Node test runner, and Next.js ESLint configuration for development. Pin installed versions and retain the lockfile for reproducible installs. Other dependencies remain deferred to their own increments.

## Honest preview

Navigation and round explanations work. Stage 1 authentication is the user-confirmed working baseline. Profile saving is implemented; scoring and performance analysis remain deferred. Auth forms are disabled if configuration is missing; protected pages never fall back to public access. Bind local servers to loopback and disable search indexing. Record new live regression results separately from the baseline.

## Future data boundary

Supabase Auth owns account identities. `public.profiles.id` is both the primary key and a foreign key to `auth.users.id`, with cascading deletion. Future data operations must verify identity, ownership, and input; row-level security must defend private records.

## Authentication increment

Email/password with confirmation and recovery. All Supabase calls are server-side; session cookies are HttpOnly, SameSite=Lax, and Secure when APP_URL uses HTTPS. Proxy refreshes cookies, while pages/actions verify identity independently. Callback destinations are allowlisted and the canonical APP_URL controls configured redirects. Missing configuration returns a relative sign-in redirect. Do not trust getSession user objects as authorisation. No service-role/secret key is used. Sign-out is local to the current browser. Real email and two-account tests remain pending.

## Email codes and real development accounts

User approved six-digit email codes with five-minute (300-second) provider-enforced expiry for signup confirmation and recovery only. Normal sign-in remains email/password, with no verification navigation link. Code entry follows registration or recovery requests. Separate Server Actions fix the verification purpose and destination; forms cannot select arbitrary OTP types or redirects. Supabase generates/verifies codes and enforces sending/verification limits. Codes and passwords are not stored in application storage or URLs. The verifying browser receives the existing session cookies without an originating PKCE verifier requirement. The legacy callback is retained, but new templates contain codes only. Hosted settings/templates and real-account flows must be verified.

There is no development bypass. Test accounts are ordinary Supabase users without special application privileges. Stage 2 adds only the profile table described below.

## Stage 2 minimal private profile

Profile fields are `id`, nullable `display_name`, `created_at`, and `updated_at`. Trim display names, store blank as null, and allow up to 80 Unicode characters. The server derives ownership from `requireUser()` rather than submitted IDs. Email stays in Auth and is read-only on this page. No onboarding gate or additional profile fields are introduced.

An AFTER INSERT trigger on `auth.users` inserts the empty profile with `ON CONFLICT DO NOTHING`; the migration backfills existing users. Its SECURITY DEFINER function has an empty search path, fully qualified table references, and no client EXECUTE grants. Trigger failure can block signup, so real signup regression is required after migration. Creating an empty profile does not create a session or grant access to an unconfirmed account.

RLS allows authenticated users to SELECT and UPDATE only their own row using `auth.uid()`. Grants permit UPDATE only on `display_name`; clients cannot INSERT or DELETE. A separate trigger maintains `updated_at`. The platform layout, profile page, and save action reuse the existing identity checks. The sole proxy change includes `/profile/:path*` for existing cookie refresh handling.

The approved migration was applied through the existing Supabase connector and saved under its returned version, `20260917143411`; no CLI installation was needed. Ownership regression SQL uses temporary Auth fixtures and rolls the transaction back. Any future rollback must be explicitly approved because dropping the profiles table would delete saved names; remove the Auth trigger before its function/table. No rollback was performed.

## Stage 2.1 archer details and personalization

Migration `20260917150016_extend_profile_details` adds nullable text columns `club_or_team` (120 characters), `division` (Recurve/Compound/Barebow/Other), `shooting_hand` (Left/Right), `experience_level` (Beginner/Intermediate/Advanced), and `bio` (500 characters). Competitive is not an experience level. Barebow/Other are descriptive profile options only; scoring remains Recurve/Compound. Lengths count Unicode code points.

The server trims text and stores blank values as null. Bio preserves internal line breaks/indentation. Its database constraint uses the explicit ECMAScript String.trim whitespace set, including tabs, line terminators, and Unicode spaces; tests check exact agreement with JavaScript. The database accepts normalized nonempty bio or null and rejects untrimmed direct writes. No normalizing database trigger is added.

Existing ownership RLS policies and both triggers remain unchanged. Only column-level UPDATE privileges for the five new columns are added; clients still cannot insert/delete profiles or change ownership/timestamps. The profile action derives identity from the existing requireUser helper and only saves explicitly validated fields.

The Account section keeps authenticated email read-only and links Change password to the existing `/update-password` route. Auth implementations/settings and proxy are untouched. No credentials or Auth metadata copies are introduced.

Dashboard and Sessions use a server-only reader of the authenticated user's own display_name. Blank/missing names or profile-read failures use Archer. No cross-request name cache is introduced. Saving revalidates Profile, Dashboard, and Sessions. Profile fields remain private; no public biography or new session-creation flow is implied.

## Stage 2.2 profile cards and email change

Migration `20260918020718_remove_profile_bio` dropped the `bio` column after all current profile loading, saving, validation, form, and tests stopped using it. The one existing non-null bio value was permanently removed with user approval. The other profile columns and existing ownership RLS policies remain unchanged.

The normal Profile view displays separate Account and Archer Profile cards. Archer details are text until Edit profile is selected; Cancel discards unsaved values and a successful save returns to the card. Dashboard and Sessions still read `profiles.display_name`, falling back to Archer. At desktop width, both cards occupy the left column; the right column is empty without a placeholder. At narrow widths, the cards stack. The shared navigation uses only a small mobile spacing adjustment so all three links fit at 320px.

Account email remains exclusively in Supabase Auth. An authenticated Server Action validates a different new email and calls `supabase.auth.updateUser({ email }, { emailRedirectTo: appUrl + '/auth/callback' })` through the existing cookie client. A successful request is explicitly pending, never presented as an immediate email change. Secure Email Change was observed enabled: the existing template sends confirmation links to the old and new addresses, and the existing PKCE callback is reused without edits. Change password continues to link to `/update-password`.

Observed configuration discrepancy: the hosted email OTP expiry was 3600 seconds on 2026-09-17 despite a prior 300-second requirement. No Auth setting was changed in Stage 2.2; review it separately before claiming five-minute expiry.

## Signup email carry-forward (existing behavior)

Signup remembers the submitted email in an HttpOnly, SameSite=Lax UI-context cookie for up to one hour, cleared after successful email-code verification. This is not a session or OTP and grants no access; Supabase still verifies the email/code and enforces its hosted expiry setting. The verification page shows only a code input and the recipient email. It has no Already confirmed link. Without signup context, it returns to registration. Read the email on any device, then enter the code in the signup browser; this convenience step does not require the old PKCE verifier. The earlier five-minute expiry requirement differs from the observed 3600-second hosted setting and needs separate review.
