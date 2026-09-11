import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import type { Game } from '../types';
import { SPORT_COLORS, SPORT_LABELS } from './SportChip';
import { formatRelativeTime } from '../lib/time';
import { formatDistance } from '../lib/geo';
import { isRainy } from '../lib/weather';

export function GameCard({
  game,
  distanceMiles,
  onPress,
}: {
  game: Game;
  distanceMiles: number | null;
  onPress: () => void;
}) {
  const startDate = game.startTime.toDate();
  const rainy = isRainy(game.weather);

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        <View
          style={[styles.dot, { backgroundColor: SPORT_COLORS[game.sport] }]}
        />
        <Text style={styles.sport}>{SPORT_LABELS[game.sport]}</Text>
        <Text style={styles.time}>{formatRelativeTime(startDate)}</Text>
        {rainy && <Text style={styles.rain}>Rain</Text>}
      </View>
      <Text style={styles.spot}>{game.spotName}</Text>
      <View style={styles.row}>
        <Text style={styles.meta}>
          {game.players.length}/{game.capacity} joined
        </Text>
        {distanceMiles !== null && (
          <Text style={styles.meta}>{formatDistance(distanceMiles)}</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#fff',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sport: {
    fontWeight: '700',
    fontSize: 14,
  },
  time: {
    marginLeft: 'auto',
    color: '#666',
    fontSize: 13,
  },
  rain: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '600',
  },
  spot: {
    fontSize: 16,
    fontWeight: '600',
  },
  meta: {
    color: '#666',
    fontSize: 13,
    marginRight: 16,
  },
});
