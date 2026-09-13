# Annotated references

Roughly in the order things were used: environment setup, then coding, then deploying, then testing. Every entry below maps to a real dependency in `app/package.json` or `server/package.json`, a real doc comment, or a real problem we hit — nothing here is a generic "things you might use" list.

The mandatory AI-assistance disclosure is its own section at the end. Read it in full — do not skip it when citing this document.

---

## Environment setup

- **Expo documentation** — https://docs.expo.dev/
  Used to understand the managed workflow and the "no custom native build" constraint that shaped the whole stack (see `Pickup-GT-PRD.md` §2). This is the umbrella site for most of the Expo-specific references below.

- **Expo Router — Introduction** — https://docs.expo.dev/router/introduction/
  Used to set up file-based routing (`app/app/`): the `(auth)` and `(tabs)` groups, and the top-level `create` and `game/[id]` routes. Learned that a route group's own layout (`_layout.tsx`) controls its navigator, but the **root** layout has to be an actual `Stack`/`Tabs`/etc. for its children to get any navigation chrome at all — see `docs/DEBUGGING.md` for the bug this caused.

- **Firebase Console / Firebase project setup** — https://console.firebase.google.com/
  Used to create the project, enable Email/Password auth, enable Firestore, and generate the web app config and the service-account key. Referenced directly in `docs/setup.md` §3.

- **Firebase Admin SDK — Setup** — https://firebase.google.com/docs/admin/setup
  Used to understand the service-account JSON format the server needs in `FIREBASE_SERVICE_ACCOUNT`. This is the doc that would have prevented the bug recorded in `docs/DEBUGGING.md` #1 (the env var was set to shell-command text instead of the command's JSON output) if it had been read more carefully the first time.

- **Node.js downloads/docs** — https://nodejs.org/
  Version prerequisite for both `app/` and `server/`, per `docs/setup.md` §1.

---

## Coding — mobile app (`app/`)

- **Expo Router — Modals** — https://docs.expo.dev/router/advanced/modals/
  Used for the `create` screen's `presentation: 'modal'` option in `app/app/_layout.tsx`, so game creation opens as a sheet with a "Cancel" header action instead of a plain pushed screen.

- **React Navigation — Headers** — https://reactnavigation.org/docs/headers/
  Expo Router's `Stack.Screen options` (headerLeft, title, headerShown) are React Navigation's under the hood; used this to dynamically set the game detail screen's header title to the game's spot name via `navigation.setOptions()` in `app/app/game/[id].tsx`.

- **Firebase — Web setup** — https://firebase.google.com/docs/web/setup
  Used for the base `initializeApp` config shape in `app/src/lib/firebase.ts`.

- **Firebase Auth — persistence on React Native** — https://firebase.google.com/docs/auth/web/auth-state-persistence
  Used to configure `initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })` so a login survives an app restart. `getReactNativePersistence` isn't in the modular Firebase JS SDK's TypeScript types for the web build, only its React Native build — the `@ts-expect-error` comment directly above the import in `app/src/lib/firebase.ts` documents this exact gap between what Metro resolves at runtime and what `tsc` can see statically.

- **Firebase Firestore — `onSnapshot` (realtime updates)** — https://firebase.google.com/docs/firestore/query-data/listen
  Core to the whole "live" pitch of the app: `app/src/lib/useUpcomingGames.ts` and `app/app/game/[id].tsx` both use `onSnapshot` instead of one-time `getDocs` reads, which is what makes a roster update on a second device without a manual refresh.

- **Expo Location** — https://docs.expo.dev/versions/latest/sdk/location/
  Used for `requestForegroundPermissionsAsync` and `getCurrentPositionAsync` in `app/src/lib/useLocation.ts`. Learned to treat permission denial as a normal, non-error outcome (falls back to sorting by start time) rather than something to alert the user about.

- **react-native-maps** — https://github.com/react-native-maps/react-native-maps
  Used for the map tab, the pin-drop UI in `create.tsx`, and the static pin preview in `game/[id].tsx`. `PROVIDER_GOOGLE` is set only on Android (`Platform.OS === 'android'`); iOS uses the default Apple Maps provider, which needs no API key — this split is what lets the app run with zero maps configuration out of the box on iOS.

- **`@react-native-community/datetimepicker`** — https://github.com/react-native-datetimepicker/datetimepicker
  Used for the start-time picker in `create.tsx`. Learned the iOS/Android behavior differs enough that the picker has to be manually dismissed on Android (`setShowPicker(Platform.OS === 'ios')` inside `onChange`) but stays open inline on iOS.

- **`@react-native-async-storage/async-storage`** — https://react-native-async-storage.github.io/async-storage/docs/install/
  The persistence backend for Firebase Auth sessions, see above.

- **`@expo/vector-icons`** — https://docs.expo.dev/guides/icons/ (icon browser: https://icons.expo.fyi/)
  Used for every icon in the app (`Ionicons` set) — tab bar icons, the weather/location/rain glyphs on cards, the sign-out icon, etc.

- **`expo-constants`** — https://docs.expo.dev/versions/latest/sdk/constants/
  Used to read `app.config.js`'s `extra` block (Firebase config, API base URL) at runtime in `app/src/lib/firebase.ts` and `app/src/lib/api.ts`, since `app.config.js` (a JS file) can read `process.env` at config-evaluation time in a way the bundled app code can't do directly for non-`EXPO_PUBLIC_`-prefixed values.

- **`expo-splash-screen`, `expo-system-ui`, `expo-font`, `expo-linking`, `expo-status-bar`** — https://docs.expo.dev/versions/latest/
  Standard Expo Router scaffold dependencies (splash screen, system UI color, font loading, deep linking, status bar). `expo-status-bar` is currently installed but unused — flagged as a likely touch point for issue #14 (forcing light mode).

- **`react-native-safe-area-context`** — https://github.com/AppAndFlow/react-native-safe-area-context
  Used via `useSafeAreaInsets()` on the map tab's floating title pill, so it clears the notch/status bar on every device rather than using a hardcoded top offset. Learned that Expo Router wraps the whole app in a `SafeAreaProvider` automatically (confirmed by reading `node_modules/expo-router/build/ExpoRoot.js` directly), so no manual provider setup was needed.

- **`react-native-gesture-handler`, `react-native-reanimated`, `react-native-worklets`, `react-native-screens`** — Expo Router scaffold dependencies for navigation gesture handling and native-stack performance. Not directly authored against — installed as peer dependencies of `expo-router`/React Navigation.

---

## Coding — server (`server/`)

- **Express** — https://expressjs.com/en/guide/routing.html
  Used for the entire REST API (`server/src/index.ts`, `server/src/routes/games.ts`) — 5 routes, JSON body parsing, a catch-all 404 handler.

- **`cors`** — https://www.npmjs.com/package/cors
  Used as blanket middleware (`app.use(cors())`) so the Expo app (served from a Metro dev server on an arbitrary LAN origin) can call the API without a CORS rejection.

- **`dotenv`** — https://www.npmjs.com/package/dotenv
  Loads `server/.env` in local development (`import 'dotenv/config'` in `server/src/index.ts`). Render's dashboard environment variables replace this in production — no code path difference needed.

- **Firebase Admin SDK — Verify ID tokens** — https://firebase.google.com/docs/auth/admin/verify-id-tokens
  The entire authorization model of the API: `server/src/middleware/auth.ts` calls `admin.auth().verifyIdToken()` on the `Authorization: Bearer <token>` header of every write request, so `hostUid` and every other identity fact is taken from a verified token, never trusted from the request body.

- **Cloud Firestore — Transactions** — https://firebase.google.com/docs/firestore/manage-data/transactions
  Used for join/leave in `server/src/routes/games.ts` (`db.runTransaction`), so a capacity check and the roster write happen atomically — two users joining the last open slot at the same instant can't both succeed.

- **Open-Meteo — Forecast API docs** — https://open-meteo.com/en/docs
  Used for the exact query shape in `server/src/services/weather.ts` (`hourly=temperature_2m,precipitation_probability,weather_code`, `temperature_unit=fahrenheit`, `forecast_days=16`). Learned the API returns an hourly array rather than a single "current" value, which is why the code picks the closest timestamp to the game's start time by hand instead of trusting a single field.

---

## Deploying

- **Render — Deploy a Node.js Express app** — https://render.com/docs/deploy-node-express-app
  Referenced for the intended deployment path (`npm run build && npm start`, `PORT` env var, free-tier cold starts). **Not yet acted on** — see `docs/DEBUGGING.md` and issue #5. This reference is included because it's the exact page that needs to be followed next, not because deployment is done.

- **Render — Free instance types / cold starts** — https://render.com/docs/free
  Source for the "first request after idle can take up to a minute" behavior documented in `docs/setup.md` and handled client-side with a 65-second fetch timeout in `app/src/lib/api.ts` (`REQUEST_TIMEOUT_MS`).

- **Firebase — Firestore Security Rules, Get started** — https://firebase.google.com/docs/firestore/security/get-started
  Used to write `firestore.rules`: users can only create/read their own profile document, games are read-only from the client (all writes go through the server's Admin SDK, which bypasses rules entirely), and event documents can only be created by the user they're attributed to.

---

## Testing

- **`curl`** — https://curl.se/docs/manual.html
  Used throughout `docs/api.md` for endpoint examples, and directly in this session to smoke-test `/health` and the unauthenticated error paths (`401`/`404`) against the local server before writing this documentation.

- **Firebase Auth REST API — signInWithPassword** — https://firebase.google.com/docs/reference/rest/auth#section-sign-in-email-password
  Documented in `docs/api.md` as the way to obtain a real ID token for `curl`-testing authenticated endpoints without going through the mobile app.

- **TypeScript — `tsc`** — https://www.typescriptlang.org/docs/handbook/compiler-options.html
  `npx tsc --noEmit` run in `app/` after every round of changes as a fast correctness check (catches broken imports/prop types immediately, before a device is even involved).

---

## AI assistance (mandatory disclosure)

This section covers everything substantively done by or with an AI tool on this project. Read literally: "the model wrote this" is stated plainly wherever it's true.

### What was used

1. **A separate Claude conversation, outside Claude Code, for ideation, scoping, and writing the PRD.** `Pickup-GT-PRD.md` is the artifact of that conversation — its own header states "This is both a PRD and the kickoff prompt for a Claude Code session. Paste the whole thing into Claude Code at the start of the session." That sentence is the direct evidence this was a two-stage process: think and scope in one conversation, then hand the finished spec to Claude Code as a literal kickoff prompt. [SHAZEB: fill in the specific interface used — claude.ai web, the Claude mobile app, etc. — and what you changed from the model's first draft of the PRD, since that conversation isn't visible from inside this repo.]
2. **Claude Code, across multiple sessions, for essentially all implementation.** This includes the initial scaffold (Expo app, Express server, Firestore data model, GitHub repo/issues/labels — commit `a414e49`), a later UI/navigation polish pass, and this documentation-generation pass.

### What was directed versus what the model decided

- **Directed:** the PRD itself (tech stack, data model, screen list, API surface, validation rules, non-goals, and the explicit "build Phase 1 only, stop after each numbered task" build order in `Pickup-GT-PRD.md` §10) came from the user, via the separate ideation conversation above. Claude Code was told to follow it, not to invent product scope.
- **Directed, this session:** "go through it really carefully and make it really functional... it's an MVP but still need it to be nice" — an open instruction to find and fix polish/UX problems, without a specific list of what was broken.
- **Model-decided:** the specific diagnosis that the root cause of a real navigation bug was `app/app/_layout.tsx` rendering `<Slot />` instead of a `<Stack />` (meaning `/create` and `/game/[id]` had no header or back button at all) was found by Claude Code reading the code, not flagged by the user in advance. The model also decided the shape of the fix (a root `Stack` with a modal presentation for `create`), the new `app/src/theme.ts` design-token file, and which specific polish details to add (loading states, pressed-state feedback, icons, safe-area handling).
- **Model-decided, this session:** the structure and content of these five documentation files, and which real repo artifacts to cite as evidence for each requirement — done by reading the actual repo (git log, issues, code, `.env` shapes without exposing secret values) rather than from a template.

### Where the model's output was wrong or needed correction

- **The navigation bug itself is evidence the model's own earlier output was wrong.** The initial scaffold (commit `a414e49`, built by an earlier Claude Code session per the same workflow) shipped the root layout with `<Slot />`, which silently produced screens with no back button. Nothing caught this until a later session went looking for UI problems specifically.
- **`npx expo lint` had an unintended side effect that had to be reverted.** During the polish session, running `expo lint` to check code style auto-installed `eslint`/`eslint-config-expo` as new dependencies and generated an `eslint.config.js`, silently modifying `package.json`/`package-lock.json` as a side effect of a command that was expected to only read files. This was caught by checking `git status` immediately afterward and reverted (`git checkout -- app/package.json app/package-lock.json`, `rm app/eslint.config.js`) before it could be mistaken for an intended change.
- **The model could not visually verify its own UI changes.** No iOS Simulator or Android emulator is installed on the development machine, and `npx expo start --web` fails outright because `react-native-maps` isn't web-compatible. The model fell back to `tsc --noEmit` plus forcing Metro to compile the real iOS bundle over HTTP as a proxy for "does this at least run," and said so plainly rather than claiming a visual check that didn't happen. A human still needs to confirm the UI actually looks right on a real phone.
- [SHAZEB: fill in anything from the earlier scaffold session — corrections you made to the model's first pass at the data model, validation rules, or screens — that isn't visible from the git history alone, since that session's transcript isn't part of this repo.]

### What was learned about working this way

- Treating the PRD as a literal, numbered "build order" with an explicit stop-and-report instruction after each step (§10) made the model's output easier to check incrementally, rather than reviewing one enormous diff at the end.
- Asking the model to "go through it carefully" for polish, without a specific bug list, surfaced a real functional bug (the missing navigation headers) that a narrower request ("make the colors nicer") likely would have missed — open-ended review requests found more than targeted ones did here.
- The model will take side-effecting actions (like `expo lint` installing packages) that look read-only from their name. Checking `git status` after any command that wasn't purely `read`/`grep`-shaped is a cheap habit that caught it before it became a real problem.
- [SHAZEB: fill in your own takeaway — anything about the back-and-forth pace, what you'd direct differently next time, whether you trusted the output less or more after finding the navigation bug.]
