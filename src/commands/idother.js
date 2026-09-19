import { SlashCommandBuilder, escapeMarkdown } from 'discord.js';
import { guildOnly, mention, requireAdmin } from './helpers.js';
import { setCallOfDutyId } from '../services/player-ids.js';

export default {
  data: new SlashCommandBuilder().setName('idother').setDescription("Add or update another member's Activision ID.")
    .setDefaultMemberPermissions('32')
    .addUserOption((option) => option.setName('user').setDescription('The member whose Activision ID should be updated.').setRequired(true))
    .addStringOption((option) => option.setName('activisionid').setDescription('Their Activision ID, for example iXeriox#6447986.').setMaxLength(100).setRequired(true)),
  async execute(interaction, { store, playerIdAnnouncements }) {
    if (!guildOnly(interaction) || !requireAdmin(interaction)) return;
    await interaction.deferReply({ ephemeral: true });
    const user = interaction.options.getUser('user', true);
    if (user.bot) {
      await interaction.editReply('Bots cannot have an Activision ID.');
      return;
    }

    const value = interaction.options.getString('activisionid', true);
    const result = await store.update(interaction.guildId, (state) => (
      setCallOfDutyId(state, user.id, value)
    ));
    const announced = result.ok
      ? await playerIdAnnouncements.send(user, result.id)
      : false;
    await interaction.editReply({
      content: result.ok
        ? `${mention(user.id)}'s Activision ID is now **${escapeMarkdown(result.id)}**.${announced ? '' : ' It was saved, but the announcement channel is unavailable.'}`
        : result.message,
    });
  },
};
