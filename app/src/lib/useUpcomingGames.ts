import { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Game } from '../types';

/** Live query of open/full games starting from now onward, soonest first. */
export function useUpcomingGames() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'games'),
      where('startTime', '>=', Timestamp.now()),
      where('status', 'in', ['open', 'full']),
      orderBy('startTime', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setGames(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Game))
        );
        setLoading(false);
      },
      () => setLoading(false)
    );

    return unsubscribe;
  }, []);

  return { games, loading };
}
