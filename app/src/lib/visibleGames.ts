import type { Game } from '../types';

// Discover upcoming games. Keep an ongoing RSVP/hosted game reachable after
// reopening the app so its participants can check in and report the court.
// The API still rejects new joins after start.
export function visibleGames(games: Game[], uid: string | undefined, now: number): Game[] {
  return games.filter((game) => {
    if (game.status !== 'open' && game.status !== 'full') return false;
    const start = game.startTime.toMillis();
    if (start > now) return true;
    const participating = !!uid && (game.hostUid === uid || game.players.some((p) => p.uid === uid));
    return participating && now < start + game.durationMinutes * 60_000;
  });
}
