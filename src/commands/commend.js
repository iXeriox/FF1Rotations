import { SlashCommandBuilder } from 'discord.js';
import { guildOnly, mention } from './helpers.js';
import { commendTeammate } from '../services/rotation-stats.js';

export default {
  data: new SlashCommandBuilder().setName('commend').setDescription('Commend a teammate from the latest rotation.')
    .addUserOption((option) => option.setName('user').setDescription('The teammate to commend.').setRequired(true)),
  async execute(interaction, { store }) {
    if (!guildOnly(interaction)) return;
    const recipient = interaction.options.getUser('user', true);
    if (recipient.bot) return interaction.reply({ content: 'Bots cannot receive commendations.', ephemeral: true });

    const result = await store.update(interaction.guildId, (state) => (
      commendTeammate(state, interaction.user.id, recipient.id)
    ));
    await interaction.reply(result.ok
      ? `${mention(interaction.user.id)} commended ${mention(recipient.id)}! ⭐`
      : { content: result.message, ephemeral: true });
  },
};
