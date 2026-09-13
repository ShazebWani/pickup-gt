# Dev log

Running engineering log for Pickup GT. Append entries with `./scripts/log.sh "message"` — don't hand-edit the format below it.

### 2026-09-11 01:09 EDT
Commit: [`a414e49`](https://github.com/ShazebWani/pickup-gt/commit/a414e49)

Scaffolded Phase 1 MVP: Expo Router app (auth, list, map, create, detail, profile), Express API with validation and Firestore transactions, Open-Meteo weather caching, and course docs/tooling

### 2026-09-11 02:20 EDT
Commit: [`e16d33a`](https://github.com/ShazebWani/pickup-gt/commit/e16d33a)

Fixed local dev: server/.env had FIREBASE_SERVICE_ACCOUNT set to the literal shell-command text from the setup comment instead of its JSON output, causing JSON.parse to fail on boot. Replaced with the actual minified service account JSON; server now starts cleanly.

### 2026-09-13 15:43 EDT
Commit: [`0319cef`](https://github.com/ShazebWani/pickup-gt/commit/0319cef)

Added course assignment submission docs (SUBMISSION, REFERENCES, DEBUGGING, GIT_NARRATIVE, PARTNER_SETUP) and linked them from README

### 2026-09-13 18:29 EDT
Commit: [`8b8330b`](https://github.com/ShazebWani/pickup-gt/commit/8b8330b)

Forced light mode (#14): changed userInterfaceStyle from 'automatic' to 'light' in app/app.config.js, and added <StatusBar style="dark" /> from expo-status-bar at the top of RootLayout in app/app/_layout.tsx. I put it outside RootNavigation so it also covers the loading spinner shown while auth initializes. Heads up: userInterfaceStyle is native config, so a running Expo Go session won't pick it up after a fast refresh. You have to fully restart the app (and on a dev build, rebuild it) before the change shows up.
