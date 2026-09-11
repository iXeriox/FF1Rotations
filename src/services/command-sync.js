/** Register the local command definitions every time the bot starts. */
export async function syncCommands(client, commands, guildId) {
  const definitions = commands.map((command) => command.data.toJSON());

  if (guildId) {
    const guild = await client.guilds.fetch(guildId);
    await guild.commands.set(definitions);
    return `Synced ${definitions.length} commands to ${guild.name}.`;
  }

  const guilds = [...client.guilds.cache.values()];
  await Promise.all(guilds.map((guild) => guild.commands.set(definitions)));
  return `Synced ${definitions.length} commands to ${guilds.length} guild${guilds.length === 1 ? '' : 's'}.`;
}
