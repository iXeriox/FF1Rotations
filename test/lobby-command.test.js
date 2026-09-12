import assert from 'node:assert/strict';
import test from 'node:test';
import lobby from '../src/commands/lobby.js';

function createInteraction(userId, code) {
  return {
    guildId: 'guild',
    guild: { id: 'guild' },
    user: { id: userId },
    options: { getString: () => code },
    deferReply: async () => {},
    editReply: async (message) => { createInteraction.reply = message; },
  };
}

test('registers lobby with one required code option', () => {
  const command = lobby.data.toJSON();
  assert.equal(command.name, 'lobby');
  assert.deepEqual(command.options.map(({ name, required }) => ({ name, required })), [
    { name: 'code', required: true },
  ]);
});

test('latest group leader can publish and update their lobby code', async () => {
  const state = { lastGroups: [['leader', 'player']], lobbyCodes: {} };
  let published;
  const interaction = createInteraction('leader', ' FAST-123 ');
  interaction.editReply = async (message) => { interaction.reply = message; };
  await lobby.execute(interaction, {
    store: { update: async (guildId, updater) => {
      assert.equal(guildId, 'guild');
      return updater(state);
    } },
    rotationUi: { publishGroups: async (guild, groups) => { published = [guild, groups]; } },
  });

  assert.equal(state.lobbyCodes.leader, 'FAST-123');
  assert.deepEqual(published, [interaction.guild, state.lastGroups]);
  assert.equal(interaction.reply, "Squad 1's lobby code is now **FAST-123**.");
});

test('players who are not a latest-group leader cannot change lobby codes', async () => {
  const state = { lastGroups: [['leader', 'player']], lobbyCodes: {} };
  const interaction = createInteraction('player', 'NOPE');
  interaction.editReply = async (message) => { interaction.reply = message; };
  await lobby.execute(interaction, {
    store: { update: async (guildId, updater) => updater(state) },
    rotationUi: { publishGroups: async () => assert.fail('groups should not be republished') },
  });

  assert.deepEqual(state.lobbyCodes, {});
  assert.match(interaction.reply, /Only a leader/);
});
