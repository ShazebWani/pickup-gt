import assert from 'node:assert/strict';
import { test } from 'node:test';
import { variantFor } from '../src/services/experiment';
import { parseReport } from '../src/services/courtReports';

const base = { courtLabel: 'Court 2', status: 'available', observedMinutesAgo: 5 };

test('variant assignment is stable and splits users across A and B', () => {
  assert.equal(variantFor('abc123'), variantFor('abc123'));
  const counts = { A: 0, B: 0 };
  for (let i = 0; i < 1000; i++) counts[variantFor(`user-${i}-x9`)]++;
  assert.ok(counts.A > 400 && counts.B > 400, JSON.stringify(counts));
});

test('Sprint 3 report bodies still parse, as live reports with no variant', () => {
  assert.deepEqual(parseReport(base), { ...base, variant: null, trigger: null, context: 'live' });
});

test('Sprint 4 fields parse when valid', () => {
  assert.deepEqual(parseReport({ ...base, variant: 'B', trigger: 'cta', context: 'session' }),
    { ...base, variant: 'B', trigger: 'cta', context: 'session' });
});

test('invalid Sprint 4 fields are rejected', () => {
  assert.equal(parseReport({ ...base, variant: 'C' }), null);
  assert.equal(parseReport({ ...base, trigger: 'push' }), null);
  assert.equal(parseReport({ ...base, context: 'demo' }), null);
});
