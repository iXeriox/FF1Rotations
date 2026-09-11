import { Client, Events, GatewayIntentBits } from 'discord.js';
import { commands } from './commands/index.js';
import { getConfig } from './config.js';
import { RotationStore } from './store/rotation-store.js';
import { createRotationUi, JOIN_BUTTON_ID } from './ui/rotation-space.js';
import { syncCommands } from './services/command-sync.js';
import { joinWaitingList } from './services/waiting-list.js';
import { sendBirthdayReminders } from './services/birthday-reminders.js';
import { createBotStatus } from './services/bot-status.js';
import { checkTikTok, createTwitchProvider } from './services/stream-providers.js';
import { createStreamScanner } from './services/stream-scanner.js';
import { createConsoleLogger } from './services/console-logger.js';
import { announceCallOfDutyId } from './services/player-id-announcements.js';
import { acquireInstanceLock } from './services/instance-lock.js';
import { createInteractionGuard } from './services/interaction-guard.js';

const config = getConfig();
const releaseInstanceLock = await acquireInstanceLock(config.instanceLockFile);
const store = new RotationStore(config.dataFile);
await store.load();
const rotationUi = createRotationUi(store);

const commandMap = new Map(commands.map((command) => [command.data.name, command]));
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const botStatus = createBotStatus(client, store);
const streamScanner = createStreamScanner(client, store, {
  tiktok: checkTikTok,
  twitch: createTwitchProvider(config.twitchClientId, config.twitchClientSecret),
});
const logger = createConsoleLogger();
const playerIdAnnouncements = {
  send: (user, callOfDutyId) => announceCallOfDutyId(
    client,
    config.activisionIdsChannelId,
    user,
    callOfDutyId,
  ),
};
const interactionGuard = createInteractionGuard();

client.once(Events.ClientReady, async (readyClient) => {
  logger.system(`Ready as ${readyClient.user.tag}.`);
  try {
    logger.system(await syncCommands(readyClient, commands, config.guildId));
  } catch (error) {
    console.error('Could not register slash commands:', error);
  }
  for (const guild of readyClient.guilds.cache.values()) {
    await rotationUi.ensure(guild).catch((error) => console.error(`Could not set up ${guild.name}:`, error));
  }
  await sendBirthdayReminders(readyClient, store, config.birthdaysChannelId).catch(console.error);
  await botStatus.refresh();
  const hourlyTimer = setInterval(() => {
    void sendBirthdayReminders(readyClient, store, config.birthdaysChannelId).catch(console.error);
    void botStatus.refresh().catch(console.error);
  }, 60 * 60 * 1000);
  hourlyTimer.unref();
  await streamScanner.scan();
  const streamTimer = setInterval(() => void streamScanner.scan().catch(console.error), 2 * 60 * 1000);
  streamTimer.unref();
});
client.on(Events.GuildCreate, (guild) => {
  void rotationUi.ensure(guild).catch((error) => console.error(`Could not set up ${guild.name}:`, error));
  void syncCommands(client, commands, guild.id).catch((error) => console.error(`Could not register commands in ${guild.name}:`, error));
});
client.on(Events.InteractionCreate, (interaction) => {
  if (!interactionGuard.claim(interaction.id)) {
    logger.system(`Ignored duplicate interaction id=${interaction.id}.`);
    return;
  }
  void handleInteraction(interaction).catch(async (error) => {
    console.error(error);
    if (error.code === 40060 || error.code === 10062) return;
    const response = { content: 'Something went wrong while running that command.', ephemeral: true };
    if (interaction.deferred) await interaction.editReply(response).catch(console.error);
    else if (interaction.replied) await interaction.followUp(response).catch(console.error);
    else await interaction.reply(response).catch(console.error);
  });
});

async function shutdown(signal) {
  logger.system(`Received ${signal}; shutting down.`);
  client.destroy();
  await releaseInstanceLock();
  process.exit(0);
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));

async function handleInteraction(interaction) {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;
  const startedAt = performance.now();
  logger.interactionStarted(interaction);
  try {
    await dispatchInteraction(interaction);
    logger.interactionCompleted(interaction, performance.now() - startedAt);
  } catch (error) {
    logger.interactionFailed(interaction, performance.now() - startedAt, error);
    throw error;
  }
}

async function dispatchInteraction(interaction) {
  if (interaction.isButton() && interaction.customId === JOIN_BUTTON_ID) {
    await interaction.deferReply({ ephemeral: true });
    const state = store.get(interaction.guildId);
    if (!state.waitingOpen) {
      await interaction.editReply('The rotation waiting list is currently closed.');
      return;
    }
    const leaderRoleId = state.ui.leaderRoleId;
    if (leaderRoleId && interaction.member.roles.cache.has(leaderRoleId)) {
      await interaction.editReply('You are a Rotation Leader, so you are already included automatically.');
      return;
    }
    const result = await store.update(interaction.guildId, (latest) => joinWaitingList(latest, interaction.user.id));
    await interaction.editReply(result.message);
    if (result.ok) await rotationUi.refreshWaiting(interaction.guild);
    return;
  }
  if (!interaction.isChatInputCommand()) return;
  const command = commandMap.get(interaction.commandName);
  if (!command) return;
  await command.execute(interaction, {
    store, rotationUi, botStatus, streamScanner, playerIdAnnouncements,
  });
}

await client.login(config.token);
