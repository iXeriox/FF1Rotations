import { SlashCommandBuilder } from 'discord.js';
import { createGroups, createPairHistory } from '../services/grouping.js';
import { recordRotation } from '../services/rotation-stats.js';
import { guildOnly, mention, requireAdmin } from './helpers.js';

const groupingQueues = new Map();

export default {
  data: new SlashCommandBuilder()
    .setName('group')
    .setDescription('Create balanced groups that minimise repeat teammates.')
    .setDefaultMemberPermissions('32'),
  async execute(interaction, { store, rotationUi, botStatus }) {
    if (!guildOnly(interaction) || !requireAdmin(interaction)) return;
    await interaction.deferReply({ ephemeral: true });
    await generateAndPublishGroups(interaction, { store, rotationUi, botStatus });
  },
};

export async function generateAndPublishGroups(interaction, { store, rotationUi, botStatus }) {
  const previous = groupingQueues.get(interaction.guildId) ?? Promise.resolve();
  const pending = previous.then(() => generateAndPublishGroupsNow(
    interaction,
    { store, rotationUi, botStatus },
  ));
  const queued = pending.catch(() => {});
  groupingQueues.set(interaction.guildId, queued);
  return pending.finally(() => {
    if (groupingQueues.get(interaction.guildId) === queued) groupingQueues.delete(interaction.guildId);
  });
}

async function generateAndPublishGroupsNow(interaction, { store, rotationUi, botStatus }) {
  const state = store.get(interaction.guildId);
  let groups;
  try {
    groups = createGroups(state.players, state.leaders, state.pairCounts);
  } catch (error) {
    await interaction.editReply(error.message);
    return false;
  }
  await rotationUi.clearLeaderRoles(interaction.guild, state.leaders);
  await store.update(interaction.guildId, (latest) => {
    latest.pairCounts = createPairHistory(groups);
    latest.players = [];
    latest.playerQueuedAt = {};
    latest.leaders = [];
    latest.waitingOpen = false;
    recordRotation(latest, groups);
  });
  await rotationUi.publishGroups(interaction.guild, groups);
  await rotationUi.refreshWaiting(interaction.guild);
  await botStatus.refresh();
  const output = groups.map((group, index) => `**Team ${index + 1}:** ${group.map(mention).join(', ')}`).join('\n');
  await interaction.editReply(`Groups published and the waiting list was reset.\n\n${output}`);
  return true;
}
