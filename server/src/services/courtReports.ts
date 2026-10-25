import { Timestamp, type Firestore } from 'firebase-admin/firestore';

export const COURT_VENUE_ID = 'crc-main-gym';
export const STALE_AFTER_MINUTES = 30;
export const COURT_STATUSES = ['available', 'busy', 'reserved', 'closed'] as const;
export type CourtStatus = (typeof COURT_STATUSES)[number];
export interface ReportInput {
  courtLabel: string;
  status: CourtStatus;
  observedMinutesAgo: number;
}

export function parseReport(body: unknown): ReportInput | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const b = body as Record<string, unknown>;
  if (typeof b.courtLabel !== 'string' || typeof b.status !== 'string') return null;
  const courtLabel = b.courtLabel.trim().replace(/\s+/g, ' ');
  if (!courtLabel || courtLabel.length > 40 || /[\p{Cc}\p{Cf}]/u.test(courtLabel)) return null;
  if (!COURT_STATUSES.includes(b.status as CourtStatus)) return null;
  if (typeof b.observedMinutesAgo !== 'number' ||
      !Number.isInteger(b.observedMinutesAgo) || b.observedMinutesAgo < 0 || b.observedMinutesAgo > 120) return null;
  return { courtLabel, status: b.status as CourtStatus, observedMinutesAgo: b.observedMinutesAgo };
}

// Court identity comes from the posted number / clear landmark the reporter
// selects. Case and whitespace variations must not create separate courts.
export function courtIdFor(venueId: string, courtLabel: string): string {
  return encodeURIComponent(`${venueId}:${courtLabel.trim().replace(/\s+/g, ' ').toLowerCase()}`);
}

export async function saveCourtReport(db: Firestore, uid: string, input: ReportInput, now = Date.now()) {
  const courtId = courtIdFor(COURT_VENUE_ID, input.courtLabel);
  const reportRef = db.collection('courtReports').doc();
  const latestRef = db.collection('courtStatuses').doc(courtId);
  const eventRef = db.collection('events').doc();
  const report = {
    id: reportRef.id, courtId, venueId: COURT_VENUE_ID,
    courtLabel: input.courtLabel, status: input.status, uid,
    observedAt: Timestamp.fromMillis(now - input.observedMinutesAgo * 60_000),
    submittedAt: Timestamp.fromMillis(now), source: 'player',
  };
  // History, latest status and tracking succeed together. A late submission
  // about an older observation must not overwrite a more recent observation.
  await db.runTransaction(async (tx) => {
    const latest = await tx.get(latestRef);
    tx.create(reportRef, report);
    tx.create(eventRef, {
      uid, type: 'court_reported', gameId: null, timestamp: report.submittedAt,
      metadata: { reportId: report.id, courtId, venueId: report.venueId,
        status: report.status, observedMinutesAgo: input.observedMinutesAgo },
    });
    if (!latest.exists || latest.data()!.observedAt.toMillis() <= report.observedAt.toMillis()) {
      tx.set(latestRef, report);
    }
  });
  return { id: report.id, courtId };
}

export async function readCourtStatuses(db: Firestore, now = Date.now()) {
  const snapshot = await db.collection('courtStatuses').where('venueId', '==', COURT_VENUE_ID).get();
  const courts = snapshot.docs.map((doc) => {
    const r = doc.data();
    const ageMs = Math.max(0, now - r.observedAt.toMillis());
    // Reporter identities are retained for the authorized export, not sent
    // to other players. Staleness is computed on every read, never stored.
    return {
      courtId: doc.id, courtLabel: r.courtLabel, status: r.status,
      observedAt: r.observedAt.toDate().toISOString(),
      submittedAt: r.submittedAt.toDate().toISOString(),
      ageMs, stale: ageMs >= STALE_AFTER_MINUTES * 60_000,
    };
  }).sort((a, b) => a.courtLabel.localeCompare(b.courtLabel, undefined, { numeric: true }));
  return { venueId: COURT_VENUE_ID, staleAfterMinutes: STALE_AFTER_MINUTES, courts };
}
