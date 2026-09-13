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
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SPORTS, type Sport } from '../src/types';
import { SportChip } from '../src/components/SportChip';
import { VENUES, CAMPUS_REGION } from '../src/lib/venues';
import { api, ApiError } from '../src/lib/api';
import { colors, radius, spacing, pressedStyle } from '../src/theme';

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
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Section label="Sport">
          <View style={styles.wrapRow}>
            {SPORTS.map((s) => (
              <SportChip key={s} sport={s} selected={sport === s} onPress={() => setSport(s)} />
            ))}
          </View>
        </Section>

        <Section label="Spot">
          <View style={styles.wrapRow}>
            {VENUES.map((v) => (
              <Pressable
                key={v.id}
                onPress={() => selectVenue(v.id)}
                style={({ pressed }) => [
                  styles.venueChip,
                  venueId === v.id && styles.venueChipSelected,
                  pressedStyle(pressed),
                ]}
              >
                <Text style={venueId === v.id ? styles.venueTextSelected : styles.venueText}>
                  {v.name}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.hint}>Or drop a pin for a custom spot</Text>
          <View style={styles.mapWrap}>
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
                  pinColor={colors.success}
                />
              )}
            </MapView>
          </View>
          {pin && (
            <TextInput
              style={styles.input}
              placeholder="Name this spot (e.g. Behind Van Leer)"
              placeholderTextColor={colors.textFaint}
              value={spotName}
              onChangeText={setSpotName}
            />
          )}
        </Section>

        <Section label="Start time">
          <Pressable
            style={({ pressed }) => [styles.input, styles.timeInput, pressedStyle(pressed)]}
            onPress={() => setShowPicker(true)}
          >
            <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
            <Text style={styles.timeText}>{startTime.toLocaleString()}</Text>
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
        </Section>

        <Section label="Details">
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
        </Section>

        <Pressable
          style={({ pressed }) => [styles.submit, pressedStyle(pressed)]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={colors.primaryText} />
          ) : (
            <Text style={styles.submitText}>Create game</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
    </View>
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
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <Pressable
          style={({ pressed }) => [styles.stepperButton, pressedStyle(pressed)]}
          onPress={() => onChange(Math.max(min, value - step))}
        >
          <Ionicons name="remove" size={18} color={colors.text} />
        </Pressable>
        <Text style={styles.stepperValue}>{value}</Text>
        <Pressable
          style={({ pressed }) => [styles.stepperButton, pressedStyle(pressed)]}
          onPress={() => onChange(Math.min(max, value + step))}
        >
          <Ionicons name="add" size={18} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: 60, backgroundColor: colors.bg },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontWeight: '700',
    fontSize: 13,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: spacing.sm,
  },
  hint: { color: colors.textMuted, fontSize: 13, marginTop: spacing.md, marginBottom: spacing.xs },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  venueChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  venueChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  venueText: { fontSize: 13, color: colors.text },
  venueTextSelected: { fontSize: 13, color: colors.primaryText },
  mapWrap: { borderRadius: radius.md, overflow: 'hidden' },
  map: { height: 160 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  timeInput: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  timeText: { fontSize: 15, color: colors.text },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  stepperLabel: { color: colors.text, fontSize: 15 },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepperButton: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: { fontSize: 16, fontWeight: '700', minWidth: 32, textAlign: 'center', color: colors.text },
  submit: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: 16,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  submitText: { color: colors.primaryText, fontWeight: '700', fontSize: 16 },
});
