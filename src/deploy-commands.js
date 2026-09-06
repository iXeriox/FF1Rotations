import { REST, Routes } from 'discord.js';
import { commands } from './commands/index.js';
import { getConfig } from './config.js';

const config = getConfig();
const rest = new REST().setToken(config.token);
const body = commands.map((command) => command.data.toJSON());
const route = config.guildId
  ? Routes.applicationGuildCommands(config.clientId, config.guildId)
  : Routes.applicationCommands(config.clientId);

await rest.put(route, { body });
console.log(`Deployed ${body.length} commands ${config.guildId ? `to guild ${config.guildId}` : 'globally'}.`);
