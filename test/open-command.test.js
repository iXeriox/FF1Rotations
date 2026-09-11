import assert from 'node:assert/strict';
import test from 'node:test';
import open from '../src/commands/open.js';

test('/open removes previous leader roles and clears the leader selection', async () => {
  const state = { waitingOpen: false, leaders: ['leader-one', 'leader-two'] };
  let clearedIds;
  let response;
  const interaction = {
    guildId: 'guild',
    guild: { id: 'guild' },
    memberPermissions: { has: () => true },
    deferReply: async () => {},
    editReply: async (message) => { response = message; },
  };
  const store = {
    get: () => structuredClone(state),
    update: async (_guildId, updater) => updater(state),
  };
  const rotationUi = {
    clearLeaderRoles: async (_guild, ids) => {
      clearedIds = ids;
      return ids.length;
    },
    refreshWaiting: async () => {},
  };
  const botStatus = { refresh: async () => {} };

  await open.execute(interaction, { store, rotationUi, botStatus });
  assert.deepEqual(clearedIds, ['leader-one', 'leader-two']);
  assert.deepEqual(state, { waitingOpen: true, leaders: [] });
  assert.match(response, /removed.*2 previous leaders/i);
});
