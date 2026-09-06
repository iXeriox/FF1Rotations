import { SlashCommandBuilder } from 'discord.js';
import { guildOnly, requireAdmin } from './helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('reset')
    .setDescription('Reset rotation signup data.')
    .setDefaultMemberPermissions('32')
    .addBooleanOption((option) => option.setName('history').setDescription('Also forget previous teammate matches.')),
  async execute(interaction, { store, rotationUi }) {
    if (!guildOnly(interaction) || !requireAdmin(interaction)) return;
    await interaction.deferReply({ ephemeral: true });
    const history = interaction.options.getBoolean('history') ?? false;
    const current = store.get(interaction.guildId);
    await rotationUi.clearLeaderRoles(interaction.guild, current.leaders);
    await store.update(interaction.guildId, (state) => {
      state.players = [];
      state.playerQueuedAt = {};
      state.leaders = [];
      state.waitingOpen = false;
      state.lastGroups = [];
      state.commendationsBy = [];
      if (history) {
        state.pairCounts = {};
        state.rounds = 0;
      }
    });
    await Promise.all([rotationUi.refreshWaiting(interaction.guild), rotationUi.resetGroups(interaction.guild)]);
    await interaction.editReply(`Rotation cleared${history ? ', including matching history' : '; matching history was kept to avoid repeats'}.`);
  },
};
