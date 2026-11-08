// Sprint 4 data export for the court label A/B test.
// Writes events.csv and court_reports.csv with the A/B fields as their own
// columns (ready to import into the raw data Sheet) and prints counts by variant.
//
// Run from server/:  npm run export:s4 -- --since=2026-11-09 --exclude=uidA,uidB
//   --since    only count activity on or after this date (skip earlier dev data)
//   --exclude  comma-separated uids to leave out (team accounts used for setup)
//   --out      output folder (default ./sprint4-export)
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { db } from '../services/firestore';

type Row = Record<string, string | number | boolean | null>;

function arg(name: string, fallback = ''): string {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function toDate(v: any): Date | null {
  if (!v) return null;
  if (typeof v.toDate === 'function') return v.toDate();
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function csv(rows: Row[], cols: string[]): string {
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n');
}

const EVENT_COLS = ['timestamp', 'uid', 'name', 'type', 'gameId', 'variant', 'context',
  'state', 'trigger', 'courtLabel', 'status', 'observedMinutesAgo', 'otherMetadata'];
const REPORT_COLS = ['submittedAt', 'observedAt', 'uid', 'name', 'source', 'variant', 'trigger',
  'courtLabel', 'status', 'minutesBetweenObservedAndSubmitted', 'id'];
const AB_KEYS = new Set(['variant', 'context', 'state', 'trigger', 'courtLabel', 'status', 'observedMinutesAgo']);

async function main() {
  const since = arg('since') ? new Date(arg('since')) : new Date(0);
  const exclude = new Set(arg('exclude').split(',').map((s) => s.trim()).filter(Boolean));
  const outDir = path.resolve(arg('out', 'sprint4-export'));
  fs.mkdirSync(outDir, { recursive: true });
  const keep = (uid: unknown, when: Date | null) =>
    typeof uid === 'string' && !exclude.has(uid) && !!when && when >= since;

  const users = new Map<string, string>();
  (await db.collection('users').get()).forEach((d) => users.set(d.id, (d.data().displayName as string) ?? ''));

  const events: Row[] = [];
  (await db.collection('events').get()).forEach((d) => {
    const e = d.data();
    const when = toDate(e.timestamp);
    if (!keep(e.uid, when)) return;
    const m = (e.metadata ?? {}) as Record<string, string | number>;
    const other = Object.fromEntries(Object.entries(m).filter(([k]) => !AB_KEYS.has(k)));
    events.push({
      timestamp: when!.toISOString(), uid: e.uid, name: users.get(e.uid) ?? '', type: e.type,
      gameId: e.gameId ?? '', variant: m.variant ?? '', context: m.context ?? '', state: m.state ?? '',
      trigger: m.trigger ?? '', courtLabel: m.courtLabel ?? '', status: m.status ?? '',
      observedMinutesAgo: m.observedMinutesAgo ?? '',
      otherMetadata: Object.keys(other).length ? JSON.stringify(other) : '',
    });
  });
  events.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));

  const reports: Row[] = [];
  (await db.collection('courtReports').get()).forEach((d) => {
    const r = d.data();
    const submitted = toDate(r.submittedAt);
    if (!keep(r.uid, submitted)) return;
    const observed = toDate(r.observedAt);
    reports.push({
      submittedAt: submitted!.toISOString(), observedAt: observed ? observed.toISOString() : '',
      uid: r.uid, name: users.get(r.uid) ?? '', source: r.source ?? '', variant: r.variant ?? '',
      trigger: r.trigger ?? '', courtLabel: r.courtLabel ?? '', status: r.status ?? '',
      minutesBetweenObservedAndSubmitted: observed ? Math.round((submitted!.getTime() - observed.getTime()) / 60000) : '',
      id: d.id,
    });
  });
  reports.sort((a, b) => String(a.submittedAt).localeCompare(String(b.submittedAt)));

  fs.writeFileSync(path.join(outDir, 'events.csv'), csv(events, EVENT_COLS));
  fs.writeFileSync(path.join(outDir, 'court_reports.csv'), csv(reports, REPORT_COLS));

  // Counts by variant for the notebook's results table.
  const byVariant = (v: string) => {
    const ev = events.filter((e) => e.variant === v);
    const rp = reports.filter((r) => r.variant === v);
    const count = (pred: (e: Row) => boolean) => ev.filter(pred).length;
    return {
      variant: v,
      players: new Set(ev.map((e) => e.uid)).size,
      cardViewsFresh: count((e) => e.type === 'court_card_viewed' && e.state === 'fresh'),
      cardViewsStale: count((e) => e.type === 'court_card_viewed' && e.state === 'stale'),
      cardViewsNone: count((e) => e.type === 'court_card_viewed' && e.state === 'none'),
      updateTapsFromCardButton: count((e) => e.type === 'court_update_tapped' && e.trigger === 'cta'),
      updateTapsFromRow: count((e) => e.type === 'court_update_tapped' && e.trigger === 'row'),
      updateTapsFromMenu: count((e) => e.type === 'court_update_tapped' && e.trigger === 'menu'),
      sessionReports: rp.filter((r) => r.source === 'session').length,
      liveReports: rp.filter((r) => r.source === 'player').length,
    };
  };
  const summary = [byVariant('A'), byVariant('B')];
  fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify({ since: since.toISOString(), summary }, null, 2));

  console.log(`Wrote events.csv, court_reports.csv and summary.json to ${outDir}\n`);
  console.table(summary);
  console.log('\nReports (check status and observation age against the session scenario):');
  console.table(reports.map(({ uid, id, ...r }) => r));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
