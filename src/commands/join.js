import { SlashCommandBuilder } from 'discord.js';
import { guildOnly, mention } from './helpers.js';
import { joinWaitingList } from '../services/waiting-list.js';

export default {
  data: new SlashCommandBuilder().setName('join').setDescription('Join the next rotation.'),
  async execute(interaction, { store, rotationUi }) {
    if (!guildOnly(interaction)) return;
    await interaction.deferReply({ ephemeral: true });
    const result = await store.update(interaction.guildId, (state) => joinWaitingList(state, interaction.user.id));
    if (result.ok) await rotationUi.refreshWaiting(interaction.guild);
    await interaction.editReply(result.ok
      ? `${mention(interaction.user.id)} joined the rotation.`
      : result.message);
  },
};
