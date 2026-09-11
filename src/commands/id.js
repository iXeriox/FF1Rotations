import { SlashCommandBuilder, escapeMarkdown } from 'discord.js';
import { guildOnly } from './helpers.js';
import { setCallOfDutyId } from '../services/player-ids.js';

export default {
  data: new SlashCommandBuilder().setName('id').setDescription('Add or update your Call of Duty ID.')
    .addStringOption((option) => option.setName('id').setDescription('Your Call of Duty ID, for example iXeriox#6447986.').setMaxLength(100).setRequired(true)),
  async execute(interaction, { store }) {
    if (!guildOnly(interaction)) return;
    const value = interaction.options.getString('id', true);
    const result = await store.update(interaction.guildId, (state) => (
      setCallOfDutyId(state, interaction.user.id, value)
    ));
    await interaction.reply({
      content: result.ok
        ? `Your Call of Duty ID is now **${escapeMarkdown(result.id)}**.`
        : result.message,
      ephemeral: true,
    });
  },
};
