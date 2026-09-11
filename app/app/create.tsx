import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SPORTS, type Sport } from '../src/types';
import { SportChip } from '../src/components/SportChip';
import { VENUES, CAMPUS_REGION } from '../src/lib/venues';
import { api, ApiError } from '../src/lib/api';

const MIN_CAPACITY = 2;
const MAX_CAPACITY = 30;
const MIN_DURATION = 15;
const MAX_DURATION = 300;
const DURATION_STEP = 15;

export default function CreateGame() {
  const router = useRouter();
  const [sport, setSport] = useState<Sport>('basketball');
  const [venueId, setVenueId] = useState<string | null>(VENUES[0].id);
  const [pin, setPin] = useState<{ latitude: number; longitude: number } | null>(
    null
  );
  const [spotName, setSpotName] = useState('');
  const [startTime, setStartTime] = useState(
    new Date(Date.now() + 60 * 60 * 1000)
  );
  const [showPicker, setShowPicker] = useState(false);
  const [duration, setDuration] = useState(60);
  const [capacity, setCapacity] = useState(10);
  const [submitting, setSubmitting] = useState(false);

  const selectedVenue = VENUES.find((v) => v.id === venueId) ?? null;

  function selectVenue(id: string) {
    setVenueId(id);
    setPin(null);
  }

  function dropPin(latitude: number, longitude: number) {
    setPin({ latitude, longitude });
    setVenueId(null);
  }

  async function handleSubmit() {
    const finalSpotName = selectedVenue?.name ?? spotName.trim();
    const lat = selectedVenue?.lat ?? pin?.latitude;
    const lng = selectedVenue?.lng ?? pin?.longitude;

    if (!finalSpotName) {
      Alert.alert('Missing spot', 'Pick a venue or name your custom spot.');
      return;
    }
    if (lat === undefined || lng === undefined) {
      Alert.alert('Missing location', 'Pick a venue or drop a pin on the map.');
      return;
    }

    setSubmitting(true);
    try {
      const { id } = await api.createGame({
        sport,
        spotName: finalSpotName,
        venueId,
        lat,
        lng,
        startTime: startTime.toISOString(),
        durationMinutes: duration,
        capacity,
      });
      router.replace(`/game/${id}`);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : (err as Error).message;
      Alert.alert('Could not create game', message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Sport</Text>
      <View style={styles.wrapRow}>
        {SPORTS.map((s) => (
          <SportChip key={s} sport={s} selected={sport === s} onPress={() => setSport(s)} />
        ))}
      </View>

      <Text style={styles.label}>Spot</Text>
      <View style={styles.wrapRow}>
        {VENUES.map((v) => (
          <Pressable
            key={v.id}
            onPress={() => selectVenue(v.id)}
            style={[styles.venueChip, venueId === v.id && styles.venueChipSelected]}
          >
            <Text style={venueId === v.id ? styles.venueTextSelected : styles.venueText}>
              {v.name}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.hint}>Or drop a pin for a custom spot:</Text>
      <MapView
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={CAMPUS_REGION}
        onPress={(e) => dropPin(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude)}
      >
        {pin && <Marker coordinate={pin} />}
        {selectedVenue && (
          <Marker
            coordinate={{ latitude: selectedVenue.lat, longitude: selectedVenue.lng }}
            pinColor="#3aa15c"
          />
        )}
      </MapView>
      {pin && (
        <TextInput
          style={styles.input}
          placeholder="Name this spot (e.g. Behind Van Leer)"
          value={spotName}
          onChangeText={setSpotName}
        />
      )}

      <Text style={styles.label}>Start time</Text>
      <Pressable style={styles.input} onPress={() => setShowPicker(true)}>
        <Text>{startTime.toLocaleString()}</Text>
      </Pressable>
      {showPicker && (
        <DateTimePicker
          value={startTime}
          mode="datetime"
          minimumDate={new Date()}
          onChange={(_, date) => {
            setShowPicker(Platform.OS === 'ios');
            if (date) setStartTime(date);
          }}
        />
      )}

      <Stepper
        label="Duration (minutes)"
        value={duration}
        min={MIN_DURATION}
        max={MAX_DURATION}
        step={DURATION_STEP}
        onChange={setDuration}
      />
      <Stepper
        label="Capacity"
        value={capacity}
        min={MIN_CAPACITY}
        max={MAX_CAPACITY}
        step={1}
        onChange={setCapacity}
      />

      <Pressable style={styles.submit} onPress={handleSubmit} disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Create game</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.stepperRow}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.stepperControls}>
        <Pressable
          style={styles.stepperButton}
          onPress={() => onChange(Math.max(min, value - step))}
        >
          <Text style={styles.stepperButtonText}>-</Text>
        </Pressable>
        <Text style={styles.stepperValue}>{value}</Text>
        <Pressable
          style={styles.stepperButton}
          onPress={() => onChange(Math.min(max, value + step))}
        >
          <Text style={styles.stepperButtonText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 8, paddingBottom: 60 },
  label: { fontWeight: '700', marginTop: 16, marginBottom: 6 },
  hint: { color: '#666', fontSize: 13, marginTop: 12 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  venueChip: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  venueChipSelected: { backgroundColor: '#1b1b1b', borderColor: '#1b1b1b' },
  venueText: { fontSize: 13 },
  venueTextSelected: { fontSize: 13, color: '#fff' },
  map: { height: 180, borderRadius: 12, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    marginTop: 10,
  },
  stepperRow: { marginTop: 10 },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: { fontSize: 20, fontWeight: '700' },
  stepperValue: { fontSize: 16, fontWeight: '700', minWidth: 40, textAlign: 'center' },
  submit: {
    backgroundColor: '#1b1b1b',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
