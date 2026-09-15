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

Navigation and round explanations work. Authentication code is implemented but its live flows await Supabase connection and verification. Saving and performance analysis do not exist yet. Auth forms are disabled if configuration is missing; protected pages never fall back to public access. Bind local servers to loopback and disable search indexing. Row-level privacy must be implemented and tested with the eventual tables.

## Future data boundary

Supabase Auth owns account identities. The future ArcherProfile will have a one-to-one relationship with identity; fields and cardinalities must be discussed before migrations. Future data operations must verify identity, ownership, and input; row-level security must defend private records. No custom tables or policies have been created yet.

## Authentication increment

Email/password with confirmation and recovery. All Supabase calls are server-side; session cookies are HttpOnly, SameSite=Lax, and Secure when APP_URL uses HTTPS. Proxy refreshes cookies, while pages/actions verify identity independently. Callback destinations are allowlisted and the canonical APP_URL controls configured redirects. Missing configuration returns a relative sign-in redirect. Do not trust getSession user objects as authorisation. No service-role/secret key is used. Sign-out is local to the current browser. Real email and two-account tests remain pending.
