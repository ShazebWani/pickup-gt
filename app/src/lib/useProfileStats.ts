import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import type { Game } from './../types';

export interface ProfileStats {
  hosted: number;
  joined: number;
}

/**
 * Scans the games collection client-side to count hosted/joined games.
 * Fine at MVP scale; would need denormalized counters if this collection
 * grows large.
 */
export function useProfileStats(uid: string | undefined) {
  const [stats, setStats] = useState<ProfileStats>({ hosted: 0, joined: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;

    (async () => {
      const snapshot = await getDocs(collection(db, 'games'));
      let hosted = 0;
      let joined = 0;
      snapshot.forEach((doc) => {
        const game = doc.data() as Game;
        if (game.hostUid === uid) hosted += 1;
        if (game.players?.some((p) => p.uid === uid)) joined += 1;
      });
      if (!cancelled) {
        setStats({ hosted, joined });
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uid]);

  return { stats, loading };
}
