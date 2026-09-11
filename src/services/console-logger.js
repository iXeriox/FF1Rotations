function context(interaction) {
  const subcommand = interaction.isChatInputCommand()
    ? interaction.options.getSubcommand(false)
    : null;
  const action = interaction.isChatInputCommand()
    ? `/${interaction.commandName}${subcommand ? ` ${subcommand}` : ''}`
    : `button:${interaction.customId}`;
  return `pid=${process.pid} interaction=${interaction.id ?? 'unknown'} action="${action}" user=${interaction.user.id} guild=${interaction.guildId ?? 'dm'} channel=${interaction.channelId ?? 'unknown'}`;
}

export function createConsoleLogger(output = console, now = () => new Date()) {
  const prefix = (level) => `[${now().toISOString()}] [${level}]`;
  return {
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
  };
}
