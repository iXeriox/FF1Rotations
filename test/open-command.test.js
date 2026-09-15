import assert from 'node:assert/strict';
import test from 'node:test';
import open from '../src/commands/open.js';

const createInteraction = () => ({
  guildId: 'guild',
  guild: { id: 'guild' },
  memberPermissions: { has: () => true },
  deferReply: async () => {},
});

test('open removes previous leader roles and clears the leader cache', async () => {
  const state = { waitingOpen: false, leaders: ['leader'] };
  const interaction = createInteraction();
  interaction.editReply = async (message) => { interaction.response = message; };
  let cleared;
  await open.execute(interaction, {
    store: {
      get: () => structuredClone(state),
      update: async (guildId, updater) => updater(state),
    },
    rotationUi: {
      clearLeaderRoles: async (guild, leaders) => { cleared = [guild, leaders]; },
      refreshWaiting: async () => {},
    },
    botStatus: { refresh: async () => {} },
  });

  assert.deepEqual(cleared, [interaction.guild, ['leader']]);
  assert.deepEqual(state.leaders, []);
  assert.equal(state.waitingOpen, true);
  assert.match(interaction.response, /can rejoin/);
});

test('open does not clear leaders from an already active cycle', async () => {
  const state = { waitingOpen: true, leaders: ['leader'] };
  const interaction = createInteraction();
  interaction.editReply = async (message) => { interaction.response = message; };
  await open.execute(interaction, {
    store: { get: () => structuredClone(state), update: async () => assert.fail('must not update') },
    rotationUi: { clearLeaderRoles: async () => assert.fail('must not clear roles') },
  });

  assert.deepEqual(state.leaders, ['leader']);
  assert.equal(interaction.response, 'The waiting list is already open.');
});
