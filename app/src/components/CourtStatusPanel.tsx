import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  COURT_STATUS_LABELS, type CourtReportPayload, type CourtResponse, type CourtStatus,
  type ReportContext, type ReportTrigger,
} from '../lib/courts';
import { logEvent } from '../lib/events';
import type { LabelVariant } from '../lib/experiment';
import { colors, radius, spacing, pressedStyle } from '../theme';

interface Props {
  data: CourtResponse | null;
  loading: boolean;
  error: string | null;
  elapsedMs: number;
  // Sprint 4 A/B test. A is the Sprint 3 card; B is the new wording.
  variant: LabelVariant;
  context: ReportContext;
  onRefresh: () => void;
  onSubmit: (report: CourtReportPayload) => Promise<void>;
}

type CardState = 'fresh' | 'stale' | 'none';

function ageText(minutes: number) {
  return minutes === 0 ? 'less than a minute' : `${minutes} min`;
}

export function CourtStatusPanel({ data, loading, error, elapsedMs, variant, context, onRefresh, onSubmit }: Props) {
  const [editing, setEditing] = useState(false);
  const [courtLabel, setCourtLabel] = useState('');
  const [status, setStatus] = useState<CourtStatus | null>(null);
  const [observedMinutesAgo, setObservedMinutesAgo] = useState(0);
  const [trigger, setTrigger] = useState<ReportTrigger>('menu');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const canSave = courtLabel.trim().length > 0 && status !== null && !saving;
  const isB = variant === 'B';

  // Log each court state a player sees once per screen, so the export can
  // compare what A and B players were shown.
  const logged = useRef(new Set<string>());
  useEffect(() => { logged.current = new Set(); }, [variant, context]);
  useEffect(() => {
    if (!data || error) return;
    const seen: { key: string; state: CardState; label?: string }[] = data.courts.length === 0
      ? [{ key: 'none', state: 'none' }]
      : data.courts.map((court) => {
        const stale = court.stale || court.ageMs + Math.max(0, elapsedMs) >= data.staleAfterMinutes * 60_000;
        return { key: `${court.courtId}:${stale ? 'stale' : 'fresh'}`, state: stale ? 'stale' : 'fresh', label: court.courtLabel };
      });
    for (const s of seen) {
      if (logged.current.has(s.key)) continue;
      logged.current.add(s.key);
      void logEvent('court_card_viewed', null, {
        variant, context, state: s.state, ...(s.label ? { courtLabel: s.label } : {}),
      });
    }
  }, [data, error, elapsedMs, variant, context]);

  function beginReport(label: string, from: ReportTrigger, state: CardState | 'any') {
    void logEvent('court_update_tapped', null, { variant, context, trigger: from, state });
    setCourtLabel(label);
    setStatus(null);
    setObservedMinutesAgo(0);
    setTrigger(from);
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
      await onSubmit({ courtLabel: courtLabel.trim(), status, observedMinutesAgo, variant, trigger, context });
      setEditing(false);
      setStatus(null);
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const empty = !loading && !error && data?.courts.length === 0;

  return <View style={styles.card}>
    <Text style={styles.title}>Court updates · CRC Main Gym</Text>
    <Text style={styles.note}>Player observations of specific courts on the 4th floor. These are not reservations or official CRC updates.</Text>
    {loading && !data && <ActivityIndicator accessibilityLabel="Loading court updates" />}
    {error && <Text accessibilityRole="alert" style={styles.error}>Could not refresh court updates. Current conditions are unknown. {error}</Text>}

    {empty && !isB && <Text style={styles.body}>No reports yet. Court availability is unknown.</Text>}
    {empty && isB && <View style={styles.report}>
      <View style={styles.stateRow}><View style={[styles.dot, styles.dotGrey]} /><Text style={styles.stateTitle}>No recent information</Text></View>
      <Text style={styles.body}>Nobody has reported a court here today.</Text>
      <Pressable accessibilityRole="button" disabled={saving} onPress={() => beginReport('', 'cta', 'none')}
        style={({ pressed }) => [styles.cta, pressedStyle(pressed)]}><Text style={styles.selectedText}>Be the first to report</Text></Pressable>
    </View>}

    {data?.courts.map((court) => {
      const ageMs = court.ageMs + Math.max(0, elapsedMs);
      const stale = court.stale || ageMs >= data.staleAfterMinutes * 60_000;
      const age = Math.floor(ageMs / 60_000);
      const label = COURT_STATUS_LABELS[court.status];

      if (!isB) {
        return <View key={court.courtId} style={styles.report}>
          <Text style={styles.strong}>{court.courtLabel}</Text>
          <Text style={styles.body}>{stale || error ? 'Current status unknown' : label}</Text>
          {(stale || error) && <Text style={styles.note}>Last reported: {label}{stale ? ' · Out of date' : ' · Unverified'}</Text>}
          <Text style={styles.note}>Observed {ageText(age)} ago · {new Date(court.observedAt).toLocaleString()}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={`Update ${court.courtLabel}`} disabled={saving} onPress={() => beginReport(court.courtLabel, 'row', stale ? 'stale' : 'fresh')}><Text style={styles.link}>Update this court</Text></Pressable>
        </View>;
      }

      const unknown = stale || !!error;
      return <View key={court.courtId} style={styles.report}>
        <Text style={styles.courtCap}>{court.courtLabel.toUpperCase()}</Text>
        <View style={styles.stateRow}>
          <View style={[styles.dot, unknown ? styles.dotGrey : court.status === 'available' ? styles.dotGreen : styles.dotAmber]} />
          <Text style={styles.stateTitle}>{unknown ? 'No recent information' : `${label}, ${age === 0 ? 'just now' : `${age} min ago`}`}</Text>
        </View>
        {unknown
          ? <Text style={styles.body}>Last seen: {label.toLowerCase()}, {ageText(age)} ago. It may have changed.</Text>
          : <>
            <Text style={styles.body}>Seen by a player at the court.</Text>
            <Text style={styles.note}>Courts can fill up after a report. This is not a reservation.</Text>
          </>}
        {unknown
          ? <Pressable accessibilityRole="button" accessibilityLabel={`Update ${court.courtLabel}`} disabled={saving} onPress={() => beginReport(court.courtLabel, 'cta', 'stale')}
            style={({ pressed }) => [styles.cta, pressedStyle(pressed)]}><Text style={styles.selectedText}>Update court status</Text></Pressable>
          : <Pressable accessibilityRole="button" accessibilityLabel={`Update ${court.courtLabel}`} disabled={saving} onPress={() => beginReport(court.courtLabel, 'row', 'fresh')}><Text style={styles.link}>Update this court</Text></Pressable>}
      </View>;
    })}

    <Text style={styles.note}>Reports become out of date after {data?.staleAfterMinutes ?? 30} minutes. Unlisted courts have no reports.</Text>
    <View style={styles.row}>
      <Pressable accessibilityRole="button" onPress={onRefresh} disabled={loading} style={styles.chip}><Text style={styles.body}>{loading ? 'Refreshing…' : 'Refresh'}</Text></Pressable>
      {!editing && <Pressable accessibilityRole="button" onPress={() => beginReport('', 'menu', 'any')} style={styles.chip}><Text style={styles.body}>Report what you saw</Text></Pressable>}
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
  // Variant B
  courtCap: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  stateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stateTitle: { fontSize: 16, fontWeight: '700', color: colors.text, flexShrink: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotGreen: { backgroundColor: colors.success },
  dotAmber: { backgroundColor: '#d4791c' },
  dotGrey: { backgroundColor: colors.textFaint },
  cta: { alignSelf: 'flex-start', backgroundColor: colors.primary, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.sm, marginTop: spacing.xs },
});
