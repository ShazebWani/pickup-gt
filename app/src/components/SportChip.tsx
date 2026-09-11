import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import type { Sport } from '../types';

export const SPORT_COLORS: Record<Sport, string> = {
  basketball: '#e8703a',
  soccer: '#3aa15c',
  volleyball: '#3a7ce8',
  tennis: '#c9a227',
  football: '#8a5a2b',
  spikeball: '#a13ae0',
  other: '#6b7280',
};

export const SPORT_LABELS: Record<Sport, string> = {
  basketball: 'Basketball',
  soccer: 'Soccer',
  volleyball: 'Volleyball',
  tennis: 'Tennis',
  football: 'Football',
  spikeball: 'Spikeball',
  other: 'Other',
};

export function SportChip({
  sport,
  selected,
  onPress,
}: {
  sport: Sport;
  selected: boolean;
  onPress: () => void;
}) {
  const color = SPORT_COLORS[sport];
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: color },
        selected && { backgroundColor: color },
      ]}
    >
      <Text style={[styles.label, { color: selected ? '#fff' : color }]}>
        {SPORT_LABELS[sport]}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    marginRight: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});
