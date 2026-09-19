export function createStreamScanner(client, store, providers, logger = {}) {
  let running = false;

  async function scan(targetGuildId) {
    if (running) {
      logger.streamScanSkipped?.();
      return 0;
    }
    running = true;
    const startedAt = performance.now();
    let notifications = 0;
    let checks = [];
    try {
      const guildIds = targetGuildId ? [targetGuildId] : [...client.guilds.cache.keys()];
      for (const guildId of guildIds) {
        if (!client.guilds.cache.has(guildId)) continue;
        const state = store.get(guildId);
        for (const [key, stream] of Object.entries(state.streams)) {
          checks.push(checkStream(guildId, key, {
            ...stream,
            channelId: stream.channelId ?? state.streamNotificationChannelId,
          }));
        }
      }
      logger.streamScanStarted?.(guildIds.length, checks.length);
      const results = await Promise.allSettled(checks);
      notifications = results.reduce((total, result) => total + (result.status === 'fulfilled' ? result.value : 0), 0);
    } finally {
      running = false;
      logger.streamScanCompleted?.(checks.length, notifications, performance.now() - startedAt);
    }
    return notifications;
  }

  async function checkStream(guildId, key, stream) {
    const startedAt = performance.now();
    try {
      const provider = providers[stream.platform];
      if (!provider) throw new Error(`No stream provider configured for ${stream.platform}`);
      const result = await provider(stream.name);
      logger.streamChecked?.({
        guildId, platform: stream.platform, name: stream.name, live: result.live, durationMs: performance.now() - startedAt,
      });
      // Twitch can occasionally report an active stream as offline for a single
      // check. It can also return different identifiers depending on whether the
      // API or public-page fallback answered. Only a confirmed offline-to-live
      // transition should produce another alert.
      const newlyLive = result.live && !stream.isLive;
      if (newlyLive) {
        const guild = client.guilds.cache.get(guildId);
        const channel = guild?.channels.cache.get(stream.channelId)
          ?? await guild?.channels.fetch(stream.channelId).catch(() => null);
        if (!channel?.isTextBased()) throw new Error(`Notification channel ${stream.channelId} is unavailable in this server`);
        await channel.send({
          content: `@everyone **${stream.name}** has gone live, Go watch the stream here: ${result.url}`,
          allowedMentions: { parse: ['everyone'] },
        });
        logger.streamAlerted?.({ guildId, platform: stream.platform, name: stream.name, channelId: stream.channelId });
      }
      await store.update(guildId, (state) => {
        const latest = state.streams[key];
        if (!latest) return;
        if (stream.platform === 'twitch' && !result.live && latest.isLive) {
          latest.consecutiveOfflineChecks = (latest.consecutiveOfflineChecks ?? 0) + 1;
          if (latest.consecutiveOfflineChecks >= 3) {
            latest.isLive = false;
            latest.liveId = null;
          }
        } else {
          latest.isLive = result.live;
          latest.liveId = result.liveId;
          latest.consecutiveOfflineChecks = 0;
        }
        latest.lastCheckedAt = Math.floor(Date.now() / 1000);
      });
      return newlyLive ? 1 : 0;
    } catch (error) {
      logger.streamCheckFailed?.({ guildId, platform: stream.platform, name: stream.name, error });
      throw error;
    }
  }

  return { scan };
}
