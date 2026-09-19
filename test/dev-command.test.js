import assert from 'node:assert/strict';
import test from 'node:test';
import { ChannelType, Collection } from 'discord.js';
import dev, { DEVELOPER_USER_ID } from '../src/commands/dev.js';

test('registers all private development subcommands without admin permissions', () => {
  const command = dev.data.toJSON();
  assert.equal(command.name, 'dev');
  assert.equal(command.default_member_permissions, undefined);
  assert.deepEqual(command.options.map(({ name }) => name), [
    'add-stream', 'remove-stream', 'stream-channel', 'default-stream-channel',
    'idother', 'categories', 'chats',
    'reset-join-rotations', 'clear-waiting', 'clear-grouping', 'remove-threading', 'close',
    'open', 'add-mock-user', 'add-mock-leader', 'group', 'clear-leaders',
  ]);
});

test('developer can set another member Activision ID', async () => {
  const state = {};
  const user = { id: 'member', bot: false, toString: () => '<@member>' };
  let announcement;
  const interaction = {
    guildId: 'guild', guild: {}, user: { id: DEVELOPER_USER_ID },
    options: {
      getSubcommand: () => 'idother',
      getUser: () => user,
      getString: () => 'Member # 123',
    },
    deferReply: async () => {},
    editReply: async (message) => { interaction.reply = message; },
  };

  await dev.execute(interaction, {
    store: { update: async (_guildId, updater) => updater(state) },
    playerIdAnnouncements: { send: async (...args) => { announcement = args; return true; } },
  });

  assert.equal(state.callOfDutyIds.member, 'Member#123');
  assert.deepEqual(announcement, [user, 'Member#123']);
  assert.match(interaction.reply, /<@member>.*Member#123/);
});

test('developer can list server categories and channels within a category', async () => {
  const category = { id: 'category', name: 'Games', rawPosition: 1, type: ChannelType.GuildCategory };
  const channels = new Collection([
    [category.id, category],
    ['chat', { id: 'chat', name: 'rotation-chat', parentId: category.id, rawPosition: 2, type: ChannelType.GuildText }],
    ['other', { id: 'other', name: 'other-chat', parentId: null, rawPosition: 3, type: ChannelType.GuildText }],
  ]);
  const run = async (action) => {
    const interaction = {
      guildId: 'guild', guild: { channels: { fetch: async () => channels } }, user: { id: DEVELOPER_USER_ID },
      options: { getSubcommand: () => action, getChannel: () => category },
      deferReply: async () => {},
      editReply: async (message) => { interaction.reply = message; },
    };
    await dev.execute(interaction, {});
    return interaction.reply;
  };

  assert.match(await run('categories'), /Server categories.*Games/s);
  const chatReply = await run('chats');
  assert.match(chatReply, /Channels in Games.*rotation-chat/s);
  assert.doesNotMatch(chatReply, /other-chat/);
});

test('developer can disable threading and remove existing rotation threads', async () => {
  const interaction = {
    guildId: 'guild', guild: { id: 'guild' }, user: { id: DEVELOPER_USER_ID },
    options: { getSubcommand: () => 'remove-threading' },
    deferReply: async () => {},
    editReply: async (message) => { interaction.reply = message; },
  };
  await dev.execute(interaction, {
    rotationUi: { removeThreading: async (guild) => {
      assert.equal(guild.id, 'guild');
      return 3;
    } },
  });
  assert.equal(interaction.reply, 'Threading is disabled in the rotation chats. Removed 3 existing threads.');
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

test('developer can add, reroute, and remove a server-scoped stream', async () => {
  const state = { streamNotificationChannelId: 'default-alerts', streams: {} };
  let scans = 0;
  const dependencies = {
    store: {
      get: () => structuredClone(state),
      update: async (guildId, updater) => updater(state),
    },
    streamScanner: { scan: async (guildId) => { assert.equal(guildId, 'guild'); scans += 1; } },
  };
  const run = async (action, channel) => {
    const interaction = {
      guildId: 'guild', guild: { id: 'guild' }, user: { id: DEVELOPER_USER_ID },
      options: {
        getSubcommand: () => action,
        getString: (name) => (name === 'platform' ? 'twitch' : 'creator'),
        getChannel: () => channel,
      },
      deferReply: async () => {},
      editReply: async (message) => { interaction.reply = message; },
    };
    await dev.execute(interaction, dependencies);
    return interaction.reply;
  };

  const override = { id: 'special-alerts', isTextBased: () => true };
  const newDefault = { id: 'new-default', isTextBased: () => true };
  assert.match(await run('default-stream-channel', newDefault), /new-default/);
  assert.equal(state.streamNotificationChannelId, 'new-default');
  assert.match(await run('add-stream', override), /special-alerts/);
  assert.equal(state.streams['twitch:creator'].channelId, 'special-alerts');
  assert.match(await run('stream-channel', null), /default channel/);
  assert.equal(state.streams['twitch:creator'].channelId, null);
  assert.equal(await run('remove-stream', null), 'That stream was removed.');
  assert.deepEqual(state.streams, {});
  await new Promise((resolve) => { setImmediate(resolve); });
  assert.equal(scans, 1);
});
