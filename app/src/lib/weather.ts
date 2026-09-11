import type { Weather } from '../types';

/** True when a game is likely to get rained on. */
export function isRainy(weather: Weather | null | undefined): boolean {
  return !!weather && weather.precipProbability > 40;
}

export function formatTemp(weather: Weather | null | undefined): string {
  if (!weather) return '--';
  return `${Math.round(weather.tempF)}°F`;
}

export function formatPrecip(weather: Weather | null | undefined): string {
  if (!weather) return '';
  return `${Math.round(weather.precipProbability)}% rain`;
}
