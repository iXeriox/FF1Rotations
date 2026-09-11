/** Register the local command definitions every time the bot starts. */
export async function syncCommands(client, commands, guildId) {
  const definitions = commands.map((command) => command.data.toJSON());
  const names = definitions.map(({ name }) => name);
  if (new Set(names).size !== names.length) throw new Error('Duplicate local slash-command names detected.');

  // Guild commands appear immediately. Remove legacy global registrations first,
  // otherwise Discord can show both global and guild copies of the same command.
  await client.application.commands.set([]);

  if (guildId) {
    const guild = await client.guilds.fetch(guildId);
    await guild.commands.set(definitions);
    return `Synced ${definitions.length} commands to ${guild.name}.`;
  }

  const guilds = [...client.guilds.cache.values()];
  await Promise.all(guilds.map((guild) => guild.commands.set(definitions)));
  return `Synced ${definitions.length} commands to ${guilds.length} guild${guilds.length === 1 ? '' : 's'}.`;
}
