import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { COURT_STATUS_LABELS, type CourtReportPayload, type CourtResponse, type CourtStatus } from '../lib/courts';
import { colors, radius, spacing, pressedStyle } from '../theme';

interface Props {
  data: CourtResponse | null;
  loading: boolean;
  error: string | null;
  elapsedMs: number;
  onRefresh: () => void;
  onSubmit: (report: CourtReportPayload) => Promise<void>;
}

export function CourtStatusPanel({ data, loading, error, elapsedMs, onRefresh, onSubmit }: Props) {
  const [editing, setEditing] = useState(false);
  const [courtLabel, setCourtLabel] = useState('');
  const [status, setStatus] = useState<CourtStatus | null>(null);
  const [observedMinutesAgo, setObservedMinutesAgo] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const canSave = courtLabel.trim().length > 0 && status !== null && !saving;

  function beginReport(label = '') {
    setCourtLabel(label);
    setStatus(null);
    setObservedMinutesAgo(0);
    setEditing(true);
    setSaved(false);
    setSaveError(null);
  }

  async function submit() {
    if (!canSave || !status) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      await onSubmit({ courtLabel: courtLabel.trim(), status, observedMinutesAgo });
      setEditing(false);
      setStatus(null);
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return <View style={styles.card}>
    <Text style={styles.title}>Court updates · CRC Main Gym</Text>
    <Text style={styles.note}>Player observations of specific courts on the 4th floor. These are not reservations or official CRC updates.</Text>
    {loading && !data && <ActivityIndicator accessibilityLabel="Loading court updates" />}
    {error && <Text accessibilityRole="alert" style={styles.error}>Could not refresh court updates. Current conditions are unknown. {error}</Text>}
    {!loading && !error && data?.courts.length === 0 && <Text style={styles.body}>No reports yet. Court availability is unknown.</Text>}
    {data?.courts.map((court) => {
      const ageMs = court.ageMs + Math.max(0, elapsedMs);
      const stale = court.stale || ageMs >= data.staleAfterMinutes * 60_000;
      const age = Math.floor(ageMs / 60_000);
      return <View key={court.courtId} style={styles.report}>
        <Text style={styles.strong}>{court.courtLabel}</Text>
        <Text style={styles.body}>{stale || error ? 'Current status unknown' : COURT_STATUS_LABELS[court.status]}</Text>
        {(stale || error) && <Text style={styles.note}>Last reported: {COURT_STATUS_LABELS[court.status]}{stale ? ' · Out of date' : ' · Unverified'}</Text>}
        <Text style={styles.note}>Observed {age === 0 ? 'less than a minute' : `${age} min`} ago · {new Date(court.observedAt).toLocaleString()}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Update ${court.courtLabel}`} disabled={saving} onPress={() => beginReport(court.courtLabel)}><Text style={styles.link}>Update this court</Text></Pressable>
      </View>;
    })}
    <Text style={styles.note}>Reports become out of date after {data?.staleAfterMinutes ?? 30} minutes. Unlisted courts have no reports.</Text>
    <View style={styles.row}>
      <Pressable accessibilityRole="button" onPress={onRefresh} disabled={loading} style={styles.chip}><Text style={styles.body}>{loading ? 'Refreshing…' : 'Refresh'}</Text></Pressable>
      {!editing && <Pressable accessibilityRole="button" onPress={() => beginReport()} style={styles.chip}><Text style={styles.body}>Report what you saw</Text></Pressable>}
    </View>
    {saved && <Text accessibilityRole="alert" style={styles.body}>Report saved. The most recent observation is shown for each court.</Text>}
    {editing && <View style={styles.form}>
      <Text style={styles.strong}>Which court?</Text>
      <Text style={styles.note}>Use the posted court number or a clear landmark. Reuse an existing court label when possible.</Text>
      <TextInput accessibilityLabel="Court number or landmark" placeholder="e.g. Court 2" placeholderTextColor={colors.textMuted} value={courtLabel} onChangeText={setCourtLabel} editable={!saving} maxLength={40} style={styles.input} />
      <Text style={styles.strong}>What did you see?</Text>
      <View style={styles.row}>{(Object.keys(COURT_STATUS_LABELS) as CourtStatus[]).map((value) => <Pressable
        key={value} accessibilityRole="radio" aria-checked={status === value} accessibilityState={{ checked: status === value, disabled: saving }}
        disabled={saving} onPress={() => setStatus(value)} style={[styles.chip, status === value && styles.selected]}>
        <Text style={status === value ? styles.selectedText : styles.body}>{COURT_STATUS_LABELS[value]}</Text>
      </Pressable>)}</View>
      <Text style={styles.strong}>When did you observe it?</Text>
      <View style={styles.row}>{[0, 5, 15, 30, 60, 120].map((minutes) => <Pressable
        key={minutes} accessibilityRole="radio" aria-checked={observedMinutesAgo === minutes} accessibilityState={{ checked: observedMinutesAgo === minutes, disabled: saving }}
        disabled={saving} onPress={() => setObservedMinutesAgo(minutes)} style={[styles.chip, observedMinutesAgo === minutes && styles.selected]}>
        <Text style={observedMinutesAgo === minutes ? styles.selectedText : styles.body}>{minutes === 0 ? 'Just now' : `${minutes} min ago`}</Text>
      </Pressable>)}</View>
      <Text style={styles.note}>Only submit what you personally observed. An available court may fill before you arrive.</Text>
      {saveError && <Text accessibilityRole="alert" style={styles.error}>{saveError}</Text>}
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: !canSave }} disabled={!canSave}
        onPress={submit} style={({ pressed }) => [styles.save, !canSave && styles.disabled, pressedStyle(pressed)]}>
        <Text style={styles.selectedText}>{saving ? 'Saving…' : 'Save court report'}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" disabled={saving} onPress={() => { setEditing(false); setSaveError(null); }}><Text style={styles.link}>Cancel</Text></Pressable>
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  strong: { fontWeight: '700', color: colors.text, fontSize: 14 },
  body: { color: colors.text, fontSize: 14 },
  note: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  error: { color: colors.danger, fontSize: 14 },
  report: { gap: spacing.xs, borderTopWidth: 1, borderColor: colors.border, paddingTop: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { padding: spacing.sm, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.sm },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  selectedText: { color: colors.primaryText, fontWeight: '600', fontSize: 14 },
  link: { color: colors.accent, paddingVertical: spacing.sm, fontSize: 14 },
  form: { gap: spacing.sm, marginTop: spacing.sm },
  input: { borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.sm, padding: spacing.md, color: colors.text, fontSize: 14 },
  save: { backgroundColor: colors.primary, padding: spacing.md, borderRadius: radius.sm, alignItems: 'center' },
  disabled: { opacity: 0.45 },
});
