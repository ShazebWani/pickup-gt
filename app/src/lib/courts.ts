export const COURT_VENUE_ID = 'crc-main-gym';
export const COURT_STATUS_LABELS = {
  available: 'Available for play', busy: 'In use',
  reserved: 'Reserved / other activity', closed: 'Closed',
} as const;
export type CourtStatus = keyof typeof COURT_STATUS_LABELS;
export interface CourtReportPayload {
  courtLabel: string;
  status: CourtStatus;
  observedMinutesAgo: number;
}
export interface CourtSnapshot {
  courtId: string;
  courtLabel: string;
  status: CourtStatus;
  observedAt: string;
  submittedAt: string;
  ageMs: number;
  stale: boolean;
}
export interface CourtResponse {
  venueId: string;
  staleAfterMinutes: number;
  courts: CourtSnapshot[];
}
