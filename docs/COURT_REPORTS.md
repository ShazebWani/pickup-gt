# Sprint 3 court reports

Local implementation on top of Shazeb's tracking/check-in work and Shubh's
newcomer feature. Nothing in this document represents participant results.

## Scope and venue

Create a game at **CRC Main Gym (4th floor)**, then open its detail page.
The court panel shows observations for that venue across all its games.
Any signed-in player can report a court, even without an RSVP.

The official CRC locations page describes six multipurpose courts in the
fourth-floor main gym: https://crc.gatech.edu/locations/
The existing `crc-outdoor-basketball` entry was not treated as verified indoor
court data. Old games keep their original venue ID. Use `crc-main-gym` for
new indoor pilot games; existing games are not automatically migrated.
The map pin is the existing approximate CRC location, not a particular court.

Players enter the posted court number or an unambiguous landmark, or use
**Update this court** on an existing report. Confirm labels on site and use
the same labels throughout the pilot. No official numbering or map of six
individual courts is assumed. Case and repeated whitespace are normalized;
different descriptions of the same court are not automatically reconciled.

## Behavior

- Status: available for play, in use, reserved/other activity, or closed.
- Observation age: just now, 5, 15, 30, 60 or 120 minutes ago in the UI.
  The API accepts whole minutes from 0 to 120, derives timestamps from its
  clock, and takes reporter identity only from the Firebase token.
- Freshness: **30 minutes**, a provisional pilot choice, not an empirically
  established guarantee. Confirm or revise it after CRC observations.
- A stale observation is kept as history with **Current status unknown**.
  No reports, failed reads, and stale data must never imply an empty court.
- Poll while the page is active, refresh on focus/foreground, or tap Refresh.
  Refresh failure labels retained observations unverified. A successful
  save followed by a failed refresh remains a successful save.
- If an older observation is submitted later, it is saved to history but
  does not replace a newer observation of the same court.
- Joined and hosted games remain in the list while in progress, so participants
  can return to check in and report courts after the scheduled start. New joins
  are still restricted to before the start. Ended/cancelled games disappear.
- Indoor CRC game creation skips outdoor weather lookup.
- Starting a new report resets status and observation age; failed saves preserve
  the form for retry.
- No Waitz scraping, Campus Rec feed, reservation, GPS verification, or
  automatic claim that a player physically attended.

## API and storage

Both routes require a Firebase bearer token:

```
GET  /api/venues/crc-main-gym/courts
POST /api/venues/crc-main-gym/courts/reports
```

POST body:

```json
{"courtLabel":"Court 2","status":"available","observedMinutesAgo":5}
```

The write transaction saves an immutable `courtReports` document, updates
`courtStatuses` if the observation is newer, and records `court_reported` in
`events`. Reports contain `courtId`, `venueId`, `courtLabel`, `status`, `uid`,
`observedAt`, `submittedAt`, and `source: player`. Reads omit reporter IDs.
The API computes age and staleness on every read. No composite index needed.

Shazeb's existing `npm run export` reads `courtReports` with these fields
without changes. `participantsWithCourtReport` counts any report, **not an
unprompted report**. Record prompting in the team's observation sheet.
Also time installation separately: signup-to-join logs cannot measure the
time before signup. Compare check-ins with actual arrival observations.

## Local checks

Requirements: installed app/server dependencies, Node 22+, Java 21+, Firebase CLI.
The final emulator run used Node 22.23.2 and Firebase CLI 15.34.1.
From the repo root (only the demo project is used):

```sh
npm --prefix server run build
cd app
npx tsc --noEmit
cd ..
npx --yes firebase-tools@15.34.1 emulators:exec --project demo-pickup-gt --config firebase.local.json --only auth,firestore 'npm --prefix server run test:courts'
```

The suite tests real local Firebase Auth tokens and Firestore transactions,
including a second user, invalid inputs, spoofed identity, freshness boundary,
older/concurrent observations, all statuses, security rules, and CSV export.
It also exercises newcomer game creation, joining, check-in, court submission,
combined export, leaving/cancellation, and ongoing-game visibility.
It refuses to run against a real Firebase project. Emulator data is synthetic.

Native bundle check (no simulator required):

```sh
cd app
EXPO_NO_TELEMETRY=1 CI=1 npx expo export --platform ios --platform android --output-dir /tmp/pickup-gt-native-build
```

## Before the team pilot

### Local validation completed October 24, 2026

- Server TypeScript build and app type-check passed.
- All 12 Auth/Firestore emulator integration tests passed, including the
  updated rule rejecting forged `court_reported` events while preserving
  the three supported client event types.
- Full Expo SDK 58 iOS and Android JavaScript/Hermes bundles exported successfully.
  This is a compilation check, not a native device runtime test.
- The actual `CourtStatusCard`, `CourtStatusPanel`, and API client were rendered
  with React Native Web in a temporary harness connected to the local API and
  emulators. Separate authenticated browser sessions verified cross-user reads,
  stale history, failed-read unknown state, failed-save retry, form reset,
  polling recovery, and refresh after remount.
  The harness supplies local auth/configuration and a mount-based focus hook;
  it does not run the full Expo navigation app or native foreground lifecycle.
  Connection failures were simulated. An earlier panel test also checked the
  empty initial state.
- No simulator is installed here. Physical phone layout, live Firebase
  configuration, native foreground refresh, and deployment remain unverified.
- Base commit: `02d3ad9344a44be4d35375e07a9bf02fcebb8e62`; remote main was
  rechecked after integration and still matched this base. This includes
  Shazeb's SDK 58/check-in/navigation changes and Sanshubh's newcomer fields.
- Notebook Sprint 3 revision 1015 was reviewed: the code follows the documented
  check-in flow and newcomer scope. Participant evidence and real CRC observations
  remain separate work; these synthetic tests are not participant results.

After code review/approval, deploy the updated backend and Firestore rules,
and run the updated Expo app with the team's authorized Firebase configuration.
Use two phones/accounts: create an indoor CRC game, submit on one, refresh the
other, and verify the same court/status/time. Try an older observation, a stale
one, an offline read and a failed save. Confirm native keyboard/scroll behavior
and the actual posted court labels. Check CSV export using tester IDs and exclude
team accounts. Live deployment and phone testing are separate from local tests.
