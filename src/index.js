import { Client, Events, GatewayIntentBits } from 'discord.js';
import { commands } from './commands/index.js';
import { getConfig } from './config.js';
import { RotationStore } from './store/rotation-store.js';
import { createRotationUi, JOIN_BUTTON_ID } from './ui/rotation-space.js';
import { syncCommands } from './services/command-sync.js';
import { joinWaitingList } from './services/waiting-list.js';
import { sendBirthdayReminders } from './services/birthday-reminders.js';

const config = getConfig();
const store = new RotationStore(config.dataFile);
await store.load();
const rotationUi = createRotationUi(store);

const commandMap = new Map(commands.map((command) => [command.data.name, command]));
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Ready as ${readyClient.user.tag}.`);
  try {
    console.log(await syncCommands(readyClient, commands, config.guildId));
  } catch (error) {
    console.error('Could not register slash commands:', error);
  }
  for (const guild of readyClient.guilds.cache.values()) {
    await rotationUi.ensure(guild).catch((error) => console.error(`Could not set up ${guild.name}:`, error));
  }
  await sendBirthdayReminders(readyClient, store, config.birthdaysChannelId).catch(console.error);
  const birthdayTimer = setInterval(() => {
    void sendBirthdayReminders(readyClient, store, config.birthdaysChannelId).catch(console.error);
  }, 60 * 60 * 1000);
  birthdayTimer.unref();
});
client.on(Events.GuildCreate, (guild) => {
  void rotationUi.ensure(guild).catch((error) => console.error(`Could not set up ${guild.name}:`, error));
});
client.on(Events.InteractionCreate, (interaction) => {
  void handleInteraction(interaction).catch(async (error) => {
    console.error(error);
    const response = { content: 'Something went wrong while running that command.', ephemeral: true };
    if (interaction.deferred) await interaction.editReply(response).catch(console.error);
    else if (interaction.replied) await interaction.followUp(response).catch(console.error);
    else await interaction.reply(response).catch(console.error);
  });
});

async function handleInteraction(interaction) {
  if (interaction.isButton() && interaction.customId === JOIN_BUTTON_ID) {
    const state = store.get(interaction.guildId);
    if (!state.waitingOpen) {
      await interaction.reply({ content: 'The rotation waiting list is currently closed.', ephemeral: true });
      return;
    }
    const leaderRoleId = state.ui.leaderRoleId;
    if (leaderRoleId && interaction.member.roles.cache.has(leaderRoleId)) {
      await interaction.reply({ content: 'You are a Rotation Leader, so you are already included automatically.', ephemeral: true });
      return;
    }
    const result = await store.update(interaction.guildId, (latest) => joinWaitingList(latest, interaction.user.id));
    await interaction.reply({
      content: result.message,
      ephemeral: true,
    });
    if (result.ok) await rotationUi.refreshWaiting(interaction.guild);
    return;
  }
  if (!interaction.isChatInputCommand()) return;
  const command = commandMap.get(interaction.commandName);
  if (!command) return;
  await command.execute(interaction, { store, rotationUi });
}

await client.login(config.token);
