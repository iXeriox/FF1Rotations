import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeLobbyCode, setLobbyCode } from '../src/services/lobby-codes.js';

test('normalizes safe lobby codes while preserving meaningful spaces', () => {
  assert.deepEqual(normalizeLobbyCode('  ABC   123  '), { ok: true, code: 'ABC 123' });
  assert.match(normalizeLobbyCode('@everyone').message, /only letters/i);
});

test('only the latest team leader can set that squad lobby code', () => {
  const state = { lastGroups: [['leader', 'player']], lobbyCodes: {} };
  assert.match(setLobbyCode(state, 'player', 'ABC123').message, /only a leader/i);
  assert.equal(setLobbyCode(state, 'leader', 'ABC123').ok, true);
  assert.deepEqual(state.lobbyCodes, { leader: 'ABC123' });
});

test('a leader can replace their own lobby code', () => {
  const state = { lastGroups: [['leader', 'player']], lobbyCodes: { leader: 'OLD' } };
  assert.equal(setLobbyCode(state, 'leader', 'NEW 123').ok, true);
  assert.equal(state.lobbyCodes.leader, 'NEW 123');
});
