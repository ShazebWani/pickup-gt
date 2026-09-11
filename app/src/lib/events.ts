import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { EventType } from '../types';

// Client only ever writes view/open events; mutating events are written
// server-side alongside the mutation they describe.
export async function logEvent(
  type: Extract<EventType, 'game_viewed' | 'app_opened'>,
  gameId: string | null = null,
  metadata: Record<string, string | number> | null = null
) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  try {
    await addDoc(collection(db, 'events'), {
      uid,
      type,
      gameId,
      timestamp: serverTimestamp(),
      metadata,
    });
  } catch {
    // Best-effort logging; never block the UI on it.
  }
}
