/** "in 12m", "in 3h", "in 2d", or "started" for a past time. */
export function formatRelativeTime(date: Date): string {
  const diffMs = date.getTime() - Date.now();
  if (diffMs <= 0) return 'started';

  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 60) return `in ${minutes}m`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `in ${hours}h`;

  const days = Math.round(hours / 24);
  return `in ${days}d`;
}
