import assert from 'node:assert/strict';
import test from 'node:test';
import { joinWaitingList } from '../src/services/waiting-list.js';

const state = (overrides = {}) => ({ waitingOpen: false, players: [], leaders: [], ...overrides });

test('rejects signups while the waiting list is closed', () => {
  const rotation = state();
  assert.match(joinWaitingList(rotation, 'player').message, /closed/i);
  assert.deepEqual(rotation.players, []);
});

test('adds a player once while the waiting list is open', () => {
  const rotation = state({ waitingOpen: true });
  assert.equal(joinWaitingList(rotation, 'player').ok, true);
  assert.match(joinWaitingList(rotation, 'player').message, /already/i);
  assert.deepEqual(rotation.players, ['player']);
});

test('does not add leaders to the player waiting list', () => {
  const rotation = state({ waitingOpen: true, leaders: ['leader'] });
  assert.match(joinWaitingList(rotation, 'leader').message, /leader/i);
  assert.deepEqual(rotation.players, []);
});
