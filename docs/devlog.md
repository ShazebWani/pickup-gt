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
