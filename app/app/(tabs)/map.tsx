import React from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import MapView, { Callout, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUpcomingGames } from '../../src/lib/useUpcomingGames';
import { CAMPUS_REGION } from '../../src/lib/venues';
import { SPORT_COLORS, SPORT_LABELS } from '../../src/components/SportChip';
import { colors, radius, spacing, shadow } from '../../src/theme';

export default function MapTab() {
  const { games } = useUpcomingGames();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={CAMPUS_REGION}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {games.map((game) => (
          <Marker
            key={game.id}
            coordinate={{ latitude: game.lat, longitude: game.lng }}
            pinColor={SPORT_COLORS[game.sport]}
          >
            <Callout onPress={() => router.push(`/game/${game.id}`)}>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>
                  {SPORT_LABELS[game.sport]}
                </Text>
                <Text style={styles.calloutSpot}>{game.spotName}</Text>
                <Text style={styles.calloutMeta}>
                  {game.players.length}/{game.capacity} joined
                </Text>
                <Text style={styles.calloutLink}>View details</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      <View style={[styles.titlePill, { top: insets.top + spacing.sm }]}>
        <Text style={styles.titleText}>Map</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{games.length}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  titlePill: {
    position: 'absolute',
    left: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    ...shadow.card,
  },
  titleText: { fontWeight: '800', fontSize: 15, color: colors.text },
  countBadge: {
    backgroundColor: colors.bg,
    borderRadius: radius.pill,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  countText: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  callout: { minWidth: 170, gap: 2 },
  calloutTitle: { fontWeight: '700', color: colors.text },
  calloutSpot: { color: colors.text },
  calloutMeta: { color: colors.textMuted, fontSize: 12 },
  calloutLink: { color: colors.accent, marginTop: 4, fontSize: 12, fontWeight: '600' },
});
