import { SlashCommandBuilder } from 'discord.js';
import { createGroups, createPairHistory } from '../services/grouping.js';
import { guildOnly, mention, requireAdmin } from './helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('group')
    .setDescription('Create balanced groups that minimise repeat teammates.')
    .setDefaultMemberPermissions('32'),
  async execute(interaction, { store, rotationUi }) {
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
      latest.lastGroups = groups;
      latest.players = [];
      latest.leaders = [];
      latest.rounds += 1;
    });
    await rotationUi.publishGroups(interaction.guild, groups);
    await rotationUi.refreshWaiting(interaction.guild);
    const output = groups.map((group, index) => `**Team ${index + 1}:** ${group.map(mention).join(', ')}`).join('\n');
    await interaction.editReply(`Groups published and the waiting list was reset.\n\n${output}`);
  },
};
