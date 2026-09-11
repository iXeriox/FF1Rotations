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
    await replaceGuildCommands(guild, definitions);
    return `Synced ${definitions.length} commands to ${guild.name}.`;
  }

  const guilds = [...client.guilds.cache.values()];
  await Promise.all(guilds.map((guild) => replaceGuildCommands(guild, definitions)));
  return `Synced ${definitions.length} commands to ${guilds.length} guild${guilds.length === 1 ? '' : 's'}.`;
}

export async function syncCommandsWithRetry(client, commands, guildId, options = {}) {
  const attempts = options.attempts ?? 3;
  const delayMs = options.delayMs ?? 2_000;
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await syncCommands(client, commands, guildId);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }
  throw lastError;
}

async function replaceGuildCommands(guild, definitions) {
  const registered = await guild.commands.set(definitions);
  if (!registered?.has) return;
  const missing = definitions.filter(({ name }) => !registered.has(name) && !registered.some((command) => command.name === name));
  if (missing.length) throw new Error(`Discord did not register commands: ${missing.map(({ name }) => name).join(', ')}`);
}
