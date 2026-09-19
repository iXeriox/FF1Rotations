function context(interaction) {
  const subcommand = interaction.isChatInputCommand()
    ? interaction.options.getSubcommand(false)
    : null;
  const action = interaction.isChatInputCommand()
    ? `/${interaction.commandName}${subcommand ? ` ${subcommand}` : ''}`
    : `button:${interaction.customId}`;
  return `action="${action}" user=${interaction.user.id} guild=${interaction.guildId ?? 'dm'} channel=${interaction.channelId ?? 'unknown'}`;
}

export function createConsoleLogger(output = console, now = () => new Date()) {
  const prefix = (level) => `[${now().toISOString()}] [${level}]`;
  const singleLine = (value) => String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
  let warnedAboutMissingContent = false;
  return {
    chatMessage(message) {
      const chatName = singleLine(message.channel?.name) || message.channelId || 'unknown';
      const userName = singleLine(message.member?.displayName ?? message.author?.username)
        || message.author?.id
        || 'unknown';
      const content = singleLine(message.content) || '[no text content]';
      output.info(`${now().toISOString()} [${chatName}] - <${userName}> ${content}`);
      if (!message.content && !warnedAboutMissingContent) {
        warnedAboutMissingContent = true;
        output.warn?.(`${prefix('CHAT')} Message text is unavailable. Enable the Message Content Intent in the Discord Developer Portal.`);
      }
    },
    interactionStarted(interaction) {
      output.info(`${prefix('INTERACTION')} started ${context(interaction)}`);
    },
    interactionCompleted(interaction, durationMs) {
      output.info(`${prefix('INTERACTION')} completed ${context(interaction)} duration_ms=${Math.round(durationMs)}`);
    },
    interactionFailed(interaction, durationMs, error) {
      output.error(`${prefix('INTERACTION')} failed ${context(interaction)} duration_ms=${Math.round(durationMs)} error="${error?.message ?? error}"`);
    },
    system(message) {
      output.info(`${prefix('SYSTEM')} ${message}`);
    },
    streamScanStarted(guilds, streams) {
      output.info(`${prefix('STREAM')} scan_started guilds=${guilds} streams=${streams}`);
    },
    streamChecked({ guildId, platform, name, live, durationMs }) {
      output.info(`${prefix('STREAM')} checked guild=${guildId} platform=${platform} name=${name} live=${live} duration_ms=${Math.round(durationMs)}`);
    },
    streamAlerted({ guildId, platform, name, channelId }) {
      output.info(`${prefix('STREAM')} alert_sent guild=${guildId} platform=${platform} name=${name} channel=${channelId}`);
    },
    streamCheckFailed({ guildId, platform, name, error }) {
      output.error(`${prefix('STREAM')} check_failed guild=${guildId} platform=${platform} name=${name} error="${error?.message ?? error}"`);
    },
    streamScanCompleted(streams, notifications, durationMs) {
      output.info(`${prefix('STREAM')} scan_completed streams=${streams} alerts=${notifications} duration_ms=${Math.round(durationMs)}`);
    },
    streamScanSkipped() {
      output.info(`${prefix('STREAM')} scan_skipped reason="already running"`);
    },
  };
}
