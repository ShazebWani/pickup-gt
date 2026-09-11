import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SPORTS, type Sport } from '../../src/types';
import { SportChip } from '../../src/components/SportChip';
import { GameCard } from '../../src/components/GameCard';
import { useUpcomingGames } from '../../src/lib/useUpcomingGames';
import { useLocation } from '../../src/lib/useLocation';
import { haversineMiles } from '../../src/lib/geo';

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
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No games yet</Text>
              <Text style={styles.emptyBody}>
                Be the first to start one near campus.
              </Text>
              <Pressable
                style={styles.emptyButton}
                onPress={() => router.push('/create')}
              >
                <Text style={styles.emptyButtonText}>Create a game</Text>
              </Pressable>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <GameCard
            game={item}
            distanceMiles={distanceFor(item.lat, item.lng)}
            onPress={() => router.push(`/game/${item.id}`)}
          />
        )}
      />

      <Pressable style={styles.fab} onPress={() => router.push('/create')}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f7' },
  listContent: { padding: 16, paddingBottom: 100 },
  chipRow: { marginBottom: 12 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyBody: { color: '#666', textAlign: 'center' },
  emptyButton: {
    marginTop: 12,
    backgroundColor: '#1b1b1b',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  emptyButtonText: { color: '#fff', fontWeight: '700' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1b1b1b',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 30 },
});
