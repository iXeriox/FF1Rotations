import assert from 'node:assert/strict';
import test from 'node:test';
import dev, { DEVELOPER_USER_ID } from '../src/commands/dev.js';

test('registers all private development subcommands without admin permissions', () => {
  const command = dev.data.toJSON();
  assert.equal(command.name, 'dev');
  assert.equal(command.default_member_permissions, undefined);
  assert.deepEqual(command.options.map(({ name }) => name), [
    'reset-join-rotations', 'clear-waiting', 'clear-grouping', 'close',
    'open', 'add-mock-user', 'add-mock-leader', 'group', 'clear-leaders',
  ]);
});

test('rejects anyone other than the configured developer before deferring', async () => {
  let response;
  await dev.execute({
    guildId: 'guild',
    user: { id: `${DEVELOPER_USER_ID}0` },
    reply: async (value) => { response = value; },
  }, {});
  assert.deepEqual(response, {
    content: 'This command is restricted to the bot developer.',
    ephemeral: true,
  });
});

test('developer close clears roles and resets all active rotation state', async () => {
  const state = {
    players: ['player'],
    playerQueuedAt: { player: 123 },
    leaders: ['leader'],
    waitingOpen: true,
    lastGroups: [['leader', 'player']],
    mockUsers: { player: { displayName: 'Mock Player' } },
  };
  const calls = [];
  let reply;
  await dev.execute({
    guildId: 'guild',
    guild: { id: 'guild' },
    user: { id: DEVELOPER_USER_ID },
    options: { getSubcommand: () => 'close' },
    deferReply: async (options) => calls.push(['defer', options]),
    editReply: async (message) => { reply = message; },
  }, {
    store: { update: async (guildId, updater) => {
      assert.equal(guildId, 'guild');
      return updater(state);
    } },
    rotationUi: {
      clearAllLeaderRoles: async () => calls.push(['clear-roles']),
      refreshWaiting: async () => calls.push(['refresh-waiting']),
      resetGroups: async () => calls.push(['reset-groups']),
    },
    botStatus: { refresh: async () => calls.push(['refresh-status']) },
  });

  assert.deepEqual(state, {
    players: [], playerQueuedAt: {}, leaders: [], waitingOpen: false,
    lastGroups: [], lobbyCodes: {}, mockUsers: {},
  });
  assert.ok(calls.some(([name]) => name === 'clear-roles'));
  assert.ok(calls.some(([name]) => name === 'reset-groups'));
  assert.equal(reply, 'Rotation closed and reset. All Rotation Leader assignments were cleared.');
});

test('developer clear-grouping clears group data and recreates the grouping chat', async () => {
  const state = {
    lastGroups: [['leader', 'player']],
    lobbyCodes: { leader: 'JOIN123' },
  };
  let resetCalls = 0;
  const interaction = {
    guildId: 'guild',
    guild: { id: 'guild' },
    user: { id: DEVELOPER_USER_ID },
    options: { getSubcommand: () => 'clear-grouping' },
    deferReply: async () => {},
    editReply: async (message) => { interaction.reply = message; },
  };
  await dev.execute(interaction, {
    store: { update: async (guildId, updater) => updater(state) },
    rotationUi: { resetGroups: async () => { resetCalls += 1; } },
  });

  assert.deepEqual(state, { lastGroups: [], lobbyCodes: {} });
  assert.equal(resetCalls, 1);
  assert.equal(interaction.reply, 'The grouping chat was cleared and its default embed was reposted.');
});
