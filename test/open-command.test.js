import assert from 'node:assert/strict';
import test from 'node:test';
import open from '../src/commands/open.js';

function createInteraction() {
  return {
    guildId: 'guild',
    guild: { id: 'guild' },
    memberPermissions: { has: () => true },
    deferReply: async () => {},
    editReply: async () => {},
  };
}

test('opening a new rotation removes old leader roles and saved leaders', async () => {
  const state = {
    waitingOpen: false,
    leaders: ['leader'],
    mockUsers: {
      leader: { displayName: 'Mock Leader' },
      player: { displayName: 'Mock Player' },
    },
  };
  let cleared;
  const commandInteraction = createInteraction();
  commandInteraction.editReply = async (message) => { commandInteraction.reply = message; };
  await open.execute(commandInteraction, {
    store: {
      get: () => structuredClone(state),
      update: async (guildId, updater) => {
        assert.equal(guildId, 'guild');
        return updater(state);
      },
    },
    rotationUi: {
      clearLeaderRoles: async (guild, ids) => { cleared = [guild, ids]; },
      refreshWaiting: async () => {},
    },
    botStatus: { refresh: async () => {} },
  });

  assert.deepEqual(cleared, [commandInteraction.guild, ['leader']]);
  assert.deepEqual(state.leaders, []);
  assert.deepEqual(state.mockUsers, { player: { displayName: 'Mock Player' } });
  assert.equal(state.waitingOpen, true);
  assert.match(commandInteraction.reply, /Previous Rotation Leaders were cleared/);
});

test('opening an already-open rotation leaves active leaders unchanged', async () => {
  const state = { waitingOpen: true, leaders: ['leader'], mockUsers: {} };
  const commandInteraction = createInteraction();
  commandInteraction.editReply = async (message) => { commandInteraction.reply = message; };
  await open.execute(commandInteraction, {
    store: {
      get: () => structuredClone(state),
      update: async () => assert.fail('state should not be updated'),
    },
    rotationUi: {
      clearLeaderRoles: async () => assert.fail('roles should not be cleared'),
    },
  });

  assert.deepEqual(state.leaders, ['leader']);
  assert.equal(commandInteraction.reply, 'The waiting list is already open.');
});
