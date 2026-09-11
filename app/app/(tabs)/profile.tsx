import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { signOut } from 'firebase/auth';
import { auth } from '../../src/lib/firebase';
import { useAuth } from '../../src/context/AuthContext';
import { useProfileStats } from '../../src/lib/useProfileStats';

export default function Profile() {
  const { user } = useAuth();
  const { stats } = useProfileStats(user?.uid);

  return (
    <View style={styles.container}>
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
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.joined}</Text>
          <Text style={styles.statLabel}>Joined</Text>
        </View>
      </View>

      <Pressable style={styles.signOut} onPress={() => signOut(auth)}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', paddingTop: 60, gap: 6 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1b1b1b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  name: { fontSize: 20, fontWeight: '700' },
  email: { color: '#666' },
  statsRow: { flexDirection: 'row', gap: 32, marginTop: 24 },
  statBox: { alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { color: '#666', fontSize: 13 },
  signOut: {
    marginTop: 40,
    borderWidth: 1,
    borderColor: '#e11d48',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  signOutText: { color: '#e11d48', fontWeight: '700' },
});
