import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { db } from '../../src/lib/firebase';
import { useAuth } from '../../src/context/AuthContext';
import type { Game } from '../../src/types';
import { SPORT_COLORS, SPORT_LABELS } from '../../src/components/SportChip';
import { formatTemp, formatPrecip, isRainy } from '../../src/lib/weather';
import { api, ApiError } from '../../src/lib/api';
import { logEvent } from '../../src/lib/events';

export default function GameDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    const unsubscribe = onSnapshot(doc(db, 'games', id), (snap) => {
      setGame(snap.exists() ? ({ id: snap.id, ...snap.data() } as Game) : null);
      setLoading(false);
    });
    return unsubscribe;
  }, [id]);

  useEffect(() => {
    if (id) logEvent('game_viewed', id);
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!game) {
    return (
      <View style={styles.center}>
        <Text>This game no longer exists.</Text>
      </View>
    );
  }

  const isHost = user?.uid === game.hostUid;
  const isPlayer = game.players.some((p) => p.uid === user?.uid);
  const isFull = game.players.length >= game.capacity;
  const isCancelled = game.status === 'cancelled';
  const startDate = game.startTime.toDate();

  async function handleJoin() {
    setActionLoading(true);
    try {
      await api.joinGame(game!.id);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : (err as Error).message;
      Alert.alert('Could not join', message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleLeave() {
    setActionLoading(true);
    try {
      await api.leaveGame(game!.id);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : (err as Error).message;
      Alert.alert('Could not leave', message);
    } finally {
      setActionLoading(false);
    }
  }

  function handleCancel() {
    Alert.alert('Cancel game?', 'This cannot be undone.', [
      { text: 'Keep game', style: 'cancel' },
      {
        text: 'Cancel game',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            await api.cancelGame(game!.id);
            router.back();
          } catch (err) {
            const message =
              err instanceof ApiError ? err.message : (err as Error).message;
            Alert.alert('Could not cancel', message);
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  }

  function openDirections() {
    const url = Platform.select({
      ios: `maps:0,0?q=${game!.lat},${game!.lng}`,
      android: `geo:0,0?q=${game!.lat},${game!.lng}(${encodeURIComponent(game!.spotName)})`,
    });
    if (url) Linking.openURL(url);
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: 20, gap: 4 }}
      data={game.players}
      keyExtractor={(p) => p.uid}
      ListHeaderComponent={
        <View style={{ gap: 12, marginBottom: 16 }}>
          <View style={styles.headerRow}>
            <View
              style={[styles.dot, { backgroundColor: SPORT_COLORS[game.sport] }]}
            />
            <Text style={styles.sport}>{SPORT_LABELS[game.sport]}</Text>
            {isCancelled && <Text style={styles.cancelledBadge}>Cancelled</Text>}
          </View>
          <Text style={styles.spot}>{game.spotName}</Text>
          <Text style={styles.meta}>
            {startDate.toLocaleString()} · {game.durationMinutes} min
          </Text>
          <Text style={styles.meta}>Hosted by {game.hostName}</Text>

          <View style={styles.weatherRow}>
            <Text style={styles.weatherText}>{formatTemp(game.weather)}</Text>
            <Text
              style={[styles.weatherText, isRainy(game.weather) && styles.rainText]}
            >
              {formatPrecip(game.weather) || 'No rain data'}
            </Text>
          </View>

          <MapView
            style={styles.map}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            initialRegion={{
              latitude: game.lat,
              longitude: game.lng,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            pointerEvents="none"
          >
            <Marker coordinate={{ latitude: game.lat, longitude: game.lng }} />
          </MapView>

          <Pressable style={styles.directionsButton} onPress={openDirections}>
            <Text style={styles.directionsText}>Get directions</Text>
          </Pressable>

          <Text style={styles.rosterTitle}>
            Roster ({game.players.length}/{game.capacity})
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.playerRow}>
          <Text style={styles.playerName}>{item.displayName}</Text>
          <Text style={styles.playerJoined}>
            joined {item.joinedAt.toDate().toLocaleTimeString()}
          </Text>
        </View>
      )}
      ListFooterComponent={
        <View style={{ marginTop: 24 }}>
          {isCancelled ? null : isHost ? (
            <Pressable
              style={styles.cancelButton}
              onPress={handleCancel}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.cancelButtonText}>Cancel game</Text>
              )}
            </Pressable>
          ) : isPlayer ? (
            <Pressable
              style={styles.leaveButton}
              onPress={handleLeave}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#1b1b1b" />
              ) : (
                <Text style={styles.leaveButtonText}>Leave game</Text>
              )}
            </Pressable>
          ) : (
            <Pressable
              style={[styles.joinButton, isFull && styles.joinButtonDisabled]}
              onPress={handleJoin}
              disabled={actionLoading || isFull}
            >
              {actionLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.joinButtonText}>
                  {isFull ? 'Game full' : 'Join game'}
                </Text>
              )}
            </Pressable>
          )}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  sport: { fontWeight: '700', fontSize: 16 },
  cancelledBadge: {
    marginLeft: 'auto',
    color: '#e11d48',
    fontWeight: '700',
  },
  spot: { fontSize: 24, fontWeight: '800' },
  meta: { color: '#666' },
  weatherRow: { flexDirection: 'row', gap: 16 },
  weatherText: { fontWeight: '600' },
  rainText: { color: '#2563eb' },
  map: { height: 140, borderRadius: 12 },
  directionsButton: {
    borderWidth: 1,
    borderColor: '#1b1b1b',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  directionsText: { fontWeight: '700' },
  rosterTitle: { fontWeight: '700', fontSize: 16, marginTop: 8 },
  playerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  playerName: { fontSize: 15 },
  playerJoined: { color: '#999', fontSize: 12 },
  joinButton: {
    backgroundColor: '#1b1b1b',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  joinButtonDisabled: { backgroundColor: '#999' },
  joinButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  leaveButton: {
    borderWidth: 1,
    borderColor: '#1b1b1b',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  leaveButtonText: { fontWeight: '700', fontSize: 16 },
  cancelButton: {
    backgroundColor: '#e11d48',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
