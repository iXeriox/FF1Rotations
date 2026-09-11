import { REST, Routes } from 'discord.js';
import { commands } from './commands/index.js';
import { getConfig } from './config.js';

const config = getConfig({ requireClientId: true });
const rest = new REST().setToken(config.token);
const body = commands.map((command) => command.data.toJSON());
const names = body.map(({ name }) => name);
if (new Set(names).size !== names.length) throw new Error('Duplicate local slash-command names detected.');
const route = config.guildId
  ? Routes.applicationGuildCommands(config.clientId, config.guildId)
  : Routes.applicationCommands(config.clientId);

// A guild deployment must remove legacy global copies first or Discord shows
// both versions of each slash command in the configured server.
if (config.guildId) await rest.put(Routes.applicationCommands(config.clientId), { body: [] });
await rest.put(route, { body });
console.log(`Deployed ${body.length} commands ${config.guildId ? `to guild ${config.guildId}` : 'globally'}: ${names.map((name) => `/${name}`).join(', ')}.`);
