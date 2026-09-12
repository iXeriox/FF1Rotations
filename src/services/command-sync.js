let syncQueue = Promise.resolve();

/** Register the local command definitions every time the bot starts. */
export function syncCommands(client, commands, guildId) {
  const sync = () => performSync(client, commands, guildId);
  const pending = syncQueue.then(sync, sync);
  // A failed Discord request must not prevent a later guild-create sync.
  syncQueue = pending.catch(() => {});
  return pending;
}

async function performSync(client, commands, guildId) {
  const definitions = commands.map((command) => command.data.toJSON());
  const names = definitions.map(({ name }) => name);
  if (new Set(names).size !== names.length) throw new Error('Duplicate local slash-command names detected.');

  // Guild commands appear immediately. Remove legacy global registrations first,
  // otherwise Discord can show both global and guild copies of the same command.
  const globalCommands = await client.application.commands.fetch();
  if (globalCommands.size) await client.application.commands.set([]);

  if (guildId) {
    const guild = await client.guilds.fetch(guildId);
    await replaceGuildCommands(guild, definitions);
    return `Synced ${definitions.length} commands to ${guild.name}.`;
  }

  const guilds = [...client.guilds.cache.values()];
  await Promise.all(guilds.map((guild) => replaceGuildCommands(guild, definitions)));
  return `Synced ${definitions.length} commands to ${guilds.length} guild${guilds.length === 1 ? '' : 's'}.`;
}

async function replaceGuildCommands(guild, definitions) {
  const registered = await guild.commands.set(definitions);
  if (!registered || typeof registered[Symbol.iterator] !== 'function') return;
  const remote = registered.values ? [...registered.values()] : [...registered];
  if (!remote.length && !definitions.length) return;
  if (!remote.length) return;
  const remoteNames = remote.map(({ name }) => name);
  const missing = definitions.filter(({ name }) => !remoteNames.includes(name));
  if (missing.length) throw new Error(`Discord did not register commands: ${missing.map(({ name }) => name).join(', ')}`);
  if (new Set(remoteNames).size !== remoteNames.length || remoteNames.length !== definitions.length) {
    throw new Error('Discord returned duplicate or stale slash commands after synchronization.');
  }
}
