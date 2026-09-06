import { SlashCommandBuilder } from 'discord.js';
import { guildOnly, requireAdmin } from './helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('reset')
    .setDescription('Reset rotation signup data.')
    .setDefaultMemberPermissions('32')
    .addBooleanOption((option) => option.setName('history').setDescription('Also forget previous teammate matches.')),
  async execute(interaction, { store }) {
    if (!guildOnly(interaction) || !requireAdmin(interaction)) return;
    const history = interaction.options.getBoolean('history') ?? false;
    await store.update(interaction.guildId, (state) => {
      state.players = [];
      state.leaders = [];
      if (history) {
        state.pairCounts = {};
        state.rounds = 0;
      }
    });
    await interaction.reply(`Rotation cleared${history ? ', including matching history' : '; matching history was kept to avoid repeats'}.`);
  },
};
