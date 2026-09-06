import { SlashCommandBuilder } from 'discord.js';
import { createGroups, recordGroups } from '../services/grouping.js';
import { guildOnly, mention, requireAdmin } from './helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('group')
    .setDescription('Create balanced groups that minimise repeat teammates.')
    .setDefaultMemberPermissions('32')
    .addBooleanOption((option) => option.setName('clear_queue').setDescription('Remove players and leaders after grouping.')),
  async execute(interaction, { store }) {
    if (!guildOnly(interaction) || !requireAdmin(interaction)) return;
    let groups;
    try {
      await store.update(interaction.guildId, (state) => {
        groups = createGroups(state.players, state.leaders, state.pairCounts);
        recordGroups(groups, state.pairCounts);
        state.rounds += 1;
        if (interaction.options.getBoolean('clear_queue') ?? false) {
          state.players = [];
          state.leaders = [];
        }
      });
    } catch (error) {
      return interaction.reply({ content: error.message, ephemeral: true });
    }
    const output = groups.map((group, index) => `**Group ${index + 1}** — ${group.map(mention).join(', ')}`).join('\n');
    await interaction.reply(output);
  },
};
