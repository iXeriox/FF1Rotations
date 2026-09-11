import assert from 'node:assert/strict';
import test from 'node:test';
import { announceCallOfDutyId } from '../src/services/player-id-announcements.js';

const user = {
  id: 'user-id',
  username: 'User',
  displayName: 'Display User',
  displayAvatarURL: () => 'https://cdn.example/avatar.png',
  toString: () => '<@user-id>',
};

test('posts a member mention and Activision ID in the configured channel', async () => {
  let fetchedId;
  let sent;
  const client = { channels: { fetch: async (channelId) => {
    fetchedId = channelId;
    return { isTextBased: () => true, send: async (message) => { sent = message; } };
  } } };

  assert.equal(await announceCallOfDutyId(client, '1530580498265538600', user, 'iXeriox#6447986'), true);
  assert.equal(fetchedId, '1530580498265538600');
  assert.equal(sent.content, '<@user-id>');
  assert.deepEqual(sent.allowedMentions, { users: ['user-id'] });
  assert.match(sent.embeds[0].toJSON().fields[0].value, /iXeriox#6447986/);
});

test('reports an unavailable announcement channel without throwing', async () => {
  const client = { channels: { fetch: async () => null } };
  assert.equal(await announceCallOfDutyId(client, 'missing', user, 'User#1'), false);
});
