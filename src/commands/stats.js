import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { guildOnly } from './helpers.js';
import { getUserStats } from '../services/rotation-stats.js';

export default {
  data: new SlashCommandBuilder().setName('stats').setDescription("Show a user's rotation statistics.")
    .addUserOption((option) => option.setName('user').setDescription('The user to view.').setRequired(true)),
  async execute(interaction, { store }) {
    if (!guildOnly(interaction)) return;
    const user = interaction.options.getUser('user', true);
    const stats = getUserStats(store.get(interaction.guildId), user.id);
    const lastRotation = stats.lastRotationAt ? `<t:${stats.lastRotationAt}:F> (<t:${stats.lastRotationAt}:R>)` : 'Never';
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setAuthor({ name: user.displayName, iconURL: user.displayAvatarURL() })
      .setTitle('Rotation statistics')
      .addFields(
        { name: 'Commendations', value: `⭐ ${stats.commendations}`, inline: true },
        { name: 'Rotations', value: `${stats.rotations}`, inline: true },
        { name: 'Last rotation', value: lastRotation },
      );
    await interaction.reply({ embeds: [embed] });
  },
};
