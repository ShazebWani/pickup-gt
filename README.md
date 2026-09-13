# Pickup GT

Pickup GT is a mobile app (React Native + Expo, running on physical iOS/Android phones via Expo Go) for organizing pickup sports around Georgia Tech campus: post that you're playing basketball, soccer, tennis, or whatever at a specific spot and time, and other students nearby see it live on a map and in a list and can join — rosters update in real time across every device, and each game shows the weather forecast for its start time so people know if it's about to rain. It exists because court/field coordination at GT currently happens in scattered group chats with no shared, live view of what's actually happening nearby right now.

**Live backend:** https://pickup-gt-api.onrender.com ([`/health`](https://pickup-gt-api.onrender.com/health))

**Status:** Phase 1 (MVP) — auth, game creation, live rosters, map, weather, distance sorting. See `Pickup-GT-PRD.md` for the full spec and `docs/devlog.md` for build history.

## Course assignment docs

| Doc | What's in it |
|---|---|
| [`docs/SUBMISSION.md`](docs/SUBMISSION.md) | Project description, requirement-by-requirement mapping, exceptional features, screenshot checklist |
| [`docs/REFERENCES.md`](docs/REFERENCES.md) | Annotated reference list, including the mandatory AI-assistance disclosure |
| [`docs/DEBUGGING.md`](docs/DEBUGGING.md) | What went wrong and how it got resolved (or didn't) |
| [`docs/GIT_NARRATIVE.md`](docs/GIT_NARRATIVE.md) | Commit history summary and the partner-coordination narrative |
| [`docs/PARTNER_SETUP.md`](docs/PARTNER_SETUP.md) | Setup guide for a classmate checking out this repo, plus their assigned task |
| [`docs/setup.md`](docs/setup.md) | Full environment setup (Firebase project, env vars, running on a phone) |
| [`docs/api.md`](docs/api.md) | Every API endpoint with `curl` examples |
| [`docs/devlog.md`](docs/devlog.md) | Running engineering log |

## Tech stack

- **App:** React Native + Expo (Expo Router), runs in Expo Go, no custom native build
- **Server:** Node.js + Express, deployed on Render
- **Database:** Cloud Firestore (live reads from the client, writes go through the API)
- **Auth:** Firebase Authentication (email/password)
- **Maps:** react-native-maps
- **Weather:** Open-Meteo

## Project structure

```
pickup-gt/
  app/       Expo React Native app
  server/    Express REST API
  docs/      Setup guide, API reference, dev log
  scripts/   log.sh — appends dev log entries
```

## Quick start

Full walkthrough (Firebase project setup, env vars, running on a physical phone) is in **[`docs/setup.md`](docs/setup.md)**. Short version, once `.env` files are filled in:

```bash
# Terminal 1: the API server
cd server
npm install
npm run dev          # http://localhost:3000

# Terminal 2: the mobile app
cd app
npm install
npx expo start       # scan the QR code with Expo Go on your phone
```

## API

See **[`docs/api.md`](docs/api.md)** for every endpoint with `curl` examples.

## Contributing / dev log

Log engineering notes with:

```bash
./scripts/log.sh "Fixed Expo Go crash on Android when react-native-maps loaded before permissions resolved"
```

This appends a timestamped, commit-linked entry to `docs/devlog.md`.
