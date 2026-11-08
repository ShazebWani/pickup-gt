// Sprint 4 court label A/B test.
// Variant A is the Sprint 3 court card; Variant B is the new wording.
// Assignment is a stable hash of the uid so a player always sees the same
// card. Moderated sessions override it on the device (Profile > Testing).

export const LABEL_VARIANTS = ['A', 'B'] as const;
export type LabelVariant = (typeof LABEL_VARIANTS)[number];

// Where a report was started from: B's button on a stale or empty card,
// the "Update this court" link on a court row, or the general report button.
export const REPORT_TRIGGERS = ['cta', 'row', 'menu'] as const;
export type ReportTrigger = (typeof REPORT_TRIGGERS)[number];

// "session" reports come from moderated test sessions on fixture data. They
// are kept for analysis but never change the live court status.
export const REPORT_CONTEXTS = ['live', 'session'] as const;
export type ReportContext = (typeof REPORT_CONTEXTS)[number];

// 32-bit FNV-1a. Deterministic and well spread for Firebase uids.
export function variantFor(uid: string): LabelVariant {
  let hash = 0x811c9dc5;
  for (let i = 0; i < uid.length; i++) {
    hash ^= uid.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash % 2 === 0 ? 'A' : 'B';
}
