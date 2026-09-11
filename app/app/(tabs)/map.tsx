import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Callout, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useUpcomingGames } from '../../src/lib/useUpcomingGames';
import { CAMPUS_REGION } from '../../src/lib/venues';
import { SPORT_COLORS, SPORT_LABELS } from '../../src/components/SportChip';
import { Text } from 'react-native';

export default function MapTab() {
  const { games } = useUpcomingGames();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={CAMPUS_REGION}
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
                <Text>{game.spotName}</Text>
                <Text style={styles.calloutMeta}>
                  {game.players.length}/{game.capacity} joined
                </Text>
                <Text style={styles.calloutLink}>View details</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  callout: { minWidth: 160, gap: 2 },
  calloutTitle: { fontWeight: '700' },
  calloutMeta: { color: '#666', fontSize: 12 },
  calloutLink: { color: '#2563eb', marginTop: 4, fontSize: 12 },
});
