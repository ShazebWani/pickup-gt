import { Router, Response } from 'express';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { db } from '../services/firestore';
import { getWeatherAt } from '../services/weather';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import type { CreateGameBody, EventType, Sport } from '../types';

const router = Router();

const SPORTS: Sport[] = [
  'basketball',
  'soccer',
  'volleyball',
  'tennis',
  'football',
  'spikeball',
  'other',
];

const BOUNDS = { minLat: 33.6, maxLat: 33.9, minLng: -84.6, maxLng: -84.2 };
const MAX_START_DAYS_OUT = 14;

function validateCreateGameBody(body: Partial<CreateGameBody>): string | null {
  if (!body.sport || !SPORTS.includes(body.sport)) {
    return `sport must be one of ${SPORTS.join(', ')}`;
  }
  if (
    typeof body.spotName !== 'string' ||
    body.spotName.length < 1 ||
    body.spotName.length > 60
  ) {
    return 'spotName must be 1 to 60 characters';
  }
  if (typeof body.lat !== 'number' || body.lat < BOUNDS.minLat || body.lat > BOUNDS.maxLat) {
    return `lat must be between ${BOUNDS.minLat} and ${BOUNDS.maxLat}`;
  }
  if (typeof body.lng !== 'number' || body.lng < BOUNDS.minLng || body.lng > BOUNDS.maxLng) {
    return `lng must be between ${BOUNDS.minLng} and ${BOUNDS.maxLng}`;
  }
  if (
    typeof body.durationMinutes !== 'number' ||
    body.durationMinutes < 15 ||
    body.durationMinutes > 300
  ) {
    return 'durationMinutes must be between 15 and 300';
  }
  if (
    typeof body.capacity !== 'number' ||
    body.capacity < 2 ||
    body.capacity > 30
  ) {
    return 'capacity must be between 2 and 30';
  }
  if (typeof body.startTime !== 'string' || Number.isNaN(Date.parse(body.startTime))) {
    return 'startTime must be a valid ISO date string';
  }
  const start = new Date(body.startTime);
  const now = new Date();
  const maxDate = new Date(now.getTime() + MAX_START_DAYS_OUT * 24 * 60 * 60 * 1000);
  if (start <= now) {
    return 'startTime must be in the future';
  }
  if (start > maxDate) {
    return `startTime must be within the next ${MAX_START_DAYS_OUT} days`;
  }
  return null;
}

async function logEvent(
  uid: string,
  type: EventType,
  gameId: string | null,
  metadata: Record<string, string | number> | null = null
) {
  await db.collection('events').add({
    uid,
    type,
    gameId,
    timestamp: FieldValue.serverTimestamp(),
    metadata,
  });
}

async function getDisplayName(uid: string): Promise<string> {
  const userDoc = await db.collection('users').doc(uid).get();
  return (userDoc.data()?.displayName as string) ?? 'Player';
}

router.post('/', requireAuth, async (req: AuthedRequest, res: Response) => {
  const uid = req.uid!;
  const body = req.body as Partial<CreateGameBody>;

  const validationError = validateCreateGameBody(body);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  const hostName = await getDisplayName(uid);
  const startTime = new Date(body.startTime!);
  const weather = await getWeatherAt(body.lat!, body.lng!, startTime);

  const gameRef = db.collection('games').doc();
  await gameRef.set({
    id: gameRef.id,
    sport: body.sport,
    spotName: body.spotName,
    venueId: body.venueId ?? null,
    lat: body.lat,
    lng: body.lng,
    startTime: Timestamp.fromDate(startTime),
    durationMinutes: body.durationMinutes,
    capacity: body.capacity,
    hostUid: uid,
    hostName,
    players: [],
    status: 'open',
    weather: weather
      ? { ...weather, fetchedAt: Timestamp.now() }
      : null,
    createdAt: FieldValue.serverTimestamp(),
  });

  await logEvent(uid, 'game_created', gameRef.id);

  res.status(201).json({ id: gameRef.id });
});

router.post('/:id/join', requireAuth, async (req: AuthedRequest, res: Response) => {
  const uid = req.uid!;
  const gameRef = db.collection('games').doc(req.params.id);
  const displayName = await getDisplayName(uid);

  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(gameRef);
      if (!snap.exists) {
        throw { status: 404, message: 'Game not found.' };
      }
      const game = snap.data()!;

      if (game.status === 'cancelled') {
        throw { status: 409, message: 'This game was cancelled.' };
      }
      if (game.startTime.toDate() <= new Date()) {
        throw { status: 409, message: 'This game has already started.' };
      }
      const players: Array<{ uid: string }> = game.players ?? [];
      if (players.some((p) => p.uid === uid)) {
        throw { status: 409, message: 'You already joined this game.' };
      }
      if (players.length >= game.capacity) {
        throw { status: 409, message: 'This game is full.' };
      }

      const newPlayers = [
        ...players,
        { uid, displayName, joinedAt: Timestamp.now() },
      ];
      tx.update(gameRef, {
        players: newPlayers,
        status: newPlayers.length >= game.capacity ? 'full' : 'open',
      });
    });

    await logEvent(uid, 'game_joined', req.params.id);
    res.json({ ok: true });
  } catch (err: any) {
    if (err?.status) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Failed to join game.' });
  }
});

router.post('/:id/leave', requireAuth, async (req: AuthedRequest, res: Response) => {
  const uid = req.uid!;
  const gameRef = db.collection('games').doc(req.params.id);

  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(gameRef);
      if (!snap.exists) {
        throw { status: 404, message: 'Game not found.' };
      }
      const game = snap.data()!;

      if (game.hostUid === uid) {
        throw { status: 403, message: 'The host cannot leave, cancel the game instead.' };
      }
      const players: Array<{ uid: string }> = game.players ?? [];
      if (!players.some((p) => p.uid === uid)) {
        throw { status: 409, message: 'You are not in this game.' };
      }

      const newPlayers = players.filter((p) => p.uid !== uid);
      tx.update(gameRef, {
        players: newPlayers,
        status: game.status === 'cancelled' ? 'cancelled' : 'open',
      });
    });

    await logEvent(uid, 'game_left', req.params.id);
    res.json({ ok: true });
  } catch (err: any) {
    if (err?.status) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Failed to leave game.' });
  }
});

router.delete('/:id', requireAuth, async (req: AuthedRequest, res: Response) => {
  const uid = req.uid!;
  const gameRef = db.collection('games').doc(req.params.id);

  const snap = await gameRef.get();
  if (!snap.exists) {
    res.status(404).json({ error: 'Game not found.' });
    return;
  }
  const game = snap.data()!;
  if (game.hostUid !== uid) {
    res.status(403).json({ error: 'Only the host can cancel this game.' });
    return;
  }

  await gameRef.update({ status: 'cancelled' });
  await logEvent(uid, 'game_left', req.params.id, { reason: 'host_cancelled' });
  res.json({ ok: true });
});

router.post(
  '/:id/refresh-weather',
  requireAuth,
  async (req: AuthedRequest, res: Response) => {
    const gameRef = db.collection('games').doc(req.params.id);
    const snap = await gameRef.get();
    if (!snap.exists) {
      res.status(404).json({ error: 'Game not found.' });
      return;
    }
    const game = snap.data()!;
    const weather = await getWeatherAt(game.lat, game.lng, game.startTime.toDate());
    if (!weather) {
      res.status(502).json({ error: 'Could not fetch weather right now.' });
      return;
    }
    await gameRef.update({
      weather: { ...weather, fetchedAt: Timestamp.now() },
    });
    res.json({ ok: true });
  }
);

export default router;
