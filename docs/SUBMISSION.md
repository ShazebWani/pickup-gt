# Pickup GT — Assignment Submission

**Author:** Shazeb Wani
**Repository:** https://github.com/ShazebWani/pickup-gt
**Course:** [SHAZEB: fill in — course number/name]
**Backend URL:** https://pickup-gt-api.onrender.com ([`/health`](https://pickup-gt-api.onrender.com/health) — verified live and responding `200`)

---

## Repository, backend, and how to run it

- **Repo:** https://github.com/ShazebWani/pickup-gt (public)
- **Live backend API:** https://pickup-gt-api.onrender.com — every endpoint documented and `curl`-tested in [`docs/api.md`](api.md)
- **Run it yourself, short version** (full walkthrough in [`docs/setup.md`](setup.md)):
  ```bash
  git clone https://github.com/ShazebWani/pickup-gt.git
  cd pickup-gt/app
  npm install
  cp .env.example .env   # fill in Firebase config + point EXPO_PUBLIC_API_BASE_URL
                          # at https://pickup-gt-api.onrender.com to skip running the server locally
  npx expo start
  ```
  Scan the QR code with **Expo Go** on a physical iPhone or Android phone. You do not need to run `server/` locally — the app is already pointed at the live Render deployment above. If you want to run the server locally instead (e.g. to test a server change before pushing), see `docs/setup.md` §5–6.
- **Onboarding a partner specifically:** [`docs/PARTNER_SETUP.md`](PARTNER_SETUP.md) — written for someone who has never seen this repo.

---

## Project description

### What it is

Pickup GT is a cross-platform mobile app (iOS + Android, via Expo Go) for organizing pickup sports around the Georgia Tech campus. A user posts that they're playing a sport at a specific spot and time and needs a certain number of players; other users see the game on a live map and in a list, and can join it. Rosters update in real time across every device viewing the game, and each game shows the weather forecast for its start time.

The problem it addresses: court/field coordination at GT currently happens in scattered group chats with no shared, live view of what's actually happening nearby right now.

### Why this project

> [SHAZEB: fill in — why you chose this project and what you hoped to learn from it. This is yours to answer, not something to reconstruct from the repo.]

### Features, concretely

- **Auth.** Email/password sign-up and login via Firebase Authentication. Signup collects a display name (required, since it appears in rosters), persists the session on-device, and writes a `users/{uid}` Firestore document. Tabs are gated behind an authenticated session (`app/app/_layout.tsx`).
- **Live games list.** A `Tabs` home screen queries Firestore (`onSnapshot`) for all upcoming, non-cancelled games, sorted soonest-first, with a horizontal sport-filter chip row. Each row shows sport, spot name, a relative start time ("in 45m"), `x/y joined`, distance from the user (when location permission is granted), and a rain indicator. Pull-to-refresh and an empty state are included.
- **Map view.** `react-native-maps` centered on GT campus, one marker per upcoming game color-coded by sport, with a tappable callout linking to the game's detail screen.
- **Create game.** Sport picker, a venue chosen from a hardcoded list of real GT courts/fields (`app/src/lib/venues.ts`) or a free pin dropped on an embedded map, a date/time picker, and stepper controls for duration and capacity. Submits to the Express API, which validates server-side and writes the Firestore document.
- **Join / leave / cancel.** Join and leave are Firestore transactions run server-side (reject on full, already-joined, cancelled, or already-started games). Only the host can cancel a game, with a confirmation prompt.
- **Weather.** The server calls Open-Meteo's free forecast API when a game is created, picks the forecast hour nearest the game's start time, and caches the result on the game document (`weather: {tempF, precipProbability, conditionCode, fetchedAt}`) so the client never calls a third-party API directly. A manual refresh endpoint exists to re-fetch it.
- **Location-based sorting.** `expo-location` requests foreground permission once; if granted, the games list is sorted by haversine distance from the user instead of by start time, with distance shown per row (`app/src/lib/geo.ts`, `app/src/lib/useLocation.ts`). Denial falls back to sorting by start time rather than erroring.
- **Activity/event logging.** The server writes an `events/{eventId}` document on every mutating call (`game_created`, `game_joined`, `game_left`), and the client logs `game_viewed` when a user opens a game's detail screen. See "Known gaps" — `app_opened` is defined but not yet wired up.
- **Profile.** Display name, count of games hosted and joined (computed client-side from the games collection), sign out.

### Tech stack and why

| Layer | Choice | Why |
|---|---|---|
| Mobile | React Native + Expo (managed workflow), Expo Router | Runs in Expo Go with no native build step — a classmate can clone, `npm install`, `npx expo start`, and scan a QR code onto their own phone in minutes. This was a hard constraint set in the project's own PRD (`Pickup-GT-PRD.md`, §2). Expo Router gives file-based routing for the six screens. |
| Language | TypeScript, strict mode | Catches the shape mismatches between client reads and server writes early, especially around Firestore's `Timestamp` type, which differs between the client SDK and `firebase-admin`. |
| Auth | Firebase Authentication (email/password) | Free tier, no backend auth code to write for password hashing/sessions, and integrates directly with Firestore security rules via `request.auth`. |
| Database | Cloud Firestore | Client reads live via `onSnapshot` (so rosters update on every viewing device within seconds with no polling), while all writes go through the Express API so validation and business rules (capacity, transactions) live in one place. The roster is denormalized directly onto each game document, so a list row and a join/leave transaction are both single-document operations. |
| Backend | Node.js + Express, deployed on Render (free tier) | Small REST surface (5 endpoints), a team already comfortable with Express, and Render's free tier is sufficient for course-project traffic without a credit card. |
| Maps | `react-native-maps` | Works inside Expo Go (Apple Maps on iOS with no key required, Google Maps on Android with an optional key), unlike some mapping libraries that require a custom native build. |
| Weather | Open-Meteo | Free, no API key, hourly forecast granularity — fits the "will it rain at game time" use case exactly with no signup friction for a course project. |

### References and AI disclosure

Every tool, tutorial, doc page, and AI assistant used — in the order they were used, from environment setup through coding, deploying, and testing — is in **[`docs/REFERENCES.md`](REFERENCES.md)**. That file's final section is the mandatory AI-assistance disclosure: what was generated by Claude Code, what was directed versus decided by the model, specific examples of where the model's own output was wrong and had to be corrected, and what was learned from working this way.

---

## Requirement mapping

| # | Requirement | How this project satisfies it | Evidence |
|---|---|---|---|
| 1 | Install a development environment | Node.js, Expo CLI, Firebase project, and Expo Go on a physical phone, documented step by step. | [`docs/setup.md`](setup.md) |
| 2 | Build a sample app running on a **physical device**, accepting user input or environmental stimulation | The full app above, run via Expo Go on a physical iPhone/Android phone (not a simulator — see `docs/setup.md` §1, "you'll need a physical phone"). User input: sign-up/login forms, game creation form, join/leave/cancel actions. Environmental stimulation: the device's real GPS location is read (`expo-location`) and used to sort/distance-annotate the games list. | `app/src/lib/useLocation.ts`, `app/src/lib/geo.ts`, `app/app/(tabs)/index.tsx` |
| 3 | Check code into version control; use repo features to track tasks, bugs, and resources | Public GitHub repo, 7 descriptive commits, custom issue templates for bugs and tasks, and 14 issues opened and labeled (one per original build-order step, plus ongoing work) — 12 closed as their step shipped, 2 open (`#13` docs, `#14` the partner's task). | https://github.com/ShazebWani/pickup-gt, `.github/ISSUE_TEMPLATE/bug.yml`, `.github/ISSUE_TEMPLATE/task.yml`, issues #1–#14 |
| 4 | A partner checks out the code, builds, changes, tests, deploys, and checks back in — and vice versa | **Not yet done.** Scoped and ready: the partner's assigned task is issue [#14](https://github.com/ShazebWani/pickup-gt/issues/14) ("force light mode"), and [`docs/PARTNER_SETUP.md`](PARTNER_SETUP.md) is written for a partner who's never seen the repo. The narrative doc is scaffolded and waiting to be filled in after the exchange. | `docs/PARTNER_SETUP.md`, issue #14, [`docs/GIT_NARRATIVE.md`](GIT_NARRATIVE.md) (skeleton) |
| 5 | Deploy a web service that processes/stores/exchanges data with the app via a REST API, backend in version control | The Express REST API (5 endpoints, Firebase-token auth, Firestore transactions, Open-Meteo integration) is deployed live on Render and verified: every documented endpoint and status code (`200`/`401`/`404`/`409`, plus a full authenticated create→cancel→reject cycle) was tested directly against the deployed URL, not just locally. | Live: https://pickup-gt-api.onrender.com/health · Code: `server/src/` (committed in `a414e49`) · [`docs/api.md`](api.md) |

**Overall status: items 1, 2, 3, and 5 are done. Item 4 has the code and docs ready (`docs/PARTNER_SETUP.md`, issue #14) but the partner exchange itself has not happened yet.** This is the single most important gap remaining in this submission — see "Known gaps" below.

---

## Exceptional features

| Feature | What it does | Where it lives | Status |
|---|---|---|---|
| Authentication | Firebase email/password auth, session persisted on-device via `AsyncStorage`, server verifies the Firebase ID token on every write via `admin.auth().verifyIdToken()` rather than trusting the client. | `app/src/lib/firebase.ts`, `app/app/(auth)/`, `server/src/middleware/auth.ts` | Fully implemented |
| Third-party service data | The server calls the Open-Meteo forecast API for every created game, picks the closest hourly bucket to the game's start time, and caches it on the Firestore document instead of calling it from the client. | `server/src/services/weather.ts`, `app/src/lib/weather.ts` | Fully implemented |
| Device sensors / native features | Reads the phone's real GPS location (`expo-location`, with a graceful fallback to time-sorting on permission denial) to sort games by distance and show a live blue dot on the map; embeds a fully interactive native map (`react-native-maps`) for browsing, pin-dropping, and directions handoff to the phone's native Maps app. | `app/src/lib/useLocation.ts`, `app/app/(tabs)/map.tsx`, `app/app/create.tsx` | Fully implemented |
| User-generated content shown to other users | A game posted by one user is immediately visible to every other user on the list and map, and the live roster (with display names and join timestamps) is visible to anyone viewing that game — this is the core mechanic of the app, not an add-on. | `app/app/game/[id].tsx`, `server/src/routes/games.ts` (join/leave transactions) | Fully implemented |
| UI and screen-flow experiments | Iterated on navigation structure: the app originally rendered top-level screens with `<Slot />` (no header, no back button, no way back from the create/detail screens except an iOS edge-swipe gesture). Rebuilt the root as a `Stack` with a modal presentation for game creation (with a "Cancel" header action) and a dynamic header title on the game detail screen; added a shared design-token file (`src/theme.ts`) and consistent pressed/loading states across every screen. | `app/app/_layout.tsx`, `app/src/theme.ts`, committed in `af0758d` | Fully implemented |
| Additional platform | Attempted a web export (`app.config.js` has a `web` block, and `react-native-web` is a dependency) so the app could also run in a browser. **Not functional** — `react-native-maps` does not support web and breaks the entire bundle at build time (`(0, _reactNativeWebDistIndex.codegenNativeComponent) is not a function`), verified directly by running `npx expo start --web`. This was not pursued further because the project's own PRD explicitly scopes it to Expo Go only. | `app/app.config.js` (`web` block), `app/package.json` (`react-native-web`) | Attempted, not working — documented as a deliberate non-goal, see `docs/DEBUGGING.md` |
| Application/user activity data collection | Server writes an `events` document on every mutating call (`game_created`, `game_joined`, `game_left`, plus `host_cancelled` as metadata on a leave event), and the client logs `game_viewed` when a game's detail screen opens. | `server/src/routes/games.ts` (`logEvent`), `app/src/lib/events.ts` | **Partially implemented** — the `app_opened` event type exists in `app/src/types/index.ts` and is accepted by the client's `logEvent()` function's type signature, but nothing in the app actually calls `logEvent('app_opened')` yet. It would need to be added, e.g. on mount in `app/app/_layout.tsx`. |
| Notifications | Not built. | — | Deliberately out of scope for Phase 1 — requires an EAS development build, which breaks the "must run in Expo Go" constraint (`Pickup-GT-PRD.md` §12, Phase 3). |

---

## Known gaps (read this before submitting)

Being direct about what's not done, per the assignment's own guidance that documenting real state — including what didn't happen — is worth more than a polished story:

1. ~~No live backend URL.~~ **Resolved.** `server/` is deployed to Render at https://pickup-gt-api.onrender.com, verified live (issue #5 closed). `docs/api.md`'s `curl` examples were tested directly against the deployed URL, including a full authenticated create/cancel cycle with a real (since-deleted) test account.
2. ~~The UI/navigation polish work is uncommitted.~~ **Resolved.** Committed in `af0758d`.
3. **No partner exchange yet.** Requirement #4 has zero evidence beyond preparation (`docs/PARTNER_SETUP.md` and issue #14 exist and are ready to hand off). `docs/GIT_NARRATIVE.md` is a skeleton, not a narrative. **This is the one remaining hard blocker on this submission.**
4. **Screenshots are not included in this document** — see the placeholder list below. None of these were captured by an AI assistant; a physical device is required.
5. **Two placeholders still need your own words**, not reconstructible from the repo: "Why this project" above, and the course name/number in the header.

---

## Git history and partner coordination

Full commit-by-commit summary, and the narrative of how the partner exchange was planned, communicated, and handed off in both directions, is in **[`docs/GIT_NARRATIVE.md`](GIT_NARRATIVE.md)**. Short version as of this writing: real, descriptive commits directly to `main` (no branching/PR flow exercised yet, since that's specifically what the partner exchange introduces), a populated issue tracker with custom bug/task templates, 10 of 14 issues closed as their step shipped. The partner exchange itself — and therefore the coordination narrative — has not happened yet; `docs/GIT_NARRATIVE.md`'s narrative section is currently a set of prompts to fill in once it does, not a retrospective.

---

## Screenshot placeholders

Numbered so you know exactly what to capture — screenshots or a short screen-recording/video link both work. Include the failure/error states, not just the happy path — the assignment specifically rewards evidence of debugging.

1. **Login screen**, empty, on your physical phone in Expo Go.
2. **Sign-up screen** filled in with a real (or clearly-test) display name/email, before submitting.
3. **Games list — empty state**, the "No games yet / Be the first to start one near campus" view, before any games exist.
4. **Games list — populated**, showing at least 2–3 games, the sport filter chip row, and a distance shown on at least one card (proves location permission worked).
5. **Create game form**, with a venue chip selected and the embedded map pin visible.
6. **Create game — validation error**, e.g. the "Missing spot" or "Missing location" alert, to show client-side validation working.
7. **Game detail screen**, fully scrolled to show sport, spot, weather chips, the embedded map, and at least one player in the roster.
8. **Join a full game — 409 error**, the "Could not join / This game is full" alert. You'll need to fill a game to capacity first (capacity as low as 2 makes this fast).
9. **Map tab**, with at least two color-coded markers for different sports and one callout open.
10. **Cancel game confirmation dialog**, as the host, before confirming.
11. **Profile screen**, showing non-zero hosted/joined counts.
12. **Two physical devices side by side** (or two screen recordings), showing a game created on one device appearing on the other within a few seconds without a manual refresh — this is the strongest single piece of evidence for the "live" claim in the project description.
13. **Server cold-start / network failure state** — e.g. the "server took too long to respond, waking up from a cold start" message from `app/src/lib/api.ts`, captured after the Render service (https://pickup-gt-api.onrender.com) has been idle for ~15+ minutes.
14. **Firebase console**, Firestore data view, showing real `games`/`users`/`events` documents created by the app.
15. **GitHub issues board**, showing the task labels and a mix of open/closed issues, as evidence for requirement #3.
16. **Terminal output of a `curl` request** against the deployed `/health` endpoint, once live, as evidence for requirement #5.
