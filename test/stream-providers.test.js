import assert from 'node:assert/strict';
import test from 'node:test';
import { checkTikTok, parseTikTokLiveHtml, parseTikTokRoom } from '../src/services/stream-providers.js';

test('parses current TikTok room endpoint live and offline responses', () => {
  assert.deepEqual(parseTikTokRoom({ data: { user: { status: 2 }, liveRoom: { roomId: '12345' } } }), {
    live: true, liveId: '12345',
  });
  assert.deepEqual(parseTikTokRoom({ data: { user: { status: 4 }, liveRoom: { roomId: '12345' } } }), {
    live: false, liveId: null,
  });
  assert.equal(parseTikTokRoom({ data: {} }), null);
});

test('parses spaced and escaped TikTok live-page hydration data', () => {
  assert.deepEqual(parseTikTokLiveHtml('{"liveRoom":{"roomId": "987"},"user":{"status": 2}}'), {
    live: true, liveId: '987',
  });
  assert.deepEqual(parseTikTokLiveHtml('{\\"room_id\\":\\"654\\",\\"status\\":2}'), {
    live: true, liveId: '654',
  });
});

test('TikTok provider falls back to live-page data when the room endpoint changes', async () => {
  const requested = [];
  const request = async (url) => {
    requested.push(url);
    if (url.includes('api-live')) return { ok: true, json: async () => ({ unexpected: true }) };
    return { ok: true, text: async () => '{"roomId":"2468","status":2}' };
  };

  assert.deepEqual(await checkTikTok('itsvixenplays', request), {
    live: true,
    liveId: '2468',
    url: 'https://www.tiktok.com/@itsvixenplays/live',
  });
  assert.equal(requested.length, 2);
});
