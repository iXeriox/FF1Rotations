import assert from 'node:assert/strict';
import test from 'node:test';
import { generateAndPublishGroups } from '../src/commands/group.js';

test('simultaneous group requests publish only one rotation', async () => {
  const state = {
    players: ['player'], leaders: ['leader'], pairCounts: {}, playerQueuedAt: {},
    waitingOpen: true, rounds: 0, lastGroups: [], lobbyCodes: {},
    commendationsBy: [], userStats: {},
  };
  let releasePublish;
  const publishGate = new Promise((resolve) => { releasePublish = resolve; });
  let published = 0;
  let roleReplacement;
  const dependencies = {
    store: {
      get: () => structuredClone(state),
      update: async (guildId, updater) => updater(state),
    },
    rotationUi: {
      replaceLeaderRoles: async (guild, previous, next) => {
        roleReplacement = [guild, previous, next];
      },
      publishGroups: async () => {
        published += 1;
        await publishGate;
      },
      refreshWaiting: async () => {},
    },
    botStatus: { refresh: async () => {} },
  };
  const interaction = (name) => ({
    guildId: 'guild', guild: { id: 'guild' },
    editReply: async (message) => { interaction[name] = message; },
  });

  const first = generateAndPublishGroups(interaction('first'), dependencies);
  const second = generateAndPublishGroups(interaction('second'), dependencies);
  await new Promise((resolve) => { setImmediate(resolve); });
  releasePublish();

  assert.equal(await first, true);
  assert.equal(await second, false);
  assert.equal(published, 1);
  assert.equal(state.rounds, 1);
  assert.deepEqual(state.leaders, ['player']);
  assert.deepEqual(roleReplacement, [{ id: 'guild' }, ['leader'], ['player']]);
});
