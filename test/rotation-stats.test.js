import assert from 'node:assert/strict';
import test from 'node:test';
import { commendTeammate, getUserStats, recordRotation } from '../src/services/rotation-stats.js';

const state = () => ({ rounds: 0, lastGroups: [], commendationsBy: [], userStats: {} });

test('records participation and the latest rotation time', () => {
  const rotation = state();
  recordRotation(rotation, [['leader', 'one'], ['other-leader', 'two']], 123456);

  assert.equal(rotation.rounds, 1);
  assert.deepEqual(getUserStats(rotation, 'one'), {
    commendations: 0,
    rotations: 1,
    lastRotationAt: 123456,
  });
});

test('allows one commendation per giver for a teammate', () => {
  const rotation = state();
  recordRotation(rotation, [['leader', 'one', 'two']], 123456);

  assert.deepEqual(commendTeammate(rotation, 'one', 'two'), { ok: true });
  assert.equal(getUserStats(rotation, 'two').commendations, 1);
  assert.match(commendTeammate(rotation, 'one', 'leader').message, /already used/i);
});

test('rejects self, non-participant, and opposing-team commendations', () => {
  const rotation = state();
  recordRotation(rotation, [['leader', 'one'], ['other-leader', 'two']], 123456);

  assert.match(commendTeammate(rotation, 'one', 'one').message, /yourself/i);
  assert.match(commendTeammate(rotation, 'spectator', 'one').message, /not part/i);
  assert.match(commendTeammate(rotation, 'one', 'two').message, /your team/i);
  assert.equal(getUserStats(rotation, 'two').commendations, 0);
});

test('starts a fresh commendation allowance on the next rotation', () => {
  const rotation = state();
  recordRotation(rotation, [['leader', 'one']], 100);
  assert.equal(commendTeammate(rotation, 'one', 'leader').ok, true);

  recordRotation(rotation, [['leader', 'one']], 200);
  assert.equal(commendTeammate(rotation, 'one', 'leader').ok, true);
  assert.equal(getUserStats(rotation, 'leader').commendations, 2);
  assert.equal(getUserStats(rotation, 'one').rotations, 2);
});
