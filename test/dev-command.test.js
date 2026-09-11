import assert from 'node:assert/strict';
import test from 'node:test';
import dev, { DEVELOPER_USER_ID } from '../src/commands/dev.js';

const interactionFor = (userId, action, group = null) => {
  const replies = [];
  return {
    replies,
    guildId: 'guild',
    guild: { id: 'guild' },
    user: { id: userId },
    options: { getSubcommand: () => action, getSubcommandGroup: () => group },
    reply: async (value) => { replies.push(value); },
    deferReply: async (value) => { replies.push(value); },
    editReply: async (value) => { replies.push(value); },
  };
};

test('/dev is rejected for every other user', async () => {
  const interaction = interactionFor('someone-else', 'open');
  await dev.execute(interaction, {});
  assert.match(interaction.replies[0].content, /restricted/i);
  assert.equal(interaction.replies[0].ephemeral, true);
});

test('/dev add randomuser creates a named mock queue entry', async () => {
  const state = { waitingOpen: true, players: [], leaders: [], playerQueuedAt: {}, lastGroups: [], mockUsers: {} };
  const interaction = interactionFor(DEVELOPER_USER_ID, 'randomuser', 'add');
  const store = { update: async (_guildId, updater) => updater(state) };
  let refreshed = false;

  await dev.execute(interaction, {
    store,
    rotationUi: { refreshWaiting: async () => { refreshed = true; } },
    botStatus: {},
  });

  assert.equal(state.players.length, 1);
  assert.equal(state.leaders.length, 0);
  assert.match(state.players[0], /^mock:/);
  assert.ok(state.mockUsers[state.players[0]]);
  assert.equal(refreshed, true);
});

test('/dev add randomleader creates a named mock leader', async () => {
  const state = { waitingOpen: true, players: [], leaders: [], playerQueuedAt: {}, lastGroups: [], mockUsers: {} };
  const interaction = interactionFor(DEVELOPER_USER_ID, 'randomleader', 'add');
  const store = { update: async (_guildId, updater) => updater(state) };

  await dev.execute(interaction, {
    store,
    rotationUi: { refreshWaiting: async () => {} },
    botStatus: {},
  });

  assert.equal(state.leaders.length, 1);
  assert.equal(state.players.length, 0);
  assert.match(state.leaders[0], /^mock:/);
  assert.ok(state.mockUsers[state.leaders[0]]);
});

test('/dev reset join-rotation rebuilds the managed queue page', async () => {
  const interaction = interactionFor(DEVELOPER_USER_ID, 'join-rotation', 'reset');
  let resetGuild;
  await dev.execute(interaction, {
    store: {},
    rotationUi: { resetJoinChannel: async (guild) => { resetGuild = guild; return 3; } },
    botStatus: {},
  });
  assert.equal(resetGuild, interaction.guild);
  assert.match(interaction.replies.at(-1), /clearing 3 messages/i);
});

test('/dev clear-grouping rebuilds the grouping placeholder', async () => {
  const interaction = interactionFor(DEVELOPER_USER_ID, 'clear-grouping');
  let resetGuild;
  await dev.execute(interaction, {
    store: {},
    rotationUi: { resetGroupingChannel: async (guild) => { resetGuild = guild; return 2; } },
    botStatus: {},
  });
  assert.equal(resetGuild, interaction.guild);
  assert.match(interaction.replies.at(-1), /clearing 2 messages/i);
});

test('/dev open changes and refreshes the waiting list', async () => {
  const state = { waitingOpen: false, players: [], leaders: [], playerQueuedAt: {}, lastGroups: [] };
  const interaction = interactionFor(DEVELOPER_USER_ID, 'open');
  let refreshed = false;
  let statusRefreshed = false;
  const store = {
    update: async (_guildId, updater) => updater(state),
  };
  const rotationUi = { refreshWaiting: async () => { refreshed = true; } };
  const botStatus = { refresh: async () => { statusRefreshed = true; } };

  await dev.execute(interaction, { store, rotationUi, botStatus });

  assert.equal(state.waitingOpen, true);
  assert.equal(refreshed, true);
  assert.equal(statusRefreshed, true);
  assert.equal(interaction.replies.at(-1), 'The waiting list is now open.');
});

test('/dev clear-leaders reports role removal failures', async () => {
  const state = { waitingOpen: true, players: [], leaders: ['leader'], playerQueuedAt: {}, lastGroups: [] };
  const interaction = interactionFor(DEVELOPER_USER_ID, 'clear-leaders');
  const store = {
    get: () => structuredClone(state),
    update: async (_guildId, updater) => updater(state),
  };
  const rotationUi = {
    clearLeaderRolesDetailed: async () => ({ removed: [], failed: [{ id: 'leader', error: 'Missing Permissions' }] }),
    refreshWaiting: async () => {},
  };

  await dev.execute(interaction, { store, rotationUi, botStatus: {} });

  assert.deepEqual(state.leaders, []);
  assert.match(interaction.replies.at(-1), /could not remove.*<@leader>/is);
});
