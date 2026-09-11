// Shared shape with app/src/types/index.ts. Keep both in sync manually.

export type Sport =
  | 'basketball'
  | 'soccer'
  | 'volleyball'
  | 'tennis'
  | 'football'
  | 'spikeball'
  | 'other';

export type GameStatus = 'open' | 'full' | 'cancelled' | 'completed';

export interface Player {
  uid: string;
  displayName: string;
  joinedAt: FirebaseFirestore.Timestamp;
}

export interface Weather {
  tempF: number;
  precipProbability: number;
  conditionCode: number;
  fetchedAt: FirebaseFirestore.Timestamp;
}

export interface Game {
  id: string;
  sport: Sport;
  spotName: string;
  venueId: string | null;
  lat: number;
  lng: number;
  startTime: FirebaseFirestore.Timestamp;
  durationMinutes: number;
  capacity: number;
  hostUid: string;
  hostName: string;
  players: Player[];
  status: GameStatus;
  weather: Weather | null;
  createdAt: FirebaseFirestore.Timestamp;
}

export interface UserDoc {
  uid: string;
  displayName: string;
  email: string;
  createdAt: FirebaseFirestore.Timestamp;
}

export type EventType =
  | 'game_created'
  | 'game_joined'
  | 'game_left'
  | 'game_viewed'
  | 'app_opened';

export interface EventDoc {
  uid: string;
  type: EventType;
  gameId: string | null;
  timestamp: FirebaseFirestore.Timestamp;
  metadata: Record<string, string | number> | null;
}

export interface CreateGameBody {
  sport: Sport;
  spotName: string;
  venueId: string | null;
  lat: number;
  lng: number;
  startTime: string; // ISO string over the wire
  durationMinutes: number;
  capacity: number;
}
