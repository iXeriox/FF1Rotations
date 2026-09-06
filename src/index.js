import { Client, Events, GatewayIntentBits } from 'discord.js';
import { commands } from './commands/index.js';
import { getConfig } from './config.js';
import { RotationStore } from './store/rotation-store.js';
import { createRotationUi, JOIN_BUTTON_ID } from './ui/rotation-space.js';

const config = getConfig();
const store = new RotationStore(config.dataFile);
await store.load();
const rotationUi = createRotationUi(store);

const commandMap = new Map(commands.map((command) => [command.data.name, command]));
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Ready as ${readyClient.user.tag}.`);
  for (const guild of readyClient.guilds.cache.values()) {
    await rotationUi.ensure(guild).catch((error) => console.error(`Could not set up ${guild.name}:`, error));
  }
});
client.on(Events.GuildCreate, (guild) => {
  void rotationUi.ensure(guild).catch((error) => console.error(`Could not set up ${guild.name}:`, error));
});
client.on(Events.InteractionCreate, (interaction) => {
  void handleInteraction(interaction).catch(async (error) => {
    console.error(error);
    const response = { content: 'Something went wrong while running that command.', ephemeral: true };
    if (interaction.replied || interaction.deferred) await interaction.followUp(response).catch(console.error);
    else await interaction.reply(response).catch(console.error);
  });
});

async function handleInteraction(interaction) {
  if (interaction.isButton() && interaction.customId === JOIN_BUTTON_ID) {
    const state = store.get(interaction.guildId);
    const leaderRoleId = state.ui.leaderRoleId;
    if (leaderRoleId && interaction.member.roles.cache.has(leaderRoleId)) {
      await interaction.reply({ content: 'You are a Rotation Leader, so you are already included automatically.', ephemeral: true });
      return;
    }
    const added = await store.update(interaction.guildId, (latest) => {
      if (latest.players.includes(interaction.user.id)) return false;
      latest.players.push(interaction.user.id);
      return true;
    });
    await interaction.reply({
      content: added ? 'You joined the rotation waiting list!' : 'You are already in the rotation waiting list.',
      ephemeral: true,
    });
    if (added) await rotationUi.refreshWaiting(interaction.guild);
    return;
  }
  if (!interaction.isChatInputCommand()) return;
  const command = commandMap.get(interaction.commandName);
  if (!command) return;
  await command.execute(interaction, { store, rotationUi });
}

await client.login(config.token);
