import assert from 'node:assert/strict';
import test from 'node:test';
import { createStreamScanner } from '../src/services/stream-scanner.js';
import { addStream, normalizeStreamName, removeStream, streamUrl } from '../src/services/streams.js';

const state = () => ({ streams: {} });

test('normalizes and validates supported stream accounts', () => {
  assert.deepEqual(normalizeStreamName('TikTok', ' @FF1.Live '), {
    platform: 'tiktok', name: 'ff1.live', key: 'tiktok:ff1.live',
  });
  assert.match(normalizeStreamName('youtube', 'channel').error, /TikTok and Twitch/i);
  assert.equal(streamUrl('twitch', 'ff1'), 'https://www.twitch.tv/ff1');
});

test('adds and removes a unique stream with its notification channel', () => {
  const guild = state();
  assert.equal(addStream(guild, 'tiktok', '@creator', 'channel').ok, true);
  assert.equal(guild.streams['tiktok:creator'].channelId, 'channel');
  assert.match(addStream(guild, 'tiktok', 'creator', 'channel').message, /already/i);
  assert.equal(removeStream(guild, 'tiktok', 'creator').ok, true);
  assert.match(removeStream(guild, 'tiktok', 'creator').message, /not being monitored/i);
});

test('scanner announces only a new live transition and persists its state', async () => {
  const guildState = state();
  addStream(guildState, 'twitch', 'creator', 'channel');
  const sent = [];
  const client = {
    guilds: { cache: new Map([['guild', {}]]) },
    channels: { fetch: async () => ({ isTextBased: () => true, send: async (message) => sent.push(message) }) },
  };
  const store = {
    get: () => structuredClone(guildState),
    update: async (_guildId, updater) => updater(guildState),
  };
  const scanner = createStreamScanner(client, store, {
    twitch: async () => ({ live: true, liveId: 'stream-1', url: 'https://www.twitch.tv/creator' }),
  });

  assert.equal(await scanner.scan(), 1);
  assert.equal(await scanner.scan(), 0);
  assert.equal(sent.length, 1);
  assert.match(sent[0].content, /^@everyone .*has gone live.*https:\/\/www\.twitch\.tv\/creator/);
  assert.deepEqual(sent[0].allowedMentions, { parse: ['everyone'] });
  assert.equal(guildState.streams['twitch:creator'].isLive, true);
});
