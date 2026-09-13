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
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../src/lib/firebase';
import { useAuth } from '../../src/context/AuthContext';
import type { Game } from '../../src/types';
import { SPORT_COLORS, SPORT_LABELS } from '../../src/components/SportChip';
import { formatTemp, formatPrecip, isRainy } from '../../src/lib/weather';
import { api, ApiError } from '../../src/lib/api';
import { logEvent } from '../../src/lib/events';
import { colors, radius, spacing, pressedStyle } from '../../src/theme';

export default function GameDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
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

  useEffect(() => {
    navigation.setOptions({ title: game?.spotName ?? '' });
  }, [game?.spotName, navigation]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.textMuted} />
      </View>
    );
  }

  if (!game) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={32} color={colors.textFaint} />
        <Text style={styles.notFoundText}>This game no longer exists.</Text>
      </View>
    );
  }

  const isHost = user?.uid === game.hostUid;
  const isPlayer = game.players.some((p) => p.uid === user?.uid);
  const isFull = game.players.length >= game.capacity;
  const isCancelled = game.status === 'cancelled';
  const startDate = game.startTime.toDate();
  const rainy = isRainy(game.weather);

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
      contentContainerStyle={styles.listContent}
      data={game.players}
      keyExtractor={(p) => p.uid}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View
              style={[styles.dot, { backgroundColor: SPORT_COLORS[game.sport] }]}
            />
            <Text style={styles.sport}>{SPORT_LABELS[game.sport]}</Text>
            {isCancelled && (
              <View style={styles.cancelledBadge}>
                <Text style={styles.cancelledBadgeText}>Cancelled</Text>
              </View>
            )}
          </View>
          <Text style={styles.spot}>{game.spotName}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={15} color={colors.textMuted} />
            <Text style={styles.meta}>
              {startDate.toLocaleString()} · {game.durationMinutes} min
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="person-outline" size={15} color={colors.textMuted} />
            <Text style={styles.meta}>Hosted by {game.hostName}</Text>
          </View>

          <View style={styles.weatherRow}>
            <View style={styles.weatherChip}>
              <Ionicons name="thermometer-outline" size={16} color={colors.text} />
              <Text style={styles.weatherText}>{formatTemp(game.weather)}</Text>
            </View>
            <View style={[styles.weatherChip, rainy && styles.weatherChipRain]}>
              <Ionicons
                name={rainy ? 'rainy' : 'partly-sunny-outline'}
                size={16}
                color={rainy ? colors.accent : colors.text}
              />
              <Text style={[styles.weatherText, rainy && styles.rainText]}>
                {formatPrecip(game.weather) || 'No rain data'}
              </Text>
            </View>
          </View>

          <View style={styles.mapWrap}>
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
          </View>

          <Pressable
            style={({ pressed }) => [styles.directionsButton, pressedStyle(pressed)]}
            onPress={openDirections}
          >
            <Ionicons name="navigate-outline" size={16} color={colors.text} />
            <Text style={styles.directionsText}>Get directions</Text>
          </Pressable>

          <View style={styles.rosterHeaderRow}>
            <Text style={styles.rosterTitle}>Roster</Text>
            <Text style={styles.rosterCount}>
              {game.players.length}/{game.capacity}
            </Text>
          </View>
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.emptyRoster}>No one has joined yet.</Text>
      }
      renderItem={({ item }) => (
        <View style={styles.playerRow}>
          <View style={styles.playerAvatar}>
            <Text style={styles.playerAvatarText}>
              {item.displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.playerName}>{item.displayName}</Text>
          {item.uid === game.hostUid && (
            <View style={styles.hostBadge}>
              <Text style={styles.hostBadgeText}>Host</Text>
            </View>
          )}
          <Text style={styles.playerJoined}>
            {item.joinedAt.toDate().toLocaleTimeString([], {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </Text>
        </View>
      )}
      ListFooterComponent={
        <View style={styles.footer}>
          {isCancelled ? null : isHost ? (
            <Pressable
              style={({ pressed }) => [styles.cancelButton, pressedStyle(pressed)]}
              onPress={handleCancel}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color={colors.primaryText} />
              ) : (
                <Text style={styles.cancelButtonText}>Cancel game</Text>
              )}
            </Pressable>
          ) : isPlayer ? (
            <Pressable
              style={({ pressed }) => [styles.leaveButton, pressedStyle(pressed)]}
              onPress={handleLeave}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Text style={styles.leaveButtonText}>Leave game</Text>
              )}
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.joinButton,
                isFull && styles.joinButtonDisabled,
                pressedStyle(pressed),
              ]}
              onPress={handleJoin}
              disabled={actionLoading || isFull}
            >
              {actionLoading ? (
                <ActivityIndicator color={colors.primaryText} />
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
  container: { flex: 1, backgroundColor: colors.bg },
  listContent: { padding: spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.bg },
  notFoundText: { color: colors.textMuted },
  header: { gap: spacing.sm, marginBottom: spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  sport: { fontWeight: '700', fontSize: 15, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },
  cancelledBadge: {
    marginLeft: 'auto',
    backgroundColor: colors.danger,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  cancelledBadgeText: { color: colors.primaryText, fontWeight: '700', fontSize: 12 },
  spot: { fontSize: 26, fontWeight: '800', color: colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { color: colors.textMuted, fontSize: 14 },
  weatherRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  weatherChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  weatherChipRain: { borderColor: colors.accent },
  weatherText: { fontWeight: '600', color: colors.text, fontSize: 13 },
  rainText: { color: colors.accent },
  mapWrap: { borderRadius: radius.md, overflow: 'hidden', marginTop: spacing.xs },
  map: { height: 140 },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    backgroundColor: colors.surface,
  },
  directionsText: { fontWeight: '700', color: colors.text },
  rosterHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  rosterTitle: { fontWeight: '700', fontSize: 16, color: colors.text },
  rosterCount: { color: colors.textMuted, fontWeight: '600' },
  emptyRoster: { color: colors.textFaint, fontSize: 14, paddingVertical: spacing.md },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  playerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerAvatarText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  playerName: { fontSize: 15, color: colors.text },
  hostBadge: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  hostBadgeText: { fontSize: 10, fontWeight: '700', color: colors.textMuted },
  playerJoined: { color: colors.textFaint, fontSize: 12, marginLeft: 'auto' },
  footer: { marginTop: spacing.xl, paddingBottom: spacing.xl },
  joinButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: 16,
    alignItems: 'center',
  },
  joinButtonDisabled: { backgroundColor: colors.textFaint },
  joinButtonText: { color: colors.primaryText, fontWeight: '700', fontSize: 16 },
  leaveButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    padding: 16,
    alignItems: 'center',
  },
  leaveButtonText: { fontWeight: '700', fontSize: 16, color: colors.text },
  cancelButton: {
    backgroundColor: colors.danger,
    borderRadius: radius.md,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: { color: colors.primaryText, fontWeight: '700', fontSize: 16 },
});
