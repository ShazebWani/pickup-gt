import React, { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { View, ActivityIndicator, Pressable, Text, AppState } from 'react-native';
import { colors } from '../src/theme';
import { logEvent } from '../src/lib/events';

// Foregrounding the app again within this window counts as the same open.
const OPEN_GAP_MS = 5 * 60 * 1000;

function useAppOpenTracking(uid: string | undefined) {
  const lastOpen = useRef(0);

  useEffect(() => {
    if (!uid) return;

    const logOpen = () => {
      const now = Date.now();
      if (now - lastOpen.current < OPEN_GAP_MS) return;
      lastOpen.current = now;
      logEvent('app_opened');
    };

    logOpen();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') logOpen();
    });
    return () => sub.remove();
  }, [uid]);
}

function RootNavigation() {
  const { user, initializing } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  useAppOpenTracking(user?.uid);

  useEffect(() => {
    if (initializing) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, initializing, segments]);

  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700', color: colors.text },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.surface },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen
        name="create"
        options={{
          headerShown: true,
          title: 'New game',
          presentation: 'modal',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Text style={{ color: colors.accent, fontSize: 16 }}>Cancel</Text>
            </Pressable>
          ),
        }}
      />
      <Stack.Screen
        name="game/[id]"
        options={{ headerShown: true, title: '' }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <RootNavigation />
    </AuthProvider>
  );
}
