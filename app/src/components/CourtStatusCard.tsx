import React, { useCallback, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '../lib/api';
import { COURT_VENUE_ID, type CourtReportPayload, type CourtResponse, type CourtSnapshot } from '../lib/courts';
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

// Show a session report on the card after it saves, the way a live report
// would. Only this screen changes: the server keeps it as a session report,
// and reopening the game page starts from the fixed courts again.
function withSessionReport(data: CourtResponse, report: CourtReportPayload): CourtResponse {
  const now = Date.now();
  const observedAt = new Date(now - report.observedMinutesAgo * 60_000).toISOString();
  const key = (label: string) => label.trim().toLowerCase().replace(/\s+/g, ' ');
  const updated: CourtSnapshot = {
    courtId: `session-${key(report.courtLabel)}`, courtLabel: report.courtLabel.trim(), status: report.status,
    observedAt, submittedAt: new Date(now).toISOString(),
    ageMs: report.observedMinutesAgo * 60_000, stale: report.observedMinutesAgo >= data.staleAfterMinutes,
  };
  const i = data.courts.findIndex((c) => key(c.courtLabel) === key(report.courtLabel));
  if (i === -1) return { ...data, courts: [...data.courts, updated] };
  // Same rule as the server: an older observation doesn't replace a newer one.
  if (data.courts[i].ageMs < updated.ageMs) return data;
  const courts = [...data.courts];
  courts[i] = { ...updated, courtId: data.courts[i].courtId };
  return { ...data, courts };
}

function SessionCourtStatusCard({ mode, variant }: { mode: Exclude<SessionMode, 'off'>; variant: 'A' | 'B' }) {
  const [data, setData] = useState(() => sessionCourts(mode));
  return <CourtStatusPanel data={data} loading={false} error={null} elapsedMs={0}
    variant={variant} context="session" onRefresh={() => {}}
    onSubmit={async (report) => {
      await api.reportCourt({ ...report, context: 'session' });
      setData((d) => withSessionReport(d, report));
    }} />;
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
