const PROVIDERS = new Set(['tiktok', 'twitch']);

export function normalizeStreamName(platform, name) {
  const normalizedPlatform = platform.toLowerCase();
  const normalizedName = name.trim().replace(/^@/, '').toLowerCase();
  if (!PROVIDERS.has(normalizedPlatform)) return { error: 'Supported platforms are TikTok and Twitch.' };
  if (!/^[a-z0-9_.-]{2,50}$/.test(normalizedName)) return { error: 'Enter a valid TikTok or Twitch username.' };
  return { platform: normalizedPlatform, name: normalizedName, key: `${normalizedPlatform}:${normalizedName}` };
}

export function addStream(state, platform, name, channelId = null) {
  const normalized = normalizeStreamName(platform, name);
  if (normalized.error) return { ok: false, message: normalized.error };
  if (state.streams[normalized.key]) return { ok: false, message: 'That stream is already being monitored.' };
  state.streams[normalized.key] = {
    platform: normalized.platform,
    name: normalized.name,
    channelId: channelId ?? null,
    isLive: false,
    liveId: null,
  };
  return { ok: true, stream: state.streams[normalized.key], key: normalized.key };
}

export function setStreamChannel(state, platform, name, channelId) {
  const normalized = normalizeStreamName(platform, name);
  if (normalized.error) return { ok: false, message: normalized.error };
  const stream = state.streams[normalized.key];
  if (!stream) return { ok: false, message: 'That stream is not being monitored.' };
  stream.channelId = channelId ?? null;
  return { ok: true, stream };
}

export function setDefaultStreamChannel(state, channelId) {
  const previousChannelId = state.streamNotificationChannelId;
  state.streamNotificationChannelId = channelId;
  // Before per-stream routing existed, every entry copied the then-current
  // default. Convert those legacy copies back to inherited routes.
  for (const stream of Object.values(state.streams)) {
    if (stream.channelId === previousChannelId) stream.channelId = null;
  }
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
