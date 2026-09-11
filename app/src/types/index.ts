// Shared shape with server/src/types/index.ts. Keep both in sync manually.
// The client reads Firestore Timestamps directly (firebase/firestore Timestamp),
// so the type below uses that instead of the admin SDK's Timestamp.
import type { Timestamp } from 'firebase/firestore';

export type Sport =
  | 'basketball'
  | 'soccer'
  | 'volleyball'
  | 'tennis'
  | 'football'
  | 'spikeball'
  | 'other';

export const SPORTS: Sport[] = [
  'basketball',
  'soccer',
  'volleyball',
  'tennis',
  'football',
  'spikeball',
  'other',
];

export type GameStatus = 'open' | 'full' | 'cancelled' | 'completed';

export interface Player {
  uid: string;
  displayName: string;
  joinedAt: Timestamp;
}

export interface Weather {
  tempF: number;
  precipProbability: number;
  conditionCode: number;
  fetchedAt: Timestamp;
}

export interface Game {
  id: string;
  sport: Sport;
  spotName: string;
  venueId: string | null;
  lat: number;
  lng: number;
  startTime: Timestamp;
  durationMinutes: number;
  capacity: number;
  hostUid: string;
  hostName: string;
  players: Player[];
  status: GameStatus;
  weather: Weather | null;
  createdAt: Timestamp;
}

export interface UserDoc {
  uid: string;
  displayName: string;
  email: string;
  createdAt: Timestamp;
}

export type EventType =
  | 'game_created'
  | 'game_joined'
  | 'game_left'
  | 'game_viewed'
  | 'app_opened';

export interface CreateGamePayload {
  sport: Sport;
  spotName: string;
  venueId: string | null;
  lat: number;
  lng: number;
  startTime: string; // ISO string
  durationMinutes: number;
  capacity: number;
}
