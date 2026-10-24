// Shared shape with app/src/types/index.ts. Keep both in sync manually.

export type Sport =
  | 'basketball'
  | 'soccer'
  | 'volleyball'
  | 'tennis'
  | 'football'
  | 'spikeball'
  | 'other';

export type Pace = 'casual' | 'moderate' | 'competitive';

export type GameStatus = 'open' | 'full' | 'cancelled' | 'completed';

export interface Player {
  uid: string;
  displayName: string;
  joinedAt: FirebaseFirestore.Timestamp;
  arrivedAt?: FirebaseFirestore.Timestamp | null;
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
  // Missing on games created before Sprint 3.
  pace?: Pace | null;
  newcomersWelcome?: boolean;
  joinInstructions?: string;
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
  | 'game_cancelled'
  | 'checked_in'
  | 'game_viewed'
  | 'app_opened'
  | 'signed_up';

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
  // Optional so older app builds that don't send them can still create games.
  pace?: Pace;
  newcomersWelcome?: boolean;
  joinInstructions?: string;
}
