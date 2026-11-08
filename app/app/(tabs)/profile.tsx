import React from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { signOut } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../src/lib/firebase';
import { useAuth } from '../../src/context/AuthContext';
import { useProfileStats } from '../../src/lib/useProfileStats';
import {
  setSessionMode, setVariantOverride, useLabelExperiment,
  type LabelVariant, type SessionMode,
} from '../../src/lib/experiment';
import { colors, radius, spacing, pressedStyle } from '../../src/theme';

export default function Profile() {
  const { user } = useAuth();
  const { stats } = useProfileStats(user?.uid);
  const experiment = useLabelExperiment();

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {(user?.displayName ?? '?').charAt(0).toUpperCase()}
        </Text>
      </View>
      <Text style={styles.name}>{user?.displayName ?? 'Player'}</Text>
      <Text style={styles.email}>{user?.email}</Text>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.hosted}</Text>
          <Text style={styles.statLabel}>Hosted</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.joined}</Text>
          <Text style={styles.statLabel}>Joined</Text>
        </View>
      </View>

      {/* Sprint 4 moderated sessions: set the court card variant and show the
          fixed session screens. Stays on this device only. */}
      <View style={styles.testing}>
        <Text style={styles.testingTitle}>Testing</Text>
        <Text style={styles.testingNote}>
          Court card: {experiment.variant}{experiment.override ? ' (set here)' : ' (assigned)'}
        </Text>
        <View style={styles.chipRow}>
          {([null, 'A', 'B'] as (LabelVariant | null)[]).map((v) => {
            const on = experiment.override === v;
            return <Pressable key={v ?? 'auto'} accessibilityRole="radio" accessibilityState={{ checked: on }}
              onPress={() => { void setVariantOverride(v); }} style={[styles.chip, on && styles.chipOn]}>
              <Text style={on ? styles.chipOnText : styles.chipText}>{v ? `Variant ${v}` : `Assigned (${experiment.assigned})`}</Text>
            </Pressable>;
          })}
        </View>
        <Text style={styles.testingNote}>Session screens (CRC Main Gym games)</Text>
        <View style={styles.chipRow}>
          {([['off', 'Live data'], ['reports', 'Fresh + stale courts'], ['empty', 'No reports']] as [SessionMode, string][]).map(([m, label]) => {
            const on = experiment.sessionMode === m;
            return <Pressable key={m} accessibilityRole="radio" accessibilityState={{ checked: on }}
              onPress={() => { void setSessionMode(m); }} style={[styles.chip, on && styles.chipOn]}>
              <Text style={on ? styles.chipOnText : styles.chipText}>{label}</Text>
            </Pressable>;
          })}
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [styles.signOut, pressedStyle(pressed)]}
        onPress={() => signOut(auth)}
      >
        <Ionicons name="log-out-outline" size={18} color={colors.danger} />
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  container: { alignItems: 'center', paddingTop: spacing.xxl, paddingBottom: spacing.xxl, gap: 6 },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: { color: colors.primaryText, fontSize: 28, fontWeight: '700' },
  name: { fontSize: 20, fontWeight: '700', color: colors.text },
  email: { color: colors.textMuted },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    marginTop: spacing.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
  },
  statBox: { alignItems: 'center', minWidth: 64 },
  statDivider: { width: 1, height: 32, backgroundColor: colors.border },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.text },
  statLabel: { color: colors.textMuted, fontSize: 13 },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  signOutText: { color: colors.danger, fontWeight: '700' },
  testing: {
    alignSelf: 'stretch',
    marginTop: spacing.xl,
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },
  testingTitle: { fontWeight: '700', color: colors.text },
  testingNote: { color: colors.textMuted, fontSize: 13 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.sm },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 13 },
  chipOnText: { color: colors.primaryText, fontSize: 13, fontWeight: '600' },
});
