# Partner setup guide

Welcome — you've never seen this repo before, and that's exactly who this doc is for. It assumes you're on **macOS or Windows** and have a **physical iPhone or Android phone** (not a simulator/emulator — the underlying course assignment specifically requires a physical device).

This is Pickup GT: a mobile app for organizing pickup sports games around Georgia Tech campus. React Native (Expo) app, Node/Express backend, Firebase for auth and data.

---

## 1. Prerequisites

| Tool | Version | Check it |
|---|---|---|
| Node.js | 20 or later | `node -v` |
| npm | comes with Node | `npm -v` |
| git | any recent version | `git -v` |
| Expo Go app | latest | install from the App Store (iOS) or Play Store (Android) on your **phone** |

Your phone and computer need to be on the **same Wi-Fi network** for the default setup to work.

If `node -v` shows something below `v20`, install a current LTS from https://nodejs.org before continuing.

---

## 2. Clone and install

```bash
git clone https://github.com/ShazebWani/pickup-gt.git
cd pickup-gt

cd app && npm install
cd ../server && npm install
```

Two separate npm projects — `app/` (the Expo app) and `server/` (the Express API) — each with their own `package.json` and `node_modules`.

---

## 3. Environment variables

Each of `app/` and `server/` has a `.env.example` — copy each to `.env` in the same folder:

```bash
cd app && cp .env.example .env
cd ../server && cp .env.example .env
```

**What you need sent to you privately** (I'll send these directly — never commit them, and they're already gitignored):
- The six `EXPO_PUBLIC_FIREBASE_*` values for `app/.env` (Firebase web app config — not secret in the sense of being encrypted, but scoped to a shared project, so I'll send them rather than you creating your own Firebase project).
- The `FIREBASE_SERVICE_ACCOUNT` value for `server/.env` (this one **is** sensitive — a service account key with admin access to the Firestore database. Treat it like a password.)

**What has a safe default / you don't need to touch:**
- `app/.env`'s `EXPO_PUBLIC_API_BASE_URL` — see step 5 below, you'll likely point this at my deployed backend rather than running `server/` yourself.
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` — optional. Only needed if the Android map tab looks watermarked; leave blank otherwise.

**`.env.example` walkthrough** (what each file documents):
- `app/.env.example` lists the Firebase web config keys, `EXPO_PUBLIC_API_BASE_URL` (with example values for both a local LAN server and a deployed Render URL), and the optional Google Maps key.
- `server/.env.example` documents the single `FIREBASE_SERVICE_ACCOUNT` variable and the expected format (the entire service-account JSON file's contents, minified to one line — not a file path).

---

## 4. Run the app against my deployed backend (recommended — start here)

You do **not** need to run `server/` locally. Point the app at my deployed Render URL:

```
# in app/.env
EXPO_PUBLIC_API_BASE_URL=https://pickup-gt-api.onrender.com
```

**Heads up:** Render's free tier spins the server down after inactivity. The **first** request after it's been idle can take up to ~60 seconds while it spins back up — the app has a timeout built in to accommodate this (`app/src/lib/api.ts`), so if a game-creation request seems to hang, give it a minute before assuming something's broken.

Then:

```bash
cd app
npx expo start
```

Scan the QR code:
- **iOS:** open the Camera app and point it at the terminal's QR code.
- **Android:** open Expo Go and use its built-in scanner.

The app should load with no native build step. Sign up with a display name, email, and password.

---

## 5. (Optional) Run the server locally instead

Only needed if you're changing server code, or the deployed backend isn't reachable. See the main [`docs/setup.md`](setup.md) §5–6 for the full local-server walkthrough — short version:

```bash
cd server
npm run dev        # http://localhost:3000
```

Then in `app/.env`, point `EXPO_PUBLIC_API_BASE_URL` at your computer's LAN IP (not `localhost` — your phone isn't your computer):

```bash
# macOS
ipconfig getifaddr en0
# Windows (PowerShell)
ipconfig   # look for "IPv4 Address"
```

```
EXPO_PUBLIC_API_BASE_URL=http://<your-lan-ip>:3000
```

---

## 6. Verify your setup works — checklist

Before you change anything, confirm all of this:

- [ ] `npx expo start` in `app/` runs with no red error screen.
- [ ] The QR code scans and the app opens on your physical phone via Expo Go.
- [ ] You can sign up a new account (display name + email + password) and land on the Games tab.
- [ ] The Games tab shows either existing games or the "No games yet" empty state — not a blank white screen or a crash.
- [ ] The Map tab renders an actual map (not a blank gray box) centered on GT campus.
- [ ] You can tap the **+** button, fill out the create-game form, and successfully create a game — it should navigate you to that game's detail screen afterward.
- [ ] That new game appears back on the Games tab and the Map tab.
- [ ] The Profile tab shows your display name and lets you sign out.

If any of these fail, check the Troubleshooting section below before assuming it's your code change.

---

## 7. Branching and PR convention

1. Create a branch off `main`: `git checkout -b partner/<short-description>` (e.g. `partner/force-light-mode`).
2. Make your change, commit with a descriptive, imperative-mood message (see existing commits in `git log` for the style — e.g. "Force light mode regardless of system appearance setting").
3. Push your branch and open a PR against `main` on GitHub. Reference the issue it closes (issue [#14](https://github.com/ShazebWani/pickup-gt/issues/14)) in the PR description, e.g. `Closes #14`.
4. Don't merge your own PR — that's the point of the exchange. I'll review and merge it (and you'll do the same for my change on your repo).

---

## 8. Troubleshooting

- **"Network request failed" when creating a game.** Your phone and computer probably aren't on the same Wi-Fi, or a firewall is blocking the port, if you're pointed at a local server. Switch to the deployed Render URL instead (step 4).
- **First request after idle is very slow, or seems to hang.** Expected — see the Render cold-start note in step 4. Wait up to a minute.
- **Android map looks watermarked, grayed out, or won't load.** You need your own Google Maps API key — see `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` in `app/.env.example`. iOS doesn't need this (it uses Apple Maps by default).
- **`expo start` shows a QR code but your phone can't connect / times out scanning.** Try tunnel mode, which routes through Expo's servers instead of your local network (slower, but works across different networks, VPNs, or campus Wi-Fi with client isolation):
  ```bash
  npx expo start --tunnel
  ```
- **Server won't boot locally, something about JSON parsing `FIREBASE_SERVICE_ACCOUNT`.** This exact failure happened once already during development — see `docs/DEBUGGING.md` #1. Make sure the value in `server/.env` is the *output* of the `node -e "console.log(JSON.stringify(require('/path/to/key.json')))"` command from `docs/setup.md` §4, not the command text itself.

---

## Your task

**Force the app into light mode, regardless of the phone's system appearance setting.**

Right now the app follows whatever light/dark mode your phone's system settings are in — nothing in the app currently overrides it. Your job: make it always render light, even if the phone is set to Dark Mode.

**Files you'll likely need to touch:**
- `app/app.config.js` — currently has `userInterfaceStyle: 'automatic'`.
- `app/app/_layout.tsx` — the root layout. `expo-status-bar` is already installed as a dependency but nothing in the app currently renders a `<StatusBar />` component from it, so the status bar icon color also isn't currently being forced.

**Acceptance criteria:**
- With your phone's system appearance set to **Dark**, every screen in the app (auth, tabs, create, game detail) still renders with its normal light backgrounds and cards, and the status bar's icons/text stay legible (dark) against the app's light header.
- You shouldn't need to touch any individual screen's `StyleSheet` — this should be a small, top-level config change, not a per-screen patch.

Full context and the original issue: [#14](https://github.com/ShazebWani/pickup-gt/issues/14).

**When you're done:** log what you did in `docs/devlog.md` using the repo's own logging script, from inside your checkout:

```bash
./scripts/log.sh "Forced light mode: <describe what you actually changed and anything that tripped you up>"
```

**One more thing:** this is a shared exercise — you'll need your own evidence for your own submission too (screenshots of the before/after, your own copy of the debugging/partner-narrative docs, etc.). Don't rely on this repo's docs to cover what you need for your assignment; capture your own as you go.
