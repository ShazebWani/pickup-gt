import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Game, Pace } from '../types';
import { colors, radius, spacing } from '../theme';

export const PACE_LABELS: Record<Pace, string> = {
  casual: 'Casual',
  moderate: 'Moderate',
  competitive: 'Competitive',
};

// Describes the game, not the player, so nobody has to rate their own skill.
export const PACE_DESCRIPTIONS: Record<Pace, string> = {
  casual: 'Relaxed runs, all levels, nobody takes the score too seriously',
  moderate: 'Real games with calls and score, friendly rotation',
  competitive: 'Fast and physical, winners stay on',
};

/** Pace and newcomer pills shown on game cards. Renders nothing for pre-Sprint 3 games. */
export function GameTags({ game }: { game: Game }) {
  if (!game.pace && !game.newcomersWelcome) return null;
  return (
    <View style={styles.row}>
      {game.pace && (
        <View style={styles.tag}>
          <Ionicons name="speedometer-outline" size={12} color={colors.textMuted} />
          <Text style={styles.tagText}>{PACE_LABELS[game.pace]}</Text>
        </View>
      )}
      {game.newcomersWelcome && (
        <View style={[styles.tag, styles.welcomeTag]}>
          <Ionicons name="hand-left-outline" size={12} color={colors.success} />
          <Text style={[styles.tagText, styles.welcomeText]}>Newcomers welcome</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  tagText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  welcomeTag: { borderColor: colors.success },
  welcomeText: { color: colors.success },
});
