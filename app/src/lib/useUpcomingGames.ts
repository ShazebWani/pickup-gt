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
import { useAuth } from '../context/AuthContext';
import { visibleGames } from './visibleGames';

/** Upcoming games plus the caller's ongoing games, soonest first. */
export function useUpcomingGames() {
  const { user } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, 'games'),
      // 300 minutes is the API's maximum game duration. The existing query
      // index still applies; filtering participation happens locally.
      where('startTime', '>=', Timestamp.fromMillis(Date.now() - 300 * 60_000)),
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

  return { games: visibleGames(games, user?.uid, now), loading };
}
