import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Game } from '../types';
import { SPORT_COLORS, SPORT_LABELS } from './SportChip';
import { formatRelativeTime } from '../lib/time';
import { formatDistance } from '../lib/geo';
import { isRainy } from '../lib/weather';
import { colors, radius, spacing, shadow, pressedStyle } from '../theme';

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
  const isFull = game.players.length >= game.capacity;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressedStyle(pressed)]}
    >
      <View style={styles.row}>
        <View
          style={[styles.dot, { backgroundColor: SPORT_COLORS[game.sport] }]}
        />
        <Text style={styles.sport}>{SPORT_LABELS[game.sport]}</Text>
        <Text style={styles.time}>{formatRelativeTime(startDate)}</Text>
      </View>
      <Text style={styles.spot} numberOfLines={1}>
        {game.spotName}
      </Text>
      <View style={styles.row}>
        <Text style={[styles.meta, isFull && styles.metaFull]}>
          {game.players.length}/{game.capacity} joined
        </Text>
        {distanceMiles !== null && (
          <View style={styles.metaInline}>
            <Ionicons name="location-outline" size={13} color={colors.textMuted} />
            <Text style={styles.meta}>{formatDistance(distanceMiles)}</Text>
          </View>
        )}
        {rainy && (
          <View style={styles.metaInline}>
            <Ionicons name="rainy-outline" size={13} color={colors.accent} />
            <Text style={styles.rain}>Rain</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
    ...shadow.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sport: {
    fontWeight: '700',
    fontSize: 14,
    color: colors.text,
  },
  time: {
    marginLeft: 'auto',
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  rain: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  spot: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 13,
  },
  metaFull: {
    color: colors.danger,
    fontWeight: '600',
  },
  metaInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginRight: spacing.md,
  },
});
