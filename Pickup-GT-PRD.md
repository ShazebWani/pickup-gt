---
title: "Pickup GT: Product Requirements & Build Prompt"
subtitle: "React Native + Expo + Render + Firebase"
author: "Shazeb Wani"
date: "September 2026"
---

# 0. How to use this document

This is both a PRD and the kickoff prompt for a Claude Code session. Paste the whole thing into Claude Code at the start of the session. Build **Phase 1 only**. Do not build Phase 2 or Phase 3 until explicitly asked.

Work incrementally. After each numbered task in Section 10, stop, report what changed, and wait for confirmation before continuing.

---

# 1. Product summary

**Pickup GT** is a cross-platform mobile app for organizing pickup sports around the Georgia Tech campus. A user posts that they are playing a sport at a specific spot at a specific time for a specific duration and need a certain number of players. Other users nearby see the game on a map and in a list, and join it. The roster updates live. Weather for the game's start time is shown so people know if it is about to rain.

The problem it solves: courts and fields sit empty because coordination happens in scattered group chats. There is no shared, live view of what is happening right now near you.

**Target user:** Georgia Tech students, initial geographic scope is campus and immediately surrounding areas.

---

# 2. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Mobile | React Native via Expo (managed workflow) | Must run in Expo Go on both iOS and Android |
| Language | TypeScript | Strict mode on |
| Navigation | Expo Router | File-based routing |
| Auth | Firebase Authentication | Email and password |
| Database | Cloud Firestore | Direct reads from client, writes via API |
| Backend | Node.js + Express, deployed on Render free tier | Uses firebase-admin |
| Maps | react-native-maps | Google provider on Android, Apple on iOS |
| Weather | Open-Meteo | Free, no API key |
| Repo | GitHub, single repo, account `ShazebWani` | Public |

**Hard constraint:** the app must run in Expo Go with no custom native build. A course partner needs to clone the repo, run `npx expo start`, scan a QR code, and have it running on their own physical phone within minutes. Do not add any library requiring a development build in Phase 1. This specifically rules out `expo-notifications` remote push for now.

---

# 3. Repository structure

Single repository named `pickup-gt` with two top-level app folders.

```
pickup-gt/
  app/                     # Expo React Native application
    app/                   # Expo Router routes
      (auth)/
        login.tsx
        signup.tsx
      (tabs)/
        index.tsx          # Games list
        map.tsx            # Map view
        profile.tsx
      game/[id].tsx        # Game detail
      create.tsx           # Create game
      _layout.tsx
    src/
      lib/firebase.ts
      lib/api.ts           # Typed fetch wrapper for the backend
      lib/geo.ts           # Haversine distance
      lib/weather.ts
      components/
      types/index.ts       # Shared types, mirrored in server
    app.json
    package.json
  server/                  # Express REST API
    src/
      index.ts
      routes/games.ts
      middleware/auth.ts   # Verifies Firebase ID token
      services/weather.ts
      services/firestore.ts
      types/index.ts
    package.json
  docs/
    devlog.md
    setup.md
    api.md
  scripts/
    log.sh
  .github/
    ISSUE_TEMPLATE/
  README.md
  .gitignore
```

---

# 4. Data model

Three Firestore collections.

## `users/{uid}`

```ts
{
  uid: string;
  displayName: string;
  email: string;
  createdAt: Timestamp;
}
```

## `games/{gameId}`

```ts
{
  id: string;
  sport: 'basketball' | 'soccer' | 'volleyball' | 'tennis' | 'football' | 'spikeball' | 'other';
  spotName: string;              // "CRC Outdoor Courts"
  venueId: string | null;        // set if a known spot was chosen
  lat: number;
  lng: number;
  startTime: Timestamp;
  durationMinutes: number;
  capacity: number;
  hostUid: string;
  hostName: string;
  players: Array<{
    uid: string;
    displayName: string;
    joinedAt: Timestamp;
  }>;
  status: 'open' | 'full' | 'cancelled' | 'completed';
  weather: {
    tempF: number;
    precipProbability: number;   // 0-100
    conditionCode: number;
    fetchedAt: Timestamp;
  } | null;
  createdAt: Timestamp;
}
```

The roster is denormalized into the game document. This makes each list row a single read and makes the atomic join a single-document transaction.

## `events/{eventId}`

```ts
{
  uid: string;
  type: 'game_created' | 'game_joined' | 'game_left' | 'game_viewed' | 'app_opened';
  gameId: string | null;
  timestamp: Timestamp;
  metadata: Record<string, string | number> | null;
}
```

This is the activity-logging feature. Write these from the server on every mutating call, and from the client for view and open events.

## Seeded venues

Hardcode these in `app/src/lib/venues.ts` as a typed constant array. Do not put them in Firestore for Phase 1.

| Name | Lat | Lng | Sports |
|---|---|---|---|
| CRC Outdoor Basketball Courts | 33.7756 | -84.4035 | basketball |
| Burger Bowl Field | 33.7786 | -84.4046 | soccer, football, spikeball |
| Roe Stamps Field | 33.7749 | -84.4013 | soccer, football |
| CRC Tennis Courts | 33.7761 | -84.4042 | tennis |
| Peters Parking Deck Courts | 33.7739 | -84.3975 | basketball |
| Tech Green | 33.7745 | -84.3963 | spikeball, volleyball, other |

Coordinates are approximate starting values. The app must let a user drop a free pin anywhere as well.

---

# 5. API surface

**Reads** go directly from the client to Firestore using `onSnapshot` so rosters update live.

**Writes** go through the Express API on Render. Every write endpoint requires an `Authorization: Bearer <Firebase ID token>` header, verified server-side with `admin.auth().verifyIdToken()`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Liveness check, returns `{ ok: true }` |
| `POST` | `/api/games` | Create a game. Server sets hostUid from the token, fetches weather, writes event. |
| `POST` | `/api/games/:id/join` | Join. Transaction: reject if full, already joined, cancelled, or past start time. |
| `POST` | `/api/games/:id/leave` | Leave. Host cannot leave, must cancel instead. |
| `DELETE` | `/api/games/:id` | Cancel. Host only. Sets status to `cancelled`. |
| `POST` | `/api/games/:id/refresh-weather` | Re-fetch cached weather for one game. |

## Validation rules

- `capacity` between 2 and 30
- `durationMinutes` between 15 and 300
- `startTime` must be in the future and within the next 14 days
- `spotName` 1 to 60 characters
- `lat` and `lng` must be within a rough bounding box around Atlanta: lat 33.6 to 33.9, lng -84.6 to -84.2

Return proper status codes. `400` for validation, `401` for a bad or missing token, `403` for a permission problem such as a non-host cancelling, `404` for a missing game, `409` for a conflict such as a full game or a duplicate join.

## Weather

Open-Meteo forecast endpoint, hourly `temperature_2m` and `precipitation_probability`, with `temperature_unit=fahrenheit`. Pick the hour bucket nearest the game's start time. Cache it on the game document. Do not call Open-Meteo from the client.

---

# 6. Screens

## Auth
Login and signup. Signup collects display name, email, password. Display name is required because rosters show names.

## Games list (home tab)
Upcoming games, soonest first, with distance shown. A horizontal chip row filters by sport. Each row shows sport, spot name, start time as a relative string, `4/10 joined`, distance in miles, and a rain indicator when precipitation probability is over 40 percent. Pull to refresh. Empty state invites the user to create the first game.

## Map (map tab)
`react-native-maps` centered on GT campus at a tight zoom. A marker per upcoming game, color coded by sport. Tapping a marker shows a callout with the essentials and a link into detail.

## Game detail
Full roster with join timestamps, join or leave button, weather at start time, host name, a small map showing the pin, and directions handoff. If the viewer is the host the primary action is Cancel Game with a confirmation.

## Create game
Sport picker. Spot selection with two paths: tap a known venue chip, or drop a pin on a map. Start time via a date and time picker. Duration and capacity via steppers. On submit, `POST /api/games`, then navigate to the new game's detail screen.

## Profile
Display name, games hosted, games joined, sign out.

---

# 7. Non-goals for Phase 1

Do not build these. They are listed so scope stays fixed.

- Push notifications
- Chat or messaging
- Attendance confirmation or reliability stats
- Skill ratings or any form of MMR
- Recurring games
- Friends or following
- Profile photos
- Admin tooling

---

# 8. Dev log and course requirements

This project is a graded course assignment. Two pieces of tooling exist for that reason and must be built.

## `docs/devlog.md`

A running engineering log. Every entry is timestamped and includes the commit SHA at the time of writing.

## `scripts/log.sh`

A shell script that appends a devlog entry linking to the current commit.

```bash
./scripts/log.sh "Fixed Expo Go crash on Android when react-native-maps loaded before permissions resolved"
```

It should append a block like this to `docs/devlog.md`:

```markdown
### 2026-09-11 14:32 EDT
Commit: [`a1b2c3d`](https://github.com/ShazebWani/pickup-gt/commit/a1b2c3d)

Fixed Expo Go crash on Android when react-native-maps loaded before permissions resolved
```

The script must read the current SHA with `git rev-parse --short HEAD`, build the GitHub URL from the remote, and handle the case where there are no commits yet.

## GitHub Issues

Create issue templates for `bug` and `task` in `.github/ISSUE_TEMPLATE/`. Create an initial set of issues, one per task in Section 10, and label them.

## `docs/setup.md`

Written for a classmate who has never seen the repo. Clone, install, environment variables, run the app, run the server locally, and how to point the app at either local or deployed backend. Assume they are on either macOS or Windows and have a physical phone.

## `docs/api.md`

Every endpoint with request and response examples, including `curl` commands that a grader can run against the deployed Render URL.

---

# 9. Environment and secrets

Client config goes in `app/.env` read via `expo-constants`, using the `EXPO_PUBLIC_` prefix. Firebase web config keys are not secret and may be committed in an example file, but still use env vars for hygiene.

Server needs a Firebase service account. Store it as a single-line JSON string in `FIREBASE_SERVICE_ACCOUNT` on Render. Never commit it. Provide `.env.example` for both app and server.

Add a `.gitignore` before the first commit that covers `node_modules`, `.env`, `.expo`, service account JSON files, and build output.

---

# 10. Build order

Complete these in order. Stop after each and report.

1. **Repo scaffold.** Create the GitHub repo `pickup-gt` under `ShazebWani` using `gh repo create`. Initialize with `.gitignore`, `README.md`, issue templates, `docs/` placeholders, and `scripts/log.sh`. First commit.
2. **Expo app boots.** Scaffold the Expo TypeScript app with Expo Router and tab navigation. Placeholder screens. Confirm it runs in Expo Go. Commit.
3. **Firebase auth.** Wire the Firebase client, build login and signup, persist the session, gate the tabs behind auth, write the user document on signup. Commit.
4. **Express server locally.** Health endpoint, Firebase Admin init, auth middleware, `POST /api/games` with full validation. Test with `curl` using a real ID token. Commit.
5. **Deploy to Render.** Get the service live, verify `/health` from a browser, point the app at the deployed URL via env var. Commit.
6. **Games list.** Firestore live query for upcoming games, list UI, sport filter chips, relative times, roster counts. Commit.
7. **Create game.** Full form with venue chips and pin drop, calling the deployed API. Commit.
8. **Join and leave.** Transactional endpoints, buttons on detail screen, live roster updates. Commit.
9. **Location.** Request permission with `expo-location`, haversine distance in `geo.ts`, sort list by distance, handle permission denial by falling back to sorting by start time. Commit.
10. **Weather.** Open-Meteo in the server, cache on the game document, rain indicator in list and detail, refresh endpoint. Commit.
11. **Map tab.** `react-native-maps`, markers per game, callouts, campus-centered initial region. Commit.
12. **Events logging.** Write event documents from server mutations and client views. Commit.
13. **Docs.** Fill in `setup.md` and `api.md` properly. Final commit.

---

# 11. Acceptance criteria for Phase 1

- A fresh clone plus `npm install` plus `npx expo start` runs on a physical iPhone and a physical Android phone through Expo Go, with no native build step.
- A user can sign up, create a game, and see it appear on a second device in under five seconds without a manual refresh.
- Joining a full game returns `409` and the UI shows a clear message.
- The Render URL responds to `/health` in a browser.
- `docs/setup.md` is sufficient for a classmate to get running without asking questions.
- `./scripts/log.sh "message"` appends a correctly linked entry.
- The repo has real issues, real labels, and a commit history with descriptive messages rather than a single bulk commit.

---

# 12. Phase 2 and Phase 3 (do not build yet)

**Phase 2, attendance and reliability.** A scheduled job flips games to `completed` 30 minutes after end time. The host confirms who showed up via a toggle list. An `attendance/{gameId}_{uid}` collection records it, and `gamesPlayed`, `gamesNoShow`, and `reliabilityPct` are denormalized onto the user document. Reliability shows as a badge next to names in rosters. Attendance only, no skill ratings, no negative peer feedback.

**Phase 3, push notifications.** Requires an EAS development build, so it breaks the Expo Go constraint. Only start after the partner repository exchange is complete. Notify on join, on game filling, and 30 minutes before start.

---

# 13. Style and code standards

- TypeScript strict mode, no `any`
- Shared types duplicated between `app/src/types` and `server/src/types`, kept in sync manually and noted in the README
- Descriptive commit messages in imperative mood
- No secrets in the repo at any point in history
- Server validation is authoritative, client validation is only for user experience
- Handle Render free tier cold starts in the client with a loading state and a timeout longer than 60 seconds on the first request
