import { streamUrl } from './streams.js';

export async function checkTikTok(name) {
  const url = streamUrl('tiktok', name);
  const response = await fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; FF1Rotations/1.0)' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`TikTok returned HTTP ${response.status}`);
  const html = await response.text();
  const roomId = html.match(/"roomId":"?(\d+)"?/)?.[1] ?? null;
  const live = /"status":2(?:,|})/.test(html) && Boolean(roomId);
  return { live, liveId: live ? roomId : null, url };
}

export function createTwitchProvider(clientId, clientSecret) {
  let token;
  let expiresAt = 0;
  let tokenRequest;

  async function getToken() {
    if (token && Date.now() < expiresAt) return token;
    if (tokenRequest) return tokenRequest;
    if (!clientId || !clientSecret) throw new Error('TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET are not configured');
    tokenRequest = (async () => {
      const response = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&grant_type=client_credentials`, {
        method: 'POST', signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) throw new Error(`Twitch authentication returned HTTP ${response.status}`);
      const body = await response.json();
      token = body.access_token;
      expiresAt = Date.now() + Math.max(0, body.expires_in - 60) * 1000;
      return token;
    })();
    try {
      return await tokenRequest;
    } finally {
      tokenRequest = null;
    }
  }

  return async function checkTwitch(name) {
    const accessToken = await getToken();
    const response = await fetch(`https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(name)}`, {
      headers: { Authorization: `Bearer ${accessToken}`, 'Client-Id': clientId },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Twitch returned HTTP ${response.status}`);
    const stream = (await response.json()).data[0];
    return { live: Boolean(stream), liveId: stream?.id ?? null, url: streamUrl('twitch', name) };
  };
}
