import { SlashCommandBuilder } from 'discord.js';
import { createGroups, createPairHistory } from '../services/grouping.js';
import { recordRotation } from '../services/rotation-stats.js';
import { guildOnly, mention, requireAdmin } from './helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('group')
    .setDescription('Create balanced groups that minimise repeat teammates.')
    .setDefaultMemberPermissions('32'),
  async execute(interaction, { store, rotationUi, botStatus }) {
    if (!guildOnly(interaction) || !requireAdmin(interaction)) return;
    await interaction.deferReply({ ephemeral: true });
    const state = store.get(interaction.guildId);
    let groups;
    try {
      groups = createGroups(state.players, state.leaders, state.pairCounts);
    } catch (error) {
      return interaction.editReply(error.message);
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
    // Render from the persisted latest rotation so /lobby can subsequently
    // update the same cards, even after the temporary leader roles are reset.
    await rotationUi.refreshGroups(interaction.guild);
    await rotationUi.refreshWaiting(interaction.guild);
    await botStatus.refresh();
    const output = groups.map((group, index) => `**Team ${index + 1}:** ${group.map(mention).join(', ')}`).join('\n');
    await interaction.editReply(`Groups published and the waiting list was reset.\n\n${output}`);
  },
};
