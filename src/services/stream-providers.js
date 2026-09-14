import { streamUrl } from './streams.js';

const browserHeaders = {
  accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36',
};

export function parseTikTokRoom(payload) {
  const data = payload?.data ?? payload;
  const user = data?.user ?? data?.liveRoom?.user;
  const room = data?.liveRoom ?? data?.live_room ?? data?.roomInfo;
  const roomId = room?.roomId ?? room?.room_id ?? user?.roomId ?? user?.room_id ?? null;
  const status = user?.status ?? room?.status ?? data?.status;
  if (status === undefined || status === null) return null;
  return { live: Number(status) === 2 && Boolean(roomId), liveId: Number(status) === 2 ? String(roomId) : null };
}

export function parseTikTokLiveHtml(html) {
  const roomId = html.match(/(?:"roomId"|"room_id")\s*:\s*"?(\d+)"?/)?.[1]
    ?? html.match(/(?:\\"roomId\\"|\\"room_id\\")\s*:\s*\\"(\d+)\\"/)?.[1]
    ?? null;
  const live = /"status"\s*:\s*2\b/.test(html) || /\\"status\\"\s*:\s*2\b/.test(html);
  return { live: live && Boolean(roomId), liveId: live && roomId ? roomId : null };
}

export async function checkTikTok(name, request = fetch) {
  const url = streamUrl('tiktok', name);
  const endpoint = `https://www.tiktok.com/api-live/user/room/?aid=1988&uniqueId=${encodeURIComponent(name)}`;
  let endpointError;
  try {
    const response = await request(endpoint, {
      headers: { ...browserHeaders, referer: `https://www.tiktok.com/@${encodeURIComponent(name)}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`room endpoint returned HTTP ${response.status}`);
    const parsed = parseTikTokRoom(await response.json());
    if (parsed) return { ...parsed, url };
  } catch (error) {
    endpointError = error;
  }

  try {
    const response = await request(url, { headers: browserHeaders, signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`live page returned HTTP ${response.status}`);
    return { ...parseTikTokLiveHtml(await response.text()), url };
  } catch (error) {
    throw new Error(`TikTok checks failed: ${endpointError?.message ?? 'room endpoint was unrecognised'}; ${error.message}`);
  }
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
