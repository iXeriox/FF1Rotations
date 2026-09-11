import { SlashCommandBuilder, escapeMarkdown } from 'discord.js';
import { guildOnly } from './helpers.js';
import { setCallOfDutyId } from '../services/player-ids.js';

export default {
  data: new SlashCommandBuilder().setName('id').setDescription('Add or update your Call of Duty ID.')
    .addStringOption((option) => option.setName('id').setDescription('Your Call of Duty ID, for example iXeriox#6447986.').setMaxLength(100).setRequired(true)),
  async execute(interaction, { store, playerIdAnnouncements }) {
    if (!guildOnly(interaction)) return;
    await interaction.deferReply({ ephemeral: true });
    const value = interaction.options.getString('id', true);
    const result = await store.update(interaction.guildId, (state) => (
      setCallOfDutyId(state, interaction.user.id, value)
    ));
    const announced = result.ok
      ? await playerIdAnnouncements.send(interaction.user, result.id)
      : false;
    await interaction.editReply({
      content: result.ok
        ? `Your Call of Duty ID is now **${escapeMarkdown(result.id)}**.${announced ? '' : ' It was saved, but the announcement channel is unavailable.'}`
        : result.message,
    });
  },
};
