// Sprint 3 data export: dumps events, RSVPs, and court reports to CSV and
// prints the numbers the notebook's results table needs.
//
// Run from server/:  npm run export -- --since=2026-10-23 --exclude=uidA,uidB
//   --since    only count activity on or after this date (skip earlier dev data)
//   --exclude  comma-separated uids to leave out (team accounts)
//   --court    Firestore collection holding court reports (default courtReports)
//   --out      output folder (default ./sprint3-export)
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
  if (v instanceof Date) return v;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function iso(v: any): string {
  const d = toDate(v);
  return d ? d.toISOString() : '';
}

function csv(rows: Row[]): string {
  if (!rows.length) return '';
  const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n');
}

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

async function main() {
  const since = arg('since') ? new Date(arg('since')) : new Date(0);
  const exclude = new Set(arg('exclude').split(',').map((s) => s.trim()).filter(Boolean));
  const courtCollection = arg('court', 'courtReports');
  const outDir = path.resolve(arg('out', 'sprint3-export'));
  fs.mkdirSync(outDir, { recursive: true });

  const keep = (uid: unknown, when: Date | null) =>
    typeof uid === 'string' && !exclude.has(uid) && !!when && when >= since;

  // Names make the CSVs readable when pasted into the Sheet.
  const users = new Map<string, string>();
  (await db.collection('users').get()).forEach((d) =>
    users.set(d.id, (d.data().displayName as string) ?? '')
  );

  // Events
  const eventRows: Row[] = [];
  (await db.collection('events').get()).forEach((d) => {
    const e = d.data();
    const when = toDate(e.timestamp);
    if (!keep(e.uid, when)) return;
    eventRows.push({
      timestamp: iso(when),
      uid: e.uid,
      name: users.get(e.uid) ?? '',
      type: e.type,
      gameId: e.gameId ?? '',
      metadata: e.metadata ? JSON.stringify(e.metadata) : '',
    });
  });
  eventRows.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));

  // RSVPs: one row per player on each game, with check-in time if any
  const now = new Date();
  const rsvpRows: Row[] = [];
  (await db.collection('games').get()).forEach((d) => {
    const g = d.data();
    const start = toDate(g.startTime);
    if (!start || start < since) return;
    for (const p of g.players ?? []) {
      if (exclude.has(p.uid)) continue;
      rsvpRows.push({
        gameId: d.id,
        sport: g.sport,
        spot: g.spotName,
        startTime: iso(start),
        gameStatus: g.status,
        gameStarted: start <= now,
        uid: p.uid,
        name: p.displayName ?? users.get(p.uid) ?? '',
        joinedAt: iso(p.joinedAt),
        arrivedAt: iso(p.arrivedAt),
        arrived: !!p.arrivedAt,
      });
    }
  });

  // Court reports (collection name depends on the court update flow)
  const courtRows: Row[] = [];
  (await db.collection(courtCollection).get()).forEach((d) => {
    const r = d.data();
    const reporter = r.uid ?? r.reporterUid ?? r.userId ?? '';
    const when = toDate(r.observedAt ?? r.createdAt ?? r.timestamp);
    if (!keep(reporter, when)) return;
    const flat: Row = { id: d.id, reporter, name: users.get(reporter) ?? '' };
    for (const [k, v] of Object.entries(r)) {
      flat[k] = v && typeof (v as any).toDate === 'function' ? iso(v) : typeof v === 'object' && v !== null ? JSON.stringify(v) : (v as any);
    }
    courtRows.push(flat);
  });

  fs.writeFileSync(path.join(outDir, 'events.csv'), csv(eventRows));
  fs.writeFileSync(path.join(outDir, 'rsvps.csv'), csv(rsvpRows));
  fs.writeFileSync(path.join(outDir, 'court_reports.csv'), csv(courtRows));

  // Per-participant summary
  const people = new Map<string, Row & { _signup?: Date; _firstJoin?: Date }>();
  const person = (uid: string) => {
    if (!people.has(uid)) {
      people.set(uid, { uid, name: users.get(uid) ?? '', opens: 0, views: 0, joins: 0, leaves: 0, checkIns: 0, courtReports: 0 });
    }
    return people.get(uid)!;
  };
  for (const e of eventRows) {
    const p = person(String(e.uid));
    const when = new Date(String(e.timestamp));
    if (e.type === 'app_opened') p.opens = Number(p.opens) + 1;
    if (e.type === 'game_viewed') p.views = Number(p.views) + 1;
    if (e.type === 'game_joined') {
      p.joins = Number(p.joins) + 1;
      if (!p._firstJoin) p._firstJoin = when;
    }
    if (e.type === 'game_left') p.leaves = Number(p.leaves) + 1;
    if (e.type === 'checked_in') p.checkIns = Number(p.checkIns) + 1;
    if (e.type === 'signed_up' && !p._signup) p._signup = when;
  }
  for (const r of courtRows) person(String(r.reporter)).courtReports = Number(person(String(r.reporter)).courtReports) + 1;

  const participantRows: Row[] = [];
  const signupToJoin: number[] = [];
  for (const p of people.values()) {
    const mins =
      p._signup && p._firstJoin && p._firstJoin >= p._signup
        ? Math.round(((p._firstJoin.getTime() - p._signup.getTime()) / 60000) * 10) / 10
        : null;
    if (mins !== null) signupToJoin.push(mins);
    const { _signup, _firstJoin, ...rest } = p;
    participantRows.push({ ...rest, signedUpAt: iso(_signup), firstJoinAt: iso(_firstJoin), minutesSignupToJoin: mins });
  }
  fs.writeFileSync(path.join(outDir, 'participants.csv'), csv(participantRows));

  const startedRsvps = rsvpRows.filter((r) => r.gameStarted && r.gameStatus !== 'cancelled');
  const arrived = startedRsvps.filter((r) => r.arrived).length;
  const summary = {
    since: since.toISOString(),
    participants: participantRows.length,
    signedUpInWindow: participantRows.filter((r) => r.signedUpAt).length,
    joinedAGame: participantRows.filter((r) => Number(r.joins) > 0).length,
    medianMinutesSignupToJoin: median(signupToJoin),
    openedTwoPlusTimes: participantRows.filter((r) => Number(r.opens) >= 2).length,
    rsvpsForStartedGames: startedRsvps.length,
    rsvpsCheckedIn: arrived,
    rsvpToArrivalRate: startedRsvps.length ? Math.round((arrived / startedRsvps.length) * 100) : null,
    participantsWithCourtReport: participantRows.filter((r) => Number(r.courtReports) > 0).length,
    totalEvents: eventRows.length,
  };
  fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));

  console.log(`Wrote CSVs and summary.json to ${outDir}\n`);
  console.table(summary);
  console.log('\nPer participant:');
  console.table(participantRows.map(({ uid, ...r }) => r));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
