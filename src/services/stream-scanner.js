export function createStreamScanner(client, store, providers) {
  let running = false;

  async function scan() {
    if (running) return 0;
    running = true;
    let notifications = 0;
    try {
      const checks = [];
      for (const guildId of client.guilds.cache.keys()) {
        const state = store.get(guildId);
        for (const [key, stream] of Object.entries(state.streams)) {
          checks.push(checkStream(guildId, key, {
            ...stream,
            channelId: state.streamNotificationChannelId ?? stream.channelId,
          }));
        }
      }
      const results = await Promise.allSettled(checks);
      notifications = results.reduce((total, result) => total + (result.status === 'fulfilled' ? result.value : 0), 0);
      for (const result of results) {
        if (result.status === 'rejected') console.error('Stream check failed:', result.reason);
      }
    } finally {
      running = false;
    }
    return notifications;
  }

  async function checkStream(guildId, key, stream) {
    const provider = providers[stream.platform];
    if (!provider) throw new Error(`No stream provider configured for ${stream.platform}`);
    const result = await provider(stream.name);
    const newlyLive = result.live && (!stream.isLive || stream.liveId !== result.liveId);
    if (newlyLive) {
      const channel = await client.channels.fetch(stream.channelId).catch(() => null);
      if (!channel?.isTextBased()) throw new Error(`Notification channel ${stream.channelId} is unavailable`);
      await channel.send({
        content: `@everyone **${stream.name}** has gone live, Go watch the stream here: ${result.url}`,
        allowedMentions: { parse: ['everyone'] },
      });
    }
    await store.update(guildId, (state) => {
      const latest = state.streams[key];
      if (!latest) return;
      latest.isLive = result.live;
      latest.liveId = result.liveId;
      latest.lastCheckedAt = Math.floor(Date.now() / 1000);
    });
    return newlyLive ? 1 : 0;
  }

  return { scan };
}
