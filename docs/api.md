# API reference

Base URL: set `BASE_URL` to either your local server (`http://localhost:3000`) or the deployed Render URL. The deployed backend for this project is live at:

```bash
export BASE_URL="https://pickup-gt-api.onrender.com"
```

Every example below has been run against this exact deployed URL, including a full authenticated create → cancel → reject cycle (see `docs/DEBUGGING.md` and `docs/SUBMISSION.md`) — not just against localhost.

All write endpoints require `Authorization: Bearer <Firebase ID token>`. To get a token for `curl` testing, call the Firebase Auth REST API with a test account's email/password and your Firebase Web API key:

```bash
export FIREBASE_API_KEY="<web apiKey from Firebase console>"

curl -s "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$FIREBASE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123","returnSecureToken":true}' \
  | tee /tmp/signin.json | grep -o '"idToken": *"[^"]*"'

export ID_TOKEN=$(node -e "console.log(require('/tmp/signin.json').idToken)")
```

---

## `GET /health`

Liveness check. No auth required.

```bash
curl -s "$BASE_URL/health"
```

Response `200`:
```json
{ "ok": true }
```

---

## `POST /api/games`

Creates a game. `hostUid` is taken from the token, not the body. Server fetches and caches weather for `startTime`.

```bash
curl -s -X POST "$BASE_URL/api/games" \
  -H "Authorization: Bearer $ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sport": "basketball",
    "spotName": "CRC Outdoor Basketball Courts",
    "venueId": "crc-outdoor-basketball",
    "lat": 33.7756,
    "lng": -84.4035,
    "startTime": "2026-09-15T18:00:00.000Z",
    "durationMinutes": 60,
    "capacity": 10
  }'
```

Response `201`:
```json
{ "id": "abc123" }
```

Validation (`400`):
- `capacity` must be 2-30
- `durationMinutes` must be 15-300
- `startTime` must be in the future and within 14 days
- `spotName` must be 1-60 characters
- `lat` must be 33.6-33.9, `lng` must be -84.6 to -84.2

---

## `POST /api/games/:id/join`

Atomically adds the caller to the roster.

```bash
curl -s -X POST "$BASE_URL/api/games/abc123/join" \
  -H "Authorization: Bearer $ID_TOKEN"
```

Response `200`:
```json
{ "ok": true }
```

Errors:
- `404` game not found
- `409` game is cancelled, already started, already joined, or full

---

## `POST /api/games/:id/leave`

Removes the caller from the roster. The host cannot leave (must cancel instead).

```bash
curl -s -X POST "$BASE_URL/api/games/abc123/leave" \
  -H "Authorization: Bearer $ID_TOKEN"
```

Response `200`:
```json
{ "ok": true }
```

Errors:
- `403` caller is the host
- `404` game not found
- `409` caller is not in the game

---

## `DELETE /api/games/:id`

Cancels a game. Host only.

```bash
curl -s -X DELETE "$BASE_URL/api/games/abc123" \
  -H "Authorization: Bearer $ID_TOKEN"
```

Response `200`:
```json
{ "ok": true }
```

Errors:
- `403` caller is not the host
- `404` game not found

---

## `POST /api/games/:id/refresh-weather`

Re-fetches and caches weather for a game's start time.

```bash
curl -s -X POST "$BASE_URL/api/games/abc123/refresh-weather" \
  -H "Authorization: Bearer $ID_TOKEN"
```

Response `200`:
```json
{ "ok": true }
```

Errors:
- `404` game not found
- `502` Open-Meteo could not be reached
