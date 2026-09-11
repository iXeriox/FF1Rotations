import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeCallOfDutyId, setCallOfDutyId } from '../src/services/player-ids.js';

test('removes all spaces from a Call of Duty ID', () => {
  assert.deepEqual(normalizeCallOfDutyId('  iXeriox # 6447986  '), { ok: true, id: 'iXeriox#6447986' });
});

test('validates the normalized Call of Duty ID length', () => {
  assert.match(normalizeCallOfDutyId('   ').message, /between 2 and 64/i);
  assert.match(normalizeCallOfDutyId('x'.repeat(65)).message, /between 2 and 64/i);
  assert.match(normalizeCallOfDutyId('@everyone').message, /only letters/i);
});

test('adds and updates a user ID without affecting other users', () => {
  const state = { callOfDutyIds: { other: 'Other#1' } };
  assert.equal(setCallOfDutyId(state, 'user', 'First # 123').ok, true);
  assert.equal(setCallOfDutyId(state, 'user', 'Second#456').ok, true);
  assert.deepEqual(state.callOfDutyIds, { other: 'Other#1', user: 'Second#456' });
});
