# Sprint 4 court label A/B test

Sprint 3 testers misread "Current status unknown" as "closed" and nobody
reported a court without being asked. Sprint 4 tests new court card wording
against the Sprint 3 card.

## Variants

- **A (control):** the Sprint 3 card, unchanged.
- **B (test):** plain-language states with the report age first.
  - Fresh: "Available for play, 12 min ago", "Seen by a player at the court",
    and a note that courts can fill up and this is not a reservation.
  - Stale (30 min or older) or refresh failed: "No recent information",
    "Last seen: available for play, 37 min ago. It may have changed.", and an
    **Update court status** button.
  - No reports: "No recent information", "Nobody has reported a court here
    today.", and a **Be the first to report** button.

Both variants use the same report form (court, what you saw, when you
observed it) and the same 30 minute cutoff, so differences come from the card.

## Assignment and override

`GET /api/me/variant` returns A or B from an FNV-1a hash of the uid, so a
player always sees the same card. The app uses the same hash if the API is
unreachable. Profile > Testing lets a moderator force A or B on their phone.

## Session screens

Profile > Testing > Session screens shows fixed court data on CRC Main Gym
game pages, so every participant sees the same states:

- **Fresh + stale courts:** Court 1 last reported available 37 min ago (stale),
  Court 2 available 12 min ago (fresh).
- **No reports:** the empty gym.

Reports submitted in session mode are saved with `source: session` and logged,
but never change the live court status. Set it back to **Live data** after
the session.

## Data

- Client events (allowed by `firestore.rules`):
  - `court_card_viewed`: `variant`, `context` (live or session), `state`
    (fresh, stale, none), `courtLabel`. Logged once per court state per screen.
  - `court_update_tapped`: `variant`, `context`, `trigger` (cta = B's card
    button, row = "Update this court", menu = "Report what you saw"), `state`.
- `court_reported` event metadata and `courtReports` docs now include
  `variant`, `trigger`, and `context` / `source`. Sprint 3 builds that omit
  these fields still work.

Export (from `server/`):

```sh
npm run export:s4 -- --since=2026-11-09 --exclude=<team uids used for setup>
```

It writes `events.csv` and `court_reports.csv` with the A/B fields as columns
(import into the raw data Sheet) and prints counts by variant.

## Deploy and checks

1. Deploy rules so clients can log the two new events:
   `firebase deploy --only firestore:rules`
2. Deploy the server (Render) so `/api/me/variant` and the new report fields exist.
3. Checks: `npm --prefix server run test:experiment` (no emulator), then the
   emulator suite in `docs/COURT_REPORTS.md`, which now includes Sprint 4 tests.
