import { Client, Events, GatewayIntentBits } from 'discord.js';
import { commands } from './commands/index.js';
import { getConfig } from './config.js';
import { RotationStore } from './store/rotation-store.js';

const config = getConfig();
const store = new RotationStore(config.dataFile);
await store.load();

const commandMap = new Map(commands.map((command) => [command.data.name, command]));
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (readyClient) => console.log(`Ready as ${readyClient.user.tag}.`));
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const command = commandMap.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction, { store });
  } catch (error) {
    console.error(error);
    const response = { content: 'Something went wrong while running that command.', ephemeral: true };
    if (interaction.replied || interaction.deferred) await interaction.followUp(response);
    else await interaction.reply(response);
  }
});

await client.login(config.token);
