# Arc Track mobile

This Expo Router app supports Supabase email/password sign-in and six-digit email confirmation/recovery codes, Session and Round creation, native target-first Arrow scoring, Analytics, a local Arrow Counter, the join-code Organisation model, Profile editing, and sign-out. Arrow scoring uses the shared `@arc-track/core` model and saves to the existing `session_ends` and `arrows` tables.

From the repository root, run `npm install`, then copy `apps/mobile/.env.example` to `apps/mobile/.env.local`. Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the same **public** Arc Track project values used by the web app. Never put a service-role or secret key here. The `.env.local` file is ignored by Git.

Start Metro with `npm run start -w @arc-track/mobile` and open the app in Expo Go. Open a Session and Round to score Arrows. Select an entered Arrow from its score slot or End history to move it, correct its score, clear its marker, or retry saving. The app uses AsyncStorage for Supabase Auth and Arrow Counter persistence and the existing owner RLS policies. Failed Arrow saves remain visible for retry; full offline synchronisation is not included yet.

`eas.json` contains local development, internal preview, and production build profiles. Before any remote build, set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the corresponding EAS environment, confirm that they point to the intended Arc Track project, and supply the final iOS bundle identifier, Android package identifier, icon/splash assets, and build numbers in Expo configuration. `EXPO_PUBLIC_` values are bundled into the app: use only the publishable key, never a service-role or secret key. The current Round-update SQL and fixture are review-only and have not been applied.

Round configuration from the scoring screen stays read-only until the reviewed owner Round-update RPC is applied. The Configure form appears only before the first saved/optimistic Arrow; its Save action also requires `EXPO_PUBLIC_ROUND_UPDATE_ENABLED=true`. Keep this flag unset or `false` until the RPC exists and has been runtime-tested.

Checks: `npm run test -w @arc-track/mobile`, `npm run typecheck -w @arc-track/mobile`, and, from `apps/mobile`, `npx expo export --platform android` or `npx expo export --platform ios`.
