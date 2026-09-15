import assert from 'node:assert/strict';
import test from 'node:test';
import stream from '../src/commands/stream.js';

test('a member without Manage Server can add a stream to the server monitor', async () => {
  const state = { streamNotificationChannelId: 'alerts', streams: {} };
  let scannedGuild;
  const interaction = {
    guildId: 'guild',
    memberPermissions: { has: () => false },
    options: {
      getSubcommand: () => 'add',
      getString: (name) => (name === 'platform' ? 'twitch' : 'creator'),
      getChannel: () => null,
    },
    reply: async (response) => { interaction.response = response; },
  };
  await stream.execute(interaction, {
    store: {
      get: () => structuredClone(state),
      update: async (guildId, updater) => updater(state),
    },
    streamScanner: { scan: async (guildId) => { scannedGuild = guildId; } },
  });

  assert.ok(state.streams['twitch:creator']);
  assert.match(interaction.response.content, /Now monitoring/);
  await new Promise((resolve) => { setImmediate(resolve); });
  assert.equal(scannedGuild, 'guild');
});

test('members still need Manage Server for stream routing management', async () => {
  const interaction = {
    guildId: 'guild',
    memberPermissions: { has: () => false },
    options: { getSubcommand: () => 'channel' },
    reply: async (response) => { interaction.response = response; },
  };
  await stream.execute(interaction, {});
  assert.match(interaction.response.content, /Manage Server/);
});
