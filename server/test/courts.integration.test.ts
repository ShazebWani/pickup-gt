import assert from 'node:assert/strict';
import { after, before, test, mock } from 'node:test';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'node:http';
import { Timestamp } from 'firebase-admin/firestore';
import { visibleGames } from '../../app/src/lib/visibleGames';

// Refuse to run against a real project or non-local emulator.
assert.equal(process.env.GCLOUD_PROJECT, 'demo-pickup-gt');
assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? '', /^(127\.0\.0\.1|localhost):\d+$/);
assert.match(process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '', /^(127\.0\.0\.1|localhost):\d+$/);

let server: Server;
let base: string;
let tokenA: string;
let tokenB: string;
let uidA: string;
let uidB: string;
let db: typeof import('../src/services/firestore').db;
let save: typeof import('../src/services/courtReports').saveCourtReport;
let read: typeof import('../src/services/courtReports').readCourtStatuses;
const endpoint = '/api/venues/crc-main-gym/courts';
const suffix = Date.now();

async function signup(label: string) {
  const response = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=local-test`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `${label}-${suffix}@example.test`, password: 'test-only-password', returnSecureToken: true }),
  });
  assert.equal(response.status, 200);
  return response.json() as Promise<{ idToken: string; localId: string }>;
}
async function api(path: string, token?: string, body?: unknown, method?: string) {
  const response = await fetch(base + path, {
    method: method ?? (body === undefined ? 'GET' : 'POST'),
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json(), headers: response.headers };
}

before(async () => {
  const { app } = await import('../src/app');
  const firestore = await import('../src/services/firestore');
  const courts = await import('../src/services/courtReports');
  db = firestore.db; save = courts.saveCourtReport; read = courts.readCourtStatuses;
  const a = await signup('reporter'); const b = await signup('reader');
  tokenA = a.idToken; uidA = a.localId; tokenB = b.idToken; uidB = b.localId;
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
after(async () => {
  await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
  await db.terminate();
});

test('reads and writes require a valid Firebase identity; unsupported venues are rejected', async () => {
  assert.equal((await api(endpoint)).status, 401);
  assert.equal((await api(endpoint, 'invalid')).status, 401);
  assert.equal((await api(endpoint + '/reports', undefined, {})).status, 401);
  assert.equal((await api('/api/venues/crc-outdoor-basketball/courts', tokenA)).status, 404);
  assert.equal((await api('/api/venues/crc-outdoor-basketball/courts/reports', tokenA, {})).status, 404);
});

test('new venue has no fabricated status; responses cannot be cached', async () => {
  const result = await api(endpoint, tokenA);
  assert.equal(result.status, 200);
  assert.deepEqual(result.body.courts, []);
  assert.equal(result.headers.get('cache-control'), 'no-store');
});

test('rejects invalid statuses, names, observation ages and malformed bodies without writing', async () => {
  const valid = { courtLabel: 'Court 2', status: 'available', observedMinutesAgo: 0 };
  const invalid = [null, [], {}, { ...valid, courtLabel: '' }, { ...valid, courtLabel: ' '.repeat(4) },
    { ...valid, courtLabel: 'x'.repeat(41) }, { ...valid, courtLabel: 'Court\u00002' },
    { ...valid, status: 'empty' }, { ...valid, observedMinutesAgo: -1 },
    { ...valid, observedMinutesAgo: 121 }, { ...valid, observedMinutesAgo: 1.5 },
    { ...valid, observedMinutesAgo: '5' }, { ...valid, observedMinutesAgo: null }];
  for (const body of invalid) assert.equal((await api(endpoint + '/reports', tokenA, body)).status, 400, JSON.stringify(body));
  assert.equal((await db.collection('courtReports').get()).size, 0);
});

test('save persists history and an event atomically; another user sees it without reporter identity', async () => {
  const response = await api(endpoint + '/reports', tokenA, {
    courtLabel: ' Court   2 ', status: 'available', observedMinutesAgo: 5,
    uid: uidB, observedAt: '2100-01-01', venueId: 'wrong',
  });
  assert.equal(response.status, 201);
  const report = (await db.collection('courtReports').doc(response.body.id).get()).data()!;
  assert.equal(report.uid, uidA);
  assert.equal(report.courtLabel, 'Court 2');
  assert.equal(report.venueId, 'crc-main-gym');
  assert.equal(report.submittedAt.toMillis() - report.observedAt.toMillis(), 300_000);
  const events = await db.collection('events').where('type', '==', 'court_reported').get();
  assert.equal(events.size, 1);
  assert.equal(events.docs[0].data().metadata.reportId, response.body.id);
  const result = await api(endpoint, tokenB);
  assert.equal(result.body.courts[0].status, 'available');
  assert.equal(result.body.courts[0].stale, false);
  assert.equal(result.body.courts[0].uid, undefined);
  assert.equal(result.body.courts[0].reporter, undefined);
});

test('older observations cannot overwrite newer ones, including normalized court labels', async () => {
  await api(endpoint + '/reports', tokenB, { courtLabel: 'court 2', status: 'closed', observedMinutesAgo: 60 });
  let result = await api(endpoint, tokenA);
  assert.equal(result.body.courts.length, 1);
  assert.equal(result.body.courts[0].status, 'available');
  await api(endpoint + '/reports', tokenB, { courtLabel: 'Court 2', status: 'busy', observedMinutesAgo: 0 });
  result = await api(endpoint, tokenA);
  assert.equal(result.body.courts[0].status, 'busy');
  assert.equal((await db.collection('courtReports').get()).size, 3);
});

test('stale threshold is exact and recomputed without a new submission', async () => {
  const now = Date.now();
  await save(db, uidA, { courtLabel: 'Boundary court', status: 'available', observedMinutesAgo: 0 }, now);
  const before = (await read(db, now + 30 * 60_000 - 1)).courts.find(c => c.courtLabel === 'Boundary court')!;
  const after = (await read(db, now + 30 * 60_000)).courts.find(c => c.courtLabel === 'Boundary court')!;
  assert.equal(before.stale, false);
  assert.equal(after.stale, true);
  assert.equal(after.status, 'available'); // preserved history, rendered as unknown by UI
});

test('concurrent submissions preserve history and the newest observation', async () => {
  await Promise.all([0, 15, 60].map((age) => save(db, uidA,
    { courtLabel: 'Concurrent court', status: age === 0 ? 'busy' : 'closed', observedMinutesAgo: age })));
  assert.equal((await read(db)).courts.find(c => c.courtLabel === 'Concurrent court')!.status, 'busy');
  assert.equal((await db.collection('courtReports').where('courtLabel', '==', 'Concurrent court').get()).size, 3);
});

test('all four statuses round-trip; separate courts stay independent', async () => {
  for (const status of ['available', 'busy', 'reserved', 'closed']) {
    assert.equal((await api(endpoint + '/reports', tokenA, { courtLabel: `${status} court`, status, observedMinutesAgo: 0 })).status, 201);
  }
  const courts = (await api(endpoint, tokenB)).body.courts;
  for (const status of ['available', 'busy', 'reserved', 'closed']) {
    assert.equal(courts.find((c: { courtLabel: string }) => c.courtLabel === `${status} court`).status, status);
  }
});

test('Firestore rules prevent clients from bypassing the API or reading report identities', async () => {
  const root = `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/demo-pickup-gt/databases/(default)/documents`;
  for (const collection of ['courtReports', 'courtStatuses']) {
    const write = await fetch(`${root}/${collection}/injected`, { method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: {} }) });
    assert.equal(write.status, 403);
    const read = await fetch(`${root}/${collection}`, { headers: { Authorization: `Bearer ${tokenB}` } });
    assert.equal(read.status, 403);
  }
  const event = (type: string) => fetch(`${root}/events`, { method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { uid: { stringValue: uidA }, type: { stringValue: type } } }) });
  assert.equal((await event('court_reported')).status, 403);
  for (const type of ['game_viewed', 'app_opened', 'signed_up']) assert.equal((await event(type)).status, 200);
});

test('Shazeb’s existing export includes reports and excludes the specified team account', async () => {
  const out = await mkdtemp(join(tmpdir(), 'pickup-court-export-'));
  try {
    const child = spawn(process.execPath, ['--import', 'tsx', 'src/scripts/export-sprint3.ts',
      '--since=2026-01-01', `--exclude=${uidB}`, `--out=${out}`], { env: process.env, cwd: join(__dirname, '..') });
    let output = ''; child.stdout.on('data', b => output += b); child.stderr.on('data', b => output += b);
    const [code] = await once(child, 'close');
    assert.equal(code, 0, output);
    const csv = await readFile(join(out, 'court_reports.csv'), 'utf8');
    assert.ok(csv.includes('observedAt') && csv.includes('submittedAt') && csv.includes('courtId'));
    assert.ok(csv.includes(uidA)); assert.ok(!csv.includes(uidB));
    const summary = JSON.parse(await readFile(join(out, 'summary.json'), 'utf8'));
    assert.equal(summary.participantsWithCourtReport, 1);
    const events = await readFile(join(out, 'events.csv'), 'utf8');
    assert.ok(events.includes('court_reported'));
  } finally { await rm(out, { recursive: true, force: true }); }
});

test('newcomer game → RSVP → check-in → court report → export works together', async () => {
  const host = await signup('host-integration');
  const guest = await signup('guest-integration');
  await db.collection('users').doc(host.localId).set({ displayName: 'Test host' });
  await db.collection('users').doc(guest.localId).set({ displayName: 'Test newcomer' });
  // Make the integration test deterministic and prohibit real weather calls.
  const originalFetch = globalThis.fetch;
  let weatherCalls = 0;
  const fetchMock = mock.method(globalThis, 'fetch', async (input, init) => {
    if (String(input).includes('api.open-meteo.com')) { weatherCalls++; throw new Error('External weather must not be called for indoor games'); }
    return originalFetch(input, init);
  });
  const out = await mkdtemp(join(tmpdir(), 'pickup-combined-export-'));
  try {
    const payload = {
      sport: 'basketball', spotName: 'CRC Main Gym (4th floor)', venueId: 'crc-main-gym',
      lat: 33.7756, lng: -84.4035, startTime: new Date(Date.now() + 10 * 60_000).toISOString(),
      durationMinutes: 60, capacity: 10, pace: 'casual', newcomersWelcome: true,
      joinInstructions: 'Court 2. Ask for the host.',
    };
    const created = await api('/api/games', host.idToken, payload);
    assert.equal(created.status, 201);
    assert.equal(weatherCalls, 0);
    const gameId = created.body.id;
    const gamePath = `/api/games/${gameId}`;
    const gameRef = db.collection('games').doc(gameId);
    const stored = (await gameRef.get()).data()!;
    for (const field of ['pace', 'newcomersWelcome', 'joinInstructions', 'venueId']) {
      assert.equal(stored[field], payload[field as keyof typeof payload]);
    }
    assert.equal(stored.weather, null);
    // The app reads games directly through the Firebase client rules.
    const restRoot = `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/demo-pickup-gt/databases/(default)/documents`;
    const clientRead = await fetch(`${restRoot}/games/${gameId}`, { headers: { Authorization: `Bearer ${guest.idToken}` } });
    assert.equal(clientRead.status, 200);
    assert.equal((await clientRead.json() as any).fields.pace.stringValue, 'casual');
    assert.equal((await api(gamePath + '/checkin', guest.idToken, {})).status, 409);
    assert.equal((await api(gamePath + '/join', guest.idToken, {})).status, 200);
    assert.equal((await api(gamePath + '/join', guest.idToken, {})).status, 409);
    assert.equal((await api(gamePath + '/checkin', guest.idToken, {})).status, 200);
    assert.equal((await api(gamePath + '/checkin', guest.idToken, {})).status, 409);
    // Move only this synthetic fixture into the active window; new joins stay forbidden.
    await gameRef.update({ startTime: Timestamp.fromMillis(Date.now() - 60_000) });
    assert.equal((await api(gamePath + '/join', tokenA, {})).status, 409);
    assert.equal((await api(endpoint + '/reports', guest.idToken, {
      courtLabel: 'Integration Court', status: 'busy', observedMinutesAgo: 0,
    })).status, 201);
    assert.equal((await api(endpoint, host.idToken)).body.courts.find((c: any) => c.courtLabel === 'Integration Court').status, 'busy');
    const current = (await gameRef.get()).data()!;
    assert.equal(current.players[0].uid, guest.localId);
    assert.ok(current.players[0].arrivedAt);
    assert.equal(visibleGames([current as any], guest.localId, Date.now()).length, 1);
    assert.equal(visibleGames([current as any], host.localId, Date.now()).length, 1);
    assert.equal(visibleGames([current as any], uidA, Date.now()).length, 0);

    const child = spawn(process.execPath, ['--import', 'tsx', 'src/scripts/export-sprint3.ts',
      '--since=2026-01-01', `--exclude=${uidA},${uidB},${host.localId}`, `--out=${out}`], { env: process.env, cwd: join(__dirname, '..') });
    let output = ''; child.stdout.on('data', b => output += b); child.stderr.on('data', b => output += b);
    const [code] = await once(child, 'close'); assert.equal(code, 0, output);
    const summary = JSON.parse(await readFile(join(out, 'summary.json'), 'utf8'));
    assert.equal(summary.participants, 1);
    assert.equal(summary.joinedAGame, 1);
    assert.equal(summary.rsvpsCheckedIn, 1);
    assert.equal(summary.rsvpToArrivalRate, 100);
    assert.equal(summary.participantsWithCourtReport, 1);
    const [header, ...rows] = (await readFile(join(out, 'rsvps.csv'), 'utf8')).split('\n').map(row => row.split(','));
    const exported = Object.fromEntries(header.map((column, i) => [column, rows[0][i]]));
    assert.equal(exported.pace, 'casual');
    assert.equal(exported.newcomersWelcome, 'true');
    assert.equal(exported.hasJoinInstructions, 'true');
    const events = await readFile(join(out, 'events.csv'), 'utf8');
    for (const type of ['game_joined', 'checked_in', 'court_reported']) assert.ok(events.includes(type));

    // Exercise the untouched lifecycle endpoints too, without deleting report history.
    assert.equal((await api(gamePath, guest.idToken, undefined, 'DELETE')).status, 403);
    assert.equal((await api(gamePath + '/leave', guest.idToken, {})).status, 200);
    assert.equal((await api(gamePath, host.idToken, undefined, 'DELETE')).status, 200);
    assert.equal((await api(gamePath + '/checkin', guest.idToken, {})).status, 409);
    assert.equal((await api(endpoint, host.idToken)).body.courts.find((c: any) => c.courtLabel === 'Integration Court').status, 'busy');
  } finally { fetchMock.mock.restore(); await rm(out, { recursive: true, force: true }); }
});

test('game visibility preserves pre-start scope and removes ended/cancelled games', () => {
  const now = Date.now();
  const baseGame = { id: 'fixture', status: 'open', startTime: Timestamp.fromMillis(now - 60_000),
    durationMinutes: 60, hostUid: 'host', players: [{ uid: 'guest' }] } as any;
  assert.equal(visibleGames([baseGame], 'guest', now).length, 1);
  assert.equal(visibleGames([baseGame], undefined, now).length, 0);
  assert.equal(visibleGames([baseGame], 'stranger', now).length, 0);
  assert.equal(visibleGames([{ ...baseGame, startTime: Timestamp.fromMillis(now + 1) }], 'stranger', now).length, 1);
  assert.equal(visibleGames([{ ...baseGame, startTime: Timestamp.fromMillis(now) }], 'stranger', now).length, 0);
  assert.equal(visibleGames([{ ...baseGame, startTime: Timestamp.fromMillis(now - 60 * 60_000) }], 'guest', now).length, 0);
  for (const status of ['cancelled', 'completed']) assert.equal(visibleGames([{ ...baseGame, status }], 'host', now).length, 0);
});
