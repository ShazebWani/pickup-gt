import React, { useCallback, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '../lib/api';
import type { CourtResponse } from '../lib/courts';
import { CourtStatusPanel } from './CourtStatusPanel';

export function CourtStatusCard() {
  const [data, setData] = useState<CourtResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const refresh = useRef<() => Promise<void>>(async () => {});

  useFocusEffect(useCallback(() => {
    let active = true;
    let generation = 0;
    let receivedAt = Date.now();
    let inFlight = false;
    const load = async () => {
      const requestId = ++generation;
      inFlight = true;
      setLoading(true);
      try {
        const result = await api.courtStatuses();
        if (!active || requestId !== generation) return;
        receivedAt = Date.now();
        setData(result); setElapsedMs(0); setError(null);
      } catch (err) {
        if (active && requestId === generation) {
          setError(err instanceof Error ? err.message : 'Try again.');
        }
      } finally {
        if (active && requestId === generation) { inFlight = false; setLoading(false); }
      }
    };
    refresh.current = load;
    // Clear the previous focus's snapshot so an offline return cannot make it
    // look fresh. The server supplies report age, independent of device clock.
    setData(null);
    void load();
    const timer = setInterval(() => {
      if (AppState.currentState !== 'active') return;
      setElapsedMs(Math.max(0, Date.now() - receivedAt));
      if (!inFlight) void load();
    }, 15_000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setElapsedMs(Math.max(0, Date.now() - receivedAt));
        void load();
      }
    });
    return () => {
      active = false;
      refresh.current = async () => {};
      clearInterval(timer);
      subscription.remove();
    };
  }, []));

  return <CourtStatusPanel data={data} loading={loading} error={error} elapsedMs={elapsedMs}
    onRefresh={() => { void refresh.current(); }}
    onSubmit={async (report) => {
      await api.reportCourt(report);
      // A failed refresh is distinct from a failed save; don't invite duplicate
      // submissions after the server has already persisted the report.
      await refresh.current();
    }} />;
}
