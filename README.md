# Pickup GT

A mobile app for organizing pickup sports around Georgia Tech campus. Post that you're playing basketball, soccer, tennis, or whatever at a specific spot and time, and other students nearby can see it on a map or in a list and join. Rosters update live, and each game shows the weather forecast for its start time so people know if it's about to rain.

Courts and fields near campus sit empty because coordination happens in scattered group chats — Pickup GT gives everyone a shared, live view of what's happening right now nearby.

**Status:** Phase 1 (MVP) — auth, game creation, live rosters, map, weather, distance sorting. See `Pickup-GT-PRD.md` for the full spec and `docs/devlog.md` for build history.

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
