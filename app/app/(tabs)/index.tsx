import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SPORTS, type Sport } from '../../src/types';
import { SportChip } from '../../src/components/SportChip';
import { GameCard } from '../../src/components/GameCard';
import { useUpcomingGames } from '../../src/lib/useUpcomingGames';
import { useLocation } from '../../src/lib/useLocation';
import { haversineMiles } from '../../src/lib/geo';
import { colors, radius, spacing, shadow, pressedStyle } from '../../src/theme';

export default function GamesList() {
  const router = useRouter();
  const { games, loading } = useUpcomingGames();
  const { coords } = useLocation();
  const [sportFilter, setSportFilter] = useState<Sport | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(() => {
    const list = sportFilter
      ? games.filter((g) => g.sport === sportFilter)
      : games;

    if (!coords) return list;

    return [...list].sort((a, b) => {
      const da = haversineMiles(coords.latitude, coords.longitude, a.lat, a.lng);
      const db = haversineMiles(coords.latitude, coords.longitude, b.lat, b.lng);
      return da - db;
    });
  }, [games, sportFilter, coords]);

  function distanceFor(lat: number, lng: number) {
    if (!coords) return null;
    return haversineMiles(coords.latitude, coords.longitude, lat, lng);
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.textMuted}
            onRefresh={() => {
              setRefreshing(true);
              setTimeout(() => setRefreshing(false), 400);
            }}
          />
        }
        ListHeaderComponent={
          <FlatList
            data={SPORTS}
            horizontal
            keyExtractor={(s) => s}
            showsHorizontalScrollIndicator={false}
            style={styles.chipRow}
            renderItem={({ item }) => (
              <SportChip
                sport={item}
                selected={sportFilter === item}
                onPress={() =>
                  setSportFilter((current) => (current === item ? null : item))
                }
              />
            )}
          />
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.empty}>
              <ActivityIndicator size="large" color={colors.textMuted} />
            </View>
          ) : (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="basketball-outline" size={28} color={colors.textFaint} />
              </View>
              <Text style={styles.emptyTitle}>
                {sportFilter ? 'No games for this sport' : 'No games yet'}
              </Text>
              <Text style={styles.emptyBody}>
                {sportFilter
                  ? 'Try another sport or start one yourself.'
                  : 'Be the first to start one near campus.'}
              </Text>
              <Pressable
                style={({ pressed }) => [styles.emptyButton, pressedStyle(pressed)]}
                onPress={() => router.push('/create')}
              >
                <Text style={styles.emptyButtonText}>Create a game</Text>
              </Pressable>
            </View>
          )
        }
        renderItem={({ item }) => (
          <GameCard
            game={item}
            distanceMiles={distanceFor(item.lat, item.lng)}
            onPress={() => router.push(`/game/${item.id}`)}
          />
        )}
      />

      <Pressable
        style={({ pressed }) => [styles.fab, pressedStyle(pressed)]}
        onPress={() => router.push('/create')}
      >
        <Ionicons name="add" size={28} color={colors.primaryText} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  listContent: { padding: spacing.lg, paddingBottom: 100, flexGrow: 1 },
  chipRow: { marginBottom: spacing.md },
  empty: { alignItems: 'center', paddingTop: 72, gap: spacing.xs },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  emptyBody: { color: colors.textMuted, textAlign: 'center', paddingHorizontal: spacing.xl },
  emptyButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  emptyButtonText: { color: colors.primaryText, fontWeight: '700' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.floating,
  },
});
