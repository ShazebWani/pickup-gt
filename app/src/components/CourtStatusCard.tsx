import React, { useCallback, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '../lib/api';
import { COURT_VENUE_ID, type CourtResponse, type CourtSnapshot } from '../lib/courts';
import { useLabelExperiment, type SessionMode } from '../lib/experiment';
import { CourtStatusPanel } from './CourtStatusPanel';

// Fixed screens for moderated sessions, so every participant sees the same
// fresh and stale courts no matter when the session runs.
function sessionCourts(mode: Exclude<SessionMode, 'off'>): CourtResponse {
  const now = Date.now();
  const court = (n: number, minutesAgo: number): CourtSnapshot => ({
    courtId: `session-court-${n}`, courtLabel: `Court ${n}`, status: 'available',
    observedAt: new Date(now - minutesAgo * 60_000).toISOString(),
    submittedAt: new Date(now - minutesAgo * 60_000).toISOString(),
    ageMs: minutesAgo * 60_000, stale: minutesAgo >= 30,
  });
  return { venueId: COURT_VENUE_ID, staleAfterMinutes: 30, courts: mode === 'empty' ? [] : [court(1, 37), court(2, 12)] };
}

export function CourtStatusCard() {
  const { variant, sessionMode } = useLabelExperiment();
  if (sessionMode !== 'off') {
    return <SessionCourtStatusCard key={sessionMode} mode={sessionMode} variant={variant} />;
  }
  return <LiveCourtStatusCard variant={variant} />;
}

function SessionCourtStatusCard({ mode, variant }: { mode: Exclude<SessionMode, 'off'>; variant: 'A' | 'B' }) {
  const [data] = useState(() => sessionCourts(mode));
  return <CourtStatusPanel data={data} loading={false} error={null} elapsedMs={0}
    variant={variant} context="session" onRefresh={() => {}}
    onSubmit={async (report) => { await api.reportCourt({ ...report, context: 'session' }); }} />;
}

function LiveCourtStatusCard({ variant }: { variant: 'A' | 'B' }) {
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
    variant={variant} context="live"
    onRefresh={() => { void refresh.current(); }}
    onSubmit={async (report) => {
      await api.reportCourt(report);
      // A failed refresh is distinct from a failed save; don't invite duplicate
      // submissions after the server has already persisted the report.
      await refresh.current();
    }} />;
}
