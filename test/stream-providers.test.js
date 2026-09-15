import assert from 'node:assert/strict';
import test from 'node:test';
import {
  checkTikTok, createTwitchProvider, parseTikTokLiveHtml, parseTikTokRoom, parseTwitchLiveHtml,
} from '../src/services/stream-providers.js';

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

test('parses Twitch live and offline status from public structured page data', () => {
  const page = (live) => `<html><script type="application/ld+json">${JSON.stringify({
    '@type': 'VideoObject',
    publication: { '@type': 'BroadcastEvent', isLiveBroadcast: live, startDate: '2026-09-14T12:00:00Z' },
  })}</script></html>`;
  assert.deepEqual(parseTwitchLiveHtml(page(true)), {
    live: true, liveId: '2026-09-14T12:00:00Z',
  });
  assert.deepEqual(parseTwitchLiveHtml(page(false)), { live: false, liveId: null });
  assert.deepEqual(parseTwitchLiveHtml('<html>No live broadcast metadata</html>'), {
    live: false, liveId: null,
  });
});

test('checks a Twitch public page without API credentials or identifiers', async () => {
  const requested = [];
  const request = async (url) => {
    requested.push(url);
    return {
      ok: true,
      text: async () => '<script type="application/ld+json">{"isLiveBroadcast":true}</script>',
    };
  };
  const provider = createTwitchProvider(undefined, undefined, request);

  assert.deepEqual(await provider('itsvixenplays'), {
    live: true, liveId: null, url: 'https://www.twitch.tv/itsvixenplays',
  });
  assert.deepEqual(requested, ['https://www.twitch.tv/itsvixenplays']);
});
