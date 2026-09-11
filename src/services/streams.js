const PROVIDERS = new Set(['tiktok', 'twitch']);

export function normalizeStreamName(platform, name) {
  const normalizedPlatform = platform.toLowerCase();
  const normalizedName = name.trim().replace(/^@/, '').toLowerCase();
  if (!PROVIDERS.has(normalizedPlatform)) return { error: 'Supported platforms are TikTok and Twitch.' };
  if (!/^[a-z0-9_.-]{2,50}$/.test(normalizedName)) return { error: 'Enter a valid TikTok or Twitch username.' };
  return { platform: normalizedPlatform, name: normalizedName, key: `${normalizedPlatform}:${normalizedName}` };
}

export function addStream(state, platform, name, channelId) {
  const normalized = normalizeStreamName(platform, name);
  if (normalized.error) return { ok: false, message: normalized.error };
  if (state.streams[normalized.key]) return { ok: false, message: 'That stream is already being monitored.' };
  state.streams[normalized.key] = {
    platform: normalized.platform,
    name: normalized.name,
    channelId,
    isLive: false,
    liveId: null,
  };
  return { ok: true, stream: state.streams[normalized.key], key: normalized.key };
}

export function removeStream(state, platform, name) {
  const normalized = normalizeStreamName(platform, name);
  if (normalized.error) return { ok: false, message: normalized.error };
  if (!state.streams[normalized.key]) return { ok: false, message: 'That stream is not being monitored.' };
  delete state.streams[normalized.key];
  return { ok: true };
}

export const streamUrl = (platform, name) => platform === 'tiktok'
  ? `https://www.tiktok.com/@${name}/live`
  : `https://www.twitch.tv/${name}`;
